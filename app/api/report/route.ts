import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

const reportSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  type: z.enum(["design", "seo", "full"]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = reportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { leadId, type } = validation.data;

    // Fetch lead with audits
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        designAudit: true,
        seoAudit: true,
        audit: true, // Legacy audit
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Validate that required audits exist
    if (type === "design" && !lead.designAudit && !lead.audit) {
      return NextResponse.json(
        { error: "Design audit not found. Run a design audit first." },
        { status: 400 }
      );
    }

    if (type === "seo" && !lead.seoAudit) {
      return NextResponse.json(
        { error: "SEO audit not found. Run an SEO audit first." },
        { status: 400 }
      );
    }

    if (type === "full" && (!lead.designAudit && !lead.audit) && !lead.seoAudit) {
      return NextResponse.json(
        { error: "No audits found. Run at least one audit first." },
        { status: 400 }
      );
    }

    // Build report data snapshot
    const reportData = {
      lead: {
        name: lead.name,
        websiteUrl: lead.websiteUrl,
        city: lead.city,
      },
      generatedAt: new Date().toISOString(),
      type,
      designAudit: lead.designAudit
        ? {
            score: lead.designAudit.score,
            findings: JSON.parse(lead.designAudit.findingsJson),
            createdAt: lead.designAudit.createdAt,
          }
        : lead.audit
        ? {
            // Use legacy audit if no new design audit
            score: lead.audit.score * 10, // Convert 1-10 to 1-100
            findings: JSON.parse(lead.audit.findingsJson).map((f: string) => ({
              category: "Design",
              issue: f,
              impact: "major",
              recommendation: "",
            })),
            createdAt: lead.audit.createdAt,
          }
        : null,
      seoAudit: lead.seoAudit
        ? {
            score: lead.seoAudit.score,
            findings: JSON.parse(lead.seoAudit.findingsJson),
            createdAt: lead.seoAudit.createdAt,
          }
        : null,
    };

    // Create report
    const report = await prisma.report.create({
      data: {
        leadId,
        type,
        dataJson: JSON.stringify(reportData),
      },
    });

    return NextResponse.json({
      id: report.id,
      publicId: report.publicId,
      type: report.type,
      url: `/report/${report.publicId}`,
    });
  } catch (error) {
    console.error("Report generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET endpoint to list reports for a lead
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get("leadId");

  if (!leadId) {
    return NextResponse.json({ error: "leadId is required" }, { status: 400 });
  }

  try {
    const reports = await prisma.report.findMany({
      where: { leadId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        publicId: true,
        type: true,
        createdAt: true,
        viewed: true,
        viewedAt: true,
      },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Error fetching reports:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

