import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { acquireAuditLock, releaseAuditLock } from "@/lib/audit-lock";
import { captureWebsite } from "@/lib/browser";

const auditSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
});

type SeoFinding = {
  category: string;
  issue: string;
  impact: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
};

function detectSeoIssues(pageContent: string, title: string, websiteUrl: string): SeoFinding[] {
  const findings: SeoFinding[] = [];
  const lowercaseContent = pageContent.toLowerCase();

  // Check title
  if (!title || title.length < 10) {
    findings.push({
      category: "Meta Tags",
      issue: "Missing or too short page title",
      impact: "critical",
      recommendation: "Add descriptive title tag (50-60 characters)",
    });
  } else if (title.length > 60) {
    findings.push({
      category: "Meta Tags",
      issue: "Page title too long (may be truncated in search results)",
      impact: "moderate",
      recommendation: "Shorten title to 50-60 characters",
    });
  }

  // Check for city/location in content
  const locationWords = ["city", "area", "serving", "located", "near"];
  if (!locationWords.some(w => lowercaseContent.includes(w))) {
    findings.push({
      category: "Local SEO",
      issue: "No location-specific content",
      impact: "major",
      recommendation: "Add content about your service area and location",
    });
  }

  // Check for structured data keywords
  if (!lowercaseContent.includes("schema") && !pageContent.includes("@type")) {
    findings.push({
      category: "Structured Data",
      issue: "No structured data detected",
      impact: "moderate",
      recommendation: "Add LocalBusiness or MedicalBusiness schema markup",
    });
  }

  // Check for https
  if (!websiteUrl.startsWith("https://")) {
    findings.push({
      category: "Security",
      issue: "Website not using HTTPS",
      impact: "major",
      recommendation: "Install SSL certificate and redirect to HTTPS",
    });
  }

  // Check word count
  const wordCount = pageContent.split(/\s+/).length;
  if (wordCount < 300) {
    findings.push({
      category: "Content",
      issue: "Thin content (low word count)",
      impact: "moderate",
      recommendation: "Add more detailed content about services and expertise",
    });
  }

  // Check for alt text references
  if (!lowercaseContent.includes("alt=") && lowercaseContent.includes("img")) {
    findings.push({
      category: "Accessibility",
      issue: "Images may be missing alt text",
      impact: "minor",
      recommendation: "Add descriptive alt text to all images",
    });
  }

  return findings;
}

function calculateSeoScore(findings: SeoFinding[]): number {
  let score = 100;
  
  for (const finding of findings) {
    switch (finding.impact) {
      case "critical": score -= 20; break;
      case "major": score -= 15; break;
      case "moderate": score -= 10; break;
      case "minor": score -= 5; break;
    }
  }
  
  return Math.max(0, Math.min(100, score));
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let leadId: string | null = null;

  try {
    const body = await request.json();
    const validation = auditSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    leadId = validation.data.leadId;

    const lockAcquired = acquireAuditLock(leadId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Audit already in progress for this lead" },
        { status: 409 }
      );
    }

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      select: { id: true, websiteUrl: true, name: true },
    });

    if (!lead) {
      releaseAuditLock(leadId);
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.websiteUrl) {
      releaseAuditLock(leadId);
      return NextResponse.json({ error: "Lead has no website URL" }, { status: 400 });
    }

    logger.auditStart(leadId, lead.websiteUrl);

    // Fetch website content
    const { pageContent, title } = await captureWebsite(lead.websiteUrl);

    // Analyze SEO
    const findings = detectSeoIssues(pageContent, title, lead.websiteUrl);
    const score = calculateSeoScore(findings);

    const extractedJson = JSON.stringify({
      title,
      titleLength: title.length,
      wordCount: pageContent.split(/\s+/).length,
      isHttps: lead.websiteUrl.startsWith("https://"),
      findingsCount: findings.length,
    });

    // Save SEO audit
    await prisma.seoAudit.upsert({
      where: { leadId },
      create: {
        leadId,
        score,
        findingsJson: JSON.stringify(findings),
        extractedJson,
      },
      update: {
        score,
        findingsJson: JSON.stringify(findings),
        extractedJson,
      },
    });

    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "AUDITED" },
    });

    const durationMs = Date.now() - startTime;
    logger.auditComplete({
      leadId,
      websiteUrl: lead.websiteUrl,
      durationMs,
      success: true,
      score,
    });

    releaseAuditLock(leadId);

    return NextResponse.json({
      success: true,
      leadId,
      score,
      findingsCount: findings.length,
      findings,
      durationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (leadId) {
      await prisma.seoAudit.upsert({
        where: { leadId },
        create: {
          leadId,
          score: 0,
          findingsJson: JSON.stringify([{ category: "Error", issue: errorMessage, impact: "critical", recommendation: "Fix website access" }]),
          extractedJson: JSON.stringify({ error: errorMessage }),
        },
        update: {
          score: 0,
          findingsJson: JSON.stringify([{ category: "Error", issue: errorMessage, impact: "critical", recommendation: "Fix website access" }]),
          extractedJson: JSON.stringify({ error: errorMessage }),
        },
      });

      logger.auditComplete({
        leadId,
        websiteUrl: "",
        durationMs: Date.now() - startTime,
        success: false,
        error: errorMessage,
      });

      releaseAuditLock(leadId);
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
