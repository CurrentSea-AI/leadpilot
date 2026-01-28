import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { normalizeWebsiteUrl, normalizePhone } from "@/lib/normalize";

const createLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  websiteUrl: z.string().min(1, "Website URL is required"),
  city: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  source: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = createLeadSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;
    const normalizedUrl = normalizeWebsiteUrl(data.websiteUrl);
    const normalizedPhone = data.phone ? normalizePhone(data.phone) : null;

    // Check for duplicate by normalized websiteUrl
    // We need to check all leads and normalize their URLs for comparison
    const existingLeads = await prisma.lead.findMany({
      select: { id: true, websiteUrl: true, phone: true, name: true },
    });

    // Check for URL duplicate
    const urlDuplicate = existingLeads.find(
      (lead) => normalizeWebsiteUrl(lead.websiteUrl) === normalizedUrl
    );

    if (urlDuplicate) {
      return NextResponse.json(
        {
          error: "Duplicate lead detected",
          duplicateField: "websiteUrl",
          message: `A lead with this website already exists: "${urlDuplicate.name}"`,
          existingLeadId: urlDuplicate.id,
        },
        { status: 409 }
      );
    }

    // Check for phone duplicate (only if phone is provided and valid)
    if (normalizedPhone && normalizedPhone.length === 10) {
      const phoneDuplicate = existingLeads.find((lead) => {
        if (!lead.phone) return false;
        return normalizePhone(lead.phone) === normalizedPhone;
      });

      if (phoneDuplicate) {
        return NextResponse.json(
          {
            error: "Duplicate lead detected",
            duplicateField: "phone",
            message: `A lead with this phone number already exists: "${phoneDuplicate.name}"`,
            existingLeadId: phoneDuplicate.id,
          },
          { status: 409 }
        );
      }
    }

    const lead = await prisma.lead.create({
      data: {
        name: data.name,
        websiteUrl: normalizedUrl,
        city: data.city || null,
        phone: normalizedPhone || null,
        email: data.email || null,
        address: data.address || null,
        source: data.source || "manual",
      },
    });

    return NextResponse.json(lead, { status: 201 });
  } catch (error) {
    console.error("Error creating lead:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        audit: true,
        designAudit: true,
        seoAudit: true,
        outreachDraft: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(leads);
  } catch (error) {
    console.error("Error fetching leads:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
