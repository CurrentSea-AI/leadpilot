import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import Papa from "papaparse";
import prisma from "@/lib/prisma";
import { normalizeWebsiteUrl, normalizePhone } from "@/lib/normalize";

const rowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  websiteUrl: z.string().min(1, "Website URL is required"),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")).or(z.undefined()),
  address: z.string().optional(),
});

type CsvRow = {
  name?: string;
  websiteUrl?: string;
  city?: string;
  phone?: string;
  email?: string;
  address?: string;
};

type SkipReason = {
  row: number;
  reason: "duplicate_url" | "duplicate_phone" | "duplicate_in_csv";
  field: string;
  value: string;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    if (!file.name.endsWith(".csv")) {
      return NextResponse.json(
        { error: "File must be a CSV" },
        { status: 400 }
      );
    }

    const csvText = await file.text();

    const parseResult = Papa.parse<CsvRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim().toLowerCase(),
    });

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        {
          error: "CSV parsing errors",
          details: parseResult.errors.map((e) => e.message),
        },
        { status: 400 }
      );
    }

    const rows = parseResult.data;

    // Get existing leads for duplicate checking
    const existingLeads = await prisma.lead.findMany({
      select: { websiteUrl: true, phone: true },
    });

    // Build normalized sets for existing data
    const existingUrls = new Set(
      existingLeads.map((l) => normalizeWebsiteUrl(l.websiteUrl))
    );
    const existingPhones = new Set(
      existingLeads
        .filter((l) => l.phone && normalizePhone(l.phone).length === 10)
        .map((l) => normalizePhone(l.phone!))
    );

    const errors: { row: number; message: string }[] = [];
    const skipped: SkipReason[] = [];
    const toInsert: {
      name: string;
      websiteUrl: string;
      city: string | null;
      phone: string | null;
      email: string | null;
      address: string | null;
      source: string;
    }[] = [];

    // Track seen values within this CSV
    const seenUrls = new Set<string>();
    const seenPhones = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // Account for header row and 0-index

      // Map headers (handle case variations)
      const mappedRow = {
        name: row.name?.trim() || "",
        websiteUrl:
          row.websiteUrl?.trim() ||
          (row as Record<string, string>)["websiteurl"]?.trim() ||
          "",
        city: row.city?.trim() || undefined,
        phone: row.phone?.trim() || undefined,
        email: row.email?.trim() || undefined,
        address: row.address?.trim() || undefined,
      };

      const validation = rowSchema.safeParse(mappedRow);
      if (!validation.success) {
        errors.push({
          row: rowNumber,
          message: validation.error.issues.map((e) => e.message).join(", "),
        });
        continue;
      }

      const normalizedUrl = normalizeWebsiteUrl(validation.data.websiteUrl);
      const normalizedPhone = validation.data.phone
        ? normalizePhone(validation.data.phone)
        : null;

      // Check for URL duplicates in existing DB
      if (existingUrls.has(normalizedUrl)) {
        skipped.push({
          row: rowNumber,
          reason: "duplicate_url",
          field: "websiteUrl",
          value: normalizedUrl,
        });
        continue;
      }

      // Check for URL duplicates within this CSV
      if (seenUrls.has(normalizedUrl)) {
        skipped.push({
          row: rowNumber,
          reason: "duplicate_in_csv",
          field: "websiteUrl",
          value: normalizedUrl,
        });
        continue;
      }

      // Check for phone duplicates (only valid 10-digit phones)
      if (normalizedPhone && normalizedPhone.length === 10) {
        if (existingPhones.has(normalizedPhone)) {
          skipped.push({
            row: rowNumber,
            reason: "duplicate_phone",
            field: "phone",
            value: validation.data.phone || "",
          });
          continue;
        }

        if (seenPhones.has(normalizedPhone)) {
          skipped.push({
            row: rowNumber,
            reason: "duplicate_in_csv",
            field: "phone",
            value: validation.data.phone || "",
          });
          continue;
        }

        seenPhones.add(normalizedPhone);
      }

      seenUrls.add(normalizedUrl);

      toInsert.push({
        name: validation.data.name,
        websiteUrl: normalizedUrl,
        city: validation.data.city || null,
        phone: normalizedPhone || null,
        email: validation.data.email || null,
        address: validation.data.address || null,
        source: "csv_import",
      });
    }

    // Batch insert
    let insertedCount = 0;
    if (toInsert.length > 0) {
      const result = await prisma.lead.createMany({
        data: toInsert,
        skipDuplicates: true,
      });
      insertedCount = result.count;
    }

    // Summarize skip reasons
    const skippedByUrl = skipped.filter(
      (s) => s.reason === "duplicate_url" || (s.reason === "duplicate_in_csv" && s.field === "websiteUrl")
    ).length;
    const skippedByPhone = skipped.filter(
      (s) => s.reason === "duplicate_phone" || (s.reason === "duplicate_in_csv" && s.field === "phone")
    ).length;

    return NextResponse.json({
      insertedCount,
      skippedCount: skipped.length,
      skippedByUrl,
      skippedByPhone,
      errors,
      skipped: skipped.slice(0, 20), // Return first 20 skip details
    });
  } catch (error) {
    console.error("Error importing leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
