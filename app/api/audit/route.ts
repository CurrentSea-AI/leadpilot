import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { acquireAuditLock, releaseAuditLock } from "@/lib/audit-lock";
import { captureWebsite } from "@/lib/browser";

const auditSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
});

// Detection helpers
function hasPhoneOnPage(pageText: string): boolean {
  const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return phoneRegex.test(pageText);
}

function hasAppointmentKeywords(pageText: string): boolean {
  const keywords = ["book", "schedule", "appointment", "request appointment", "book online"];
  return keywords.some((kw) => pageText.toLowerCase().includes(kw));
}

function hasAddress(pageText: string): boolean {
  const patterns = [
    /\d{1,5}\s+[a-z]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln)\b/i,
    /\bsuite\s+[a-z0-9]+/i,
    /\b\d{5}(-\d{4})?\b/,
  ];
  return patterns.some((p) => p.test(pageText));
}

function hasHours(pageText: string): boolean {
  const patterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /office hours|hours of operation/i,
  ];
  return patterns.some((p) => p.test(pageText));
}

function hasInsurance(pageText: string): boolean {
  const keywords = ["insurance", "accepted insurance", "we accept", "medicare", "medicaid"];
  return keywords.some((kw) => pageText.toLowerCase().includes(kw));
}

function hasNewPatientInfo(pageText: string): boolean {
  const keywords = ["new patient", "new patients", "patient forms", "intake form"];
  return keywords.some((kw) => pageText.toLowerCase().includes(kw));
}

function hasPatientPortal(pageText: string): boolean {
  const keywords = ["patient portal", "mychart", "patient login"];
  return keywords.some((kw) => pageText.toLowerCase().includes(kw));
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

    // Check lock
    const lockAcquired = acquireAuditLock(leadId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Audit already in progress for this lead" },
        { status: 409 }
      );
    }

    // Get lead
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

    // Run checks
    const checks = {
      hasAppointmentKeywords: hasAppointmentKeywords(pageContent),
      hasPhoneVisible: hasPhoneOnPage(pageContent),
      hasAddress: hasAddress(pageContent),
      hasHours: hasHours(pageContent),
      hasInsurance: hasInsurance(pageContent),
      hasNewPatientInfo: hasNewPatientInfo(pageContent),
      hasPatientPortal: hasPatientPortal(pageContent),
    };

    // Generate findings
    const findings: string[] = [];

    if (!checks.hasAppointmentKeywords) {
      findings.push("No clear booking or appointment section — patients expect to schedule online.");
    }
    if (!checks.hasPhoneVisible) {
      findings.push("Phone number not easily found — patients can't easily contact the office.");
    }
    if (!checks.hasAddress) {
      findings.push("Office address not clearly displayed — hurts local SEO and trust.");
    }
    if (!checks.hasHours) {
      findings.push("Business hours not visible — patients can't check when you're open.");
    }
    if (!checks.hasInsurance) {
      findings.push("No insurance info — this is often the first thing patients look for.");
    }
    if (!checks.hasNewPatientInfo) {
      findings.push("No new patient section — first-time visitors need clear next steps.");
    }

    // Calculate score
    let score = 10;
    if (!checks.hasAppointmentKeywords) score -= 2;
    if (!checks.hasPhoneVisible) score -= 2;
    if (!checks.hasAddress) score -= 1;
    if (!checks.hasHours) score -= 1;
    if (!checks.hasInsurance) score -= 1;
    if (!checks.hasNewPatientInfo) score -= 0.5;
    if (!checks.hasPatientPortal) score -= 0.5;

    score = Math.max(1, Math.min(10, Math.round(score)));

    const extractedJson = JSON.stringify({
      title,
      ...checks,
      textContentLength: pageContent.length,
    });

    const confidence = pageContent.length > 500 ? 4 : 2;

    // Save audit
    await prisma.audit.upsert({
      where: { leadId },
      create: {
        leadId,
        score,
        confidence,
        findingsJson: JSON.stringify(findings.slice(0, 6)),
        extractedJson,
        error: null,
      },
      update: {
        score,
        confidence,
        findingsJson: JSON.stringify(findings.slice(0, 6)),
        extractedJson,
        error: null,
      },
    });

    // Update lead status
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
      confidence,
      findingsCount: findings.length,
      findings,
      durationMs,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    if (leadId) {
      // Save failed audit
      await prisma.audit.upsert({
        where: { leadId },
        create: {
          leadId,
          score: 1,
          confidence: 1,
          findingsJson: JSON.stringify([`Website could not be loaded: ${errorMessage}`]),
          extractedJson: JSON.stringify({}),
          error: errorMessage,
        },
        update: {
          score: 1,
          confidence: 1,
          findingsJson: JSON.stringify([`Website could not be loaded: ${errorMessage}`]),
          extractedJson: JSON.stringify({}),
          error: errorMessage,
        },
      });

      await prisma.lead.update({
        where: { id: leadId },
        data: { status: "AUDITED" },
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
