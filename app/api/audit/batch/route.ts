import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chromium, Browser } from "playwright";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { acquireAuditLock, releaseAuditLock } from "@/lib/audit-lock";

const AUDIT_TIMEOUT_MS = 20000; // 20 seconds max per audit

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

type CTA = {
  text: string;
  href: string | null;
};

// Medical office detection helpers
function hasPhoneOnPage(pageText: string): boolean {
  const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return phoneRegex.test(pageText);
}

function hasAppointmentCTA(links: CTA[]): boolean {
  const keywords = ["book", "schedule", "appointment", "request appointment", "book online"];
  return links.some((link) => {
    const text = link.text.toLowerCase();
    const href = link.href?.toLowerCase() || "";
    const hasKeyword = keywords.some((kw) => text.includes(kw) || href.includes(kw));
    const hasValidHref = link.href && !link.href.startsWith("#");
    return hasKeyword && hasValidHref;
  });
}

function hasClickToCall(links: CTA[]): boolean {
  return links.some((link) => link.href?.startsWith("tel:"));
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

function hasPatientPortal(links: CTA[]): boolean {
  const keywords = ["patient portal", "mychart", "patient login", "my health"];
  return links.some((link) => {
    const text = link.text.toLowerCase();
    const href = link.href?.toLowerCase() || "";
    return keywords.some((kw) => text.includes(kw) || href.includes(kw));
  });
}

async function auditSingleLead(
  browser: Browser,
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

  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  context.setDefaultTimeout(AUDIT_TIMEOUT_MS - 5000); // Buffer for processing
  const page = await context.newPage();

  try {
    await page.goto(lead.websiteUrl, {
      timeout: AUDIT_TIMEOUT_MS - 2000, // Leave 2s buffer
      waitUntil: "domcontentloaded",
    });

    // Parallel extraction
    const [
      title,
      metaDescription,
      hasViewportMeta,
      h1,
      allLinks,
      pageText,
      navItemCount,
    ] = await Promise.all([
      page.title(),
      page.$eval('meta[name="description"]', (el) => el.getAttribute("content")).catch(() => null),
      page.$eval('meta[name="viewport"]', () => true).catch(() => false),
      page.$eval("h1", (el) => el.textContent?.trim() || null).catch(() => null),
      page.$$eval("a", (elements) =>
        elements.slice(0, 50).map((el) => ({
          text: el.textContent?.trim() || "",
          href: el.href || null,
        }))
      ),
      page.$eval("body", (el) => el.textContent || ""),
      page.$$eval("nav a, nav button, header a, header button", (els) => els.length),
    ]);

    const textContentLength = pageText.replace(/\s+/g, " ").trim().length;

    // Run medical office checks
    const checks = {
      hasAppointmentCTA: hasAppointmentCTA(allLinks),
      hasClickToCall: hasClickToCall(allLinks),
      hasPhoneVisible: hasPhoneOnPage(pageText),
      hasAddress: hasAddress(pageText),
      hasHours: hasHours(pageText),
      hasInsurance: hasInsurance(pageText),
      hasNewPatientInfo: hasNewPatientInfo(pageText),
      hasPatientPortal: hasPatientPortal(allLinks),
      hasViewportMeta,
    };

    // Generate human-like findings (max 6)
    const findings: string[] = [];

    if (!checks.hasAppointmentCTA) {
      findings.push("No clear booking or appointment button — patients expect to schedule online.");
    }
    if (!checks.hasClickToCall) {
      if (checks.hasPhoneVisible) {
        findings.push("Phone number visible but not tappable — mobile users can't click to call.");
      } else {
        findings.push("No phone number visible — patients can't easily contact the office.");
      }
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
    if (!checks.hasAppointmentCTA) score -= 2;
    if (!checks.hasClickToCall && !checks.hasPhoneVisible) score -= 2;
    else if (!checks.hasClickToCall) score -= 1;
    if (!checks.hasAddress) score -= 1;
    if (!checks.hasHours) score -= 1;
    if (!checks.hasInsurance) score -= 1;
    if (!checks.hasNewPatientInfo) score -= 0.5;
    if (!checks.hasPatientPortal) score -= 0.5;
    if (!checks.hasViewportMeta) score -= 0.5;

    score = Math.max(1, Math.min(10, Math.round(score)));

    const extractedJson = JSON.stringify({
      title,
      metaDescription,
      h1,
      navItemCount,
      ...checks,
      textContentLength,
    });

    // Calculate confidence (1-5)
    let confidence = 1;
    const hasTitle = !!title && title.length > 0;
    const hasH1 = !!h1 && h1.length > 0;
    const ctaCount = allLinks.filter((l) => l.text.length > 0).length;
    const hasEnoughContent = textContentLength > 200;

    if (hasTitle && hasH1 && ctaCount >= 3 && hasEnoughContent) {
      confidence = 5;
    } else if (hasTitle && (hasH1 || ctaCount >= 2)) {
      confidence = 4;
    } else if (hasTitle || hasH1 || ctaCount >= 1) {
      confidence = 3;
    } else if (hasEnoughContent) {
      confidence = 2;
    } else {
      confidence = 1;
    }

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
    // Detect timeout errors specifically
    const isTimeout = rawError.toLowerCase().includes("timeout") ||
                      rawError.includes("Timeout") ||
                      rawError.includes("exceeded");
    const errorMessage = isTimeout ? "timeout" : rawError;

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
    // Always release lock and close context
    releaseAuditLock(lead.id);
    await context.close();
  }
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;

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

    // Fetch leads
    const leads = await prisma.lead.findMany({
      where: {
        id: { in: leadIds },
        websiteUrl: { not: null },
      },
      select: { id: true, websiteUrl: true },
    });

    if (leads.length === 0) {
      return NextResponse.json(
        { error: "No valid leads found" },
        { status: 404 }
      );
    }

    const batchStartTime = Date.now();

    // Launch browser once for all audits
    browser = await chromium.launch({ headless: true });

    const results: AuditResult[] = [];

    // Process sequentially to avoid overwhelming resources
    for (const lead of leads) {
      if (!lead.websiteUrl) continue;

      const leadStartTime = Date.now();
      logger.auditStart(lead.id, lead.websiteUrl);

      const result = await auditSingleLead(browser, {
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
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

