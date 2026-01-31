import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { acquireAuditLock, releaseAuditLock } from "@/lib/audit-lock";
import { captureWebsite } from "@/lib/browser";

const auditSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
});

type DesignFinding = {
  category: string;
  issue: string;
  impact: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
};

// Detection helpers
function detectDesignIssues(pageContent: string, title: string): DesignFinding[] {
  const findings: DesignFinding[] = [];
  const lowercaseContent = pageContent.toLowerCase();

  // Check for appointment booking
  if (!lowercaseContent.includes("book") && !lowercaseContent.includes("schedule") && !lowercaseContent.includes("appointment")) {
    findings.push({
      category: "User Experience",
      issue: "No clear appointment booking functionality",
      impact: "critical",
      recommendation: "Add a prominent 'Book Appointment' button above the fold",
    });
  }

  // Check for phone number
  const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  if (!phoneRegex.test(pageContent)) {
    findings.push({
      category: "Contact Information",
      issue: "No visible phone number",
      impact: "major",
      recommendation: "Display phone number prominently in header and footer",
    });
  }

  // Check for address
  if (!lowercaseContent.includes("street") && !lowercaseContent.includes("ave") && !lowercaseContent.includes("suite")) {
    findings.push({
      category: "Local SEO",
      issue: "Physical address not visible",
      impact: "major",
      recommendation: "Add complete address with map integration",
    });
  }

  // Check for hours
  if (!lowercaseContent.includes("monday") && !lowercaseContent.includes("hours") && !lowercaseContent.includes("open")) {
    findings.push({
      category: "User Experience",
      issue: "Business hours not displayed",
      impact: "moderate",
      recommendation: "Add office hours section visible on homepage",
    });
  }

  // Check for services
  if (!lowercaseContent.includes("service") && !lowercaseContent.includes("treatment")) {
    findings.push({
      category: "Content",
      issue: "Services not clearly listed",
      impact: "moderate",
      recommendation: "Create dedicated services section with clear descriptions",
    });
  }

  // Check for testimonials
  if (!lowercaseContent.includes("testimonial") && !lowercaseContent.includes("review") && !lowercaseContent.includes("patient says")) {
    findings.push({
      category: "Trust Building",
      issue: "No patient testimonials visible",
      impact: "minor",
      recommendation: "Add testimonials or reviews section to build trust",
    });
  }

  return findings;
}

function calculateDesignScore(findings: DesignFinding[]): number {
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

    // Analyze design
    const findings = detectDesignIssues(pageContent, title);
    const score = calculateDesignScore(findings);

    const extractedJson = JSON.stringify({
      title,
      textContentLength: pageContent.length,
      findingsCount: findings.length,
    });

    // Save design audit
    await prisma.designAudit.upsert({
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
      await prisma.designAudit.upsert({
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
