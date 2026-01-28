import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Escape quotes and wrap in quotes if contains comma, quote, or newline
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        audit: true,
        outreachDraft: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // CSV header
    const headers = [
      "name",
      "websiteUrl",
      "city",
      "phone",
      "email",
      "address",
      "status",
      "score",
      "email1",
    ];

    // Build CSV rows
    const rows = leads.map((lead) => [
      escapeCSV(lead.name),
      escapeCSV(lead.websiteUrl),
      escapeCSV(lead.city),
      escapeCSV(lead.phone),
      escapeCSV(lead.email),
      escapeCSV(lead.address),
      escapeCSV(lead.status),
      lead.audit ? String(lead.audit.score) : "",
      escapeCSV(lead.outreachDraft?.email1),
    ]);

    // Combine header and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    // Generate filename with date
    const date = new Date().toISOString().split("T")[0];
    const filename = `leads-export-${date}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

