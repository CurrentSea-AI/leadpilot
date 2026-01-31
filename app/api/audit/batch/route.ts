// Batch audit processing route - simplified for Vercel compatibility
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { acquireAuditLock, releaseAuditLock } from "@/lib/audit-lock";
import { captureWebsite } from "@/lib/browser";

const batchAuditSchema = z.object({
  leadIds: z.array(z.string()).min(1).max(10),
});

type AuditResult = {
  leadId: string;
  success: boolean;
  score?: number;
  findingsCount?: number;
  error?: string;
};

// Medical office detection helpers
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
    /\d{1,5}\s+[a-z]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|parkway|pkwy)\b/i,
    /\bsuite\s+[a-z0-9]+/i,
    /\b\d{5}(-\d{4})?\b/,
  ];
  return patterns.some((p) => p.test(pageText.toLowerCase()));
}

function hasHours(pageText: string): boolean {
  const patterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(mon|tue|wed|thu|fri|sat|sun)\s*[-–:]/i,
    /office hours|hours of operation/i,
    /\d{1,2}(:\d{2})?\s*(am|pm)\s*[-–to]+\s*\d{1,2}(:\d{2})?\s*(am|pm)/i,
  ];
  return patterns.some((p) => p.test(pageText.toLowerCase()));
}

function hasInsurance(pageText: string): boolean {
  const keywords = ["insurance", "accepted insurance", "we accept", "medicare", "medicaid", "blue cross"];
  return keywords.some((kw) => pageText.toLowerCase().includes(kw));
}

function hasNewPatientInfo(pageText: string): boolean {
  const keywords = ["new patient", "new patients", "patient forms", "intake form", "first visit"];
  return keywords.some((kw) => pageText.toLowerCase().includes(kw));
}

function hasPatientPortal(pageText: string): boolean {
  const keywords = ["patient portal", "mychart", "patient login", "my health"];
  return keywords.some((kw) => pageText.toLowerCase().includes(kw));
}

async function auditSingleLead(
  lead: { id: string; websiteUrl: string }
): Promise<AuditResult> {
  // Check if audit is already in progress for this lead
  const lockAcquired = acquireAuditLock(lead.id);
  if (!lockAcquired) {
    return {
      leadId: lead.id,
      success: false,
      error: "Audit already in progress",
    };
  }

  try {
    // Fetch website content using simple fetch
    const { pageContent, title } = await captureWebsite(lead.websiteUrl);

    // Run medical office checks
    const checks = {
      hasAppointmentKeywords: hasAppointmentKeywords(pageContent),
      hasPhoneVisible: hasPhoneOnPage(pageContent),
      hasAddress: hasAddress(pageContent),
      hasHours: hasHours(pageContent),
      hasInsurance: hasInsurance(pageContent),
      hasNewPatientInfo: hasNewPatientInfo(pageContent),
      hasPatientPortal: hasPatientPortal(pageContent),
    };

    // Generate human-like findings (max 6)
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
    if (!checks.hasNewPatientInfo && findings.length < 6) {
      findings.push("No new patient section — first-time visitors need clear next steps.");
    }

    // Calculate score based on medical office essentials
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

    // Calculate confidence (1-5)
    const hasEnoughContent = pageContent.length > 200;
    const confidence = hasEnoughContent ? 4 : 2;

    // Upsert audit
    await prisma.audit.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
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
      where: { id: lead.id },
      data: { status: "AUDITED" },
    });

    return {
      leadId: lead.id,
      success: true,
      score,
      findingsCount: Math.min(findings.length, 8),
    };
  } catch (error) {
    const rawError = error instanceof Error ? error.message : "Unknown error";
    const errorMessage = rawError.includes("timeout") ? "timeout" : rawError;

    // Save failed audit with confidence 1
    await prisma.audit.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
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
      where: { id: lead.id },
      data: { status: "AUDITED" },
    });

    return {
      leadId: lead.id,
      success: false,
      score: 1,
      error: errorMessage,
    };
  } finally {
    releaseAuditLock(lead.id);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const validation = batchAuditSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { leadIds } = validation.data;

    // Fetch leads and filter out those without websites
    const leadsRaw = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
      },
      select: { id: true, websiteUrl: true },
    });
    const leads = leadsRaw.filter((l): l is { id: string; websiteUrl: string } => l.websiteUrl !== null);

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No valid leads found" },
        { status: 404 }
      );
    }

    const batchStartTime = Date.now();

    const results: AuditResult[] = [];

    // Process sequentially to avoid overwhelming resources
    for (const lead of leads) {
      if (!lead.websiteUrl) continue;

      const leadStartTime = Date.now();
      logger.auditStart(lead.id, lead.websiteUrl);

      const result = await auditSingleLead({
        id: lead.id,
        websiteUrl: lead.websiteUrl,
      });

      logger.auditComplete({
        leadId: lead.id,
        websiteUrl: lead.websiteUrl,
        durationMs: Date.now() - leadStartTime,
        success: result.success,
        score: result.score,
        error: result.error,
      });

      results.push(result);
    }

    const successCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;
    const totalDurationMs = Date.now() - batchStartTime;

    logger.batchAuditSummary(results.length, successCount, failedCount, totalDurationMs);

    return NextResponse.json({
      processed: results.length,
      succeeded: successCount,
      failed: failedCount,
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logger.error("Batch audit failed", { error: errorMessage });
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
