import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chromium, Browser } from "playwright";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { acquireAuditLock, releaseAuditLock } from "@/lib/audit-lock";

const AUDIT_TIMEOUT_MS = 20000; // 20 seconds max per audit

const auditSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
});

type CTA = {
  text: string;
  href: string | null;
};

type Extracted = {
  title: string | null;
  metaDescription: string | null;
  h1: string | null;
  ctas: CTA[];
  allLinks: CTA[];
  pageText: string;
  navItemCount: number;
  hasViewportMeta: boolean;
  hasTelLinks: boolean;
  telLinkCount: number;
  hasAppointmentLink: boolean;
  hasPatientPortalLink: boolean;
  hasAddressInfo: boolean;
  hasHoursInfo: boolean;
  textContentLength: number;
};

// Detection helpers
function countTelLinks(links: CTA[]): number {
  return links.filter((link) => link.href?.startsWith("tel:")).length;
}

function hasPhoneOnPage(pageText: string): boolean {
  const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return phoneRegex.test(pageText);
}

function hasAppointmentLink(links: CTA[]): boolean {
  const keywords = ["book", "schedule", "appointment", "request appointment", "book online", "schedule now"];
  return links.some((link) => {
    const text = link.text.toLowerCase();
    const href = link.href?.toLowerCase() || "";
    return keywords.some((kw) => text.includes(kw) || href.includes(kw));
  });
}

function hasPatientPortalLink(links: CTA[]): boolean {
  const keywords = ["patient portal", "mychart", "patient login", "my health", "online portal"];
  return links.some((link) => {
    const text = link.text.toLowerCase();
    const href = link.href?.toLowerCase() || "";
    return keywords.some((kw) => text.includes(kw) || href.includes(kw));
  });
}

function hasAddressKeywords(pageText: string): boolean {
  const patterns = [
    /\d{1,5}\s+[a-z]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|parkway|pkwy)\b/i,
    /\bsuite\s+[a-z0-9]+/i,
    /\b\d{5}(-\d{4})?\b/, // ZIP code
  ];
  return patterns.some((p) => p.test(pageText));
}

function hasHoursKeywords(pageText: string): boolean {
  const patterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(mon|tue|wed|thu|fri|sat|sun)\s*[-–:]/i,
    /office hours/i,
    /hours of operation/i,
    /\d{1,2}(:\d{2})?\s*(am|pm)\s*[-–to]+\s*\d{1,2}(:\d{2})?\s*(am|pm)/i,
  ];
  return patterns.some((p) => p.test(pageText));
}

// Medical office specific checks
type MedicalChecks = {
  hasAppointmentCTA: boolean;
  appointmentCTAText: string | null;
  hasClickToCall: boolean;
  hasPhoneVisible: boolean;
  hasAddress: boolean;
  hasHours: boolean;
  hasInsuranceInfo: boolean;
  insuranceKeywordsFound: string[];
  hasNewPatientInfo: boolean;
  newPatientKeywordsFound: string[];
  hasPatientPortal: boolean;
  portalText: string | null;
};

function runMedicalChecks(extracted: Extracted): MedicalChecks {
  const pageTextLower = extracted.pageText.toLowerCase();
  const allLinks = extracted.allLinks;

  // 1. Appointment CTA - text keywords AND valid link
  const appointmentKeywords = ["book", "schedule", "appointment", "request appointment", "book online", "schedule now"];
  const appointmentLink = allLinks.find((link) => {
    const text = link.text.toLowerCase();
    const href = link.href?.toLowerCase() || "";
    const hasKeyword = appointmentKeywords.some((kw) => text.includes(kw) || href.includes(kw));
    const hasValidHref = link.href && link.href.length > 0 && !link.href.startsWith("#");
    return hasKeyword && hasValidHref;
  });

  // 2. Click-to-call (tel: link)
  const telLink = allLinks.find((link) => link.href?.startsWith("tel:"));
  const hasClickToCall = !!telLink;
  const hasPhoneVisible = hasPhoneOnPage(extracted.pageText);

  // 3. Address (street pattern OR keywords)
  const addressPatterns = [
    /\d{1,5}\s+[a-z]+\s+(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|parkway|pkwy)\b/i,
    /\bsuite\s+[a-z0-9]+/i,
    /\b\d{5}(-\d{4})?\b/, // ZIP code
  ];
  const hasAddress = addressPatterns.some((p) => p.test(pageTextLower));

  // 4. Hours (day names or "hours" keyword with time pattern)
  const hoursPatterns = [
    /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(mon|tue|wed|thu|fri|sat|sun)\s*[-–:]/i,
    /office hours/i,
    /hours of operation/i,
    /\d{1,2}(:\d{2})?\s*(am|pm)\s*[-–to]+\s*\d{1,2}(:\d{2})?\s*(am|pm)/i,
  ];
  const hasHours = hoursPatterns.some((p) => p.test(pageTextLower));

  // 5. Insurance keywords
  const insuranceKeywordList = ["insurance", "accepted insurance", "we accept", "medicare", "medicaid", "blue cross", "aetna", "cigna", "united healthcare", "humana"];
  const insuranceKeywordsFound = insuranceKeywordList.filter((kw) => pageTextLower.includes(kw));
  const hasInsuranceInfo = insuranceKeywordsFound.length > 0;

  // 6. New patient keywords
  const newPatientKeywordList = ["new patient", "new patients", "patient forms", "intake form", "registration form", "first visit", "become a patient"];
  const newPatientKeywordsFound = newPatientKeywordList.filter((kw) => pageTextLower.includes(kw));
  const hasNewPatientInfo = newPatientKeywordsFound.length > 0;

  // 7. Patient portal
  const portalKeywords = ["patient portal", "mychart", "patient login", "my health", "online portal"];
  const portalLink = allLinks.find((link) => {
    const text = link.text.toLowerCase();
    const href = link.href?.toLowerCase() || "";
    return portalKeywords.some((kw) => text.includes(kw) || href.includes(kw));
  });

  return {
    hasAppointmentCTA: !!appointmentLink,
    appointmentCTAText: appointmentLink?.text || null,
    hasClickToCall,
    hasPhoneVisible,
    hasAddress,
    hasHours,
    hasInsuranceInfo,
    insuranceKeywordsFound,
    hasNewPatientInfo,
    newPatientKeywordsFound,
    hasPatientPortal: !!portalLink,
    portalText: portalLink?.text || null,
  };
}

function generateFindings(extracted: Extracted): string[] {
  const checks = runMedicalChecks(extracted);
  const findings: string[] = [];

  // Priority 1: Appointment booking (critical for conversions)
  if (!checks.hasAppointmentCTA) {
    findings.push(
      "I couldn't find a clear \"Book Appointment\" or \"Schedule\" button on the homepage. Most patients today expect to book online — this is likely costing you appointments."
    );
  }

  // Priority 2: Click-to-call (critical for mobile)
  if (!checks.hasClickToCall) {
    if (checks.hasPhoneVisible) {
      findings.push(
        "The phone number is displayed, but it's not a tappable click-to-call link. On mobile, patients expect to tap and call instantly — this adds friction."
      );
    } else {
      findings.push(
        "No phone number is prominently visible on the homepage. For a medical office, this is a red flag — patients need an easy way to reach you."
      );
    }
  }

  // Priority 3: Address (local SEO + trust)
  if (!checks.hasAddress) {
    findings.push(
      "The office address isn't clearly displayed. This hurts your local SEO and makes it harder for new patients to confirm your location before booking."
    );
  }

  // Priority 4: Hours (reduces phone calls + sets expectations)
  if (!checks.hasHours) {
    findings.push(
      "I didn't see office hours listed on the homepage. Patients often check hours before calling — missing this info may drive them to a competitor."
    );
  }

  // Priority 5: Insurance info (major decision factor)
  if (!checks.hasInsuranceInfo) {
    findings.push(
      "No mention of accepted insurance plans. This is one of the first things patients check — adding a simple \"Insurance We Accept\" section could reduce bounce rate."
    );
  }

  // Priority 6: New patient info (conversion path)
  if (!checks.hasNewPatientInfo) {
    findings.push(
      "There's no clear \"New Patients\" section or intake forms. First-time visitors need to know how to get started — make the path obvious."
    );
  }

  // Priority 7: Patient portal (existing patient experience)
  if (!checks.hasPatientPortal) {
    if (findings.length < 5) {
      findings.push(
        "No patient portal link visible. If you have one, it should be easy to find. If you don't, consider adding one — patients expect digital access to records."
      );
    }
  }

  // Add mobile viewport only if we have room and it's missing
  if (!extracted.hasViewportMeta && findings.length < 5) {
    findings.push(
      "The site may not be mobile-optimized (missing viewport tag). Over 60% of healthcare searches are on mobile — this could hurt both rankings and user experience."
    );
  }

  // Cap at 6 findings for focused, actionable audit
  return findings.slice(0, 6);
}

function calculateScore(extracted: Extracted): { score: number; explanation: string; checks: MedicalChecks } {
  const checks = runMedicalChecks(extracted);
  let score = 10;
  const deductions: string[] = [];

  // Critical issues (-2 each) — these directly impact patient acquisition
  if (!checks.hasAppointmentCTA) {
    score -= 2;
    deductions.push("no booking CTA (-2)");
  }
  if (!checks.hasClickToCall && !checks.hasPhoneVisible) {
    score -= 2;
    deductions.push("no phone (-2)");
  } else if (!checks.hasClickToCall && checks.hasPhoneVisible) {
    score -= 1;
    deductions.push("phone not clickable (-1)");
  }

  // Major issues (-1 each) — important for trust and local SEO
  if (!checks.hasAddress) {
    score -= 1;
    deductions.push("no address (-1)");
  }
  if (!checks.hasHours) {
    score -= 1;
    deductions.push("no hours (-1)");
  }
  if (!checks.hasInsuranceInfo) {
    score -= 1;
    deductions.push("no insurance info (-1)");
  }

  // Moderate issues (-0.5 each) — helpful but not critical
  if (!checks.hasNewPatientInfo) {
    score -= 0.5;
    deductions.push("no new patient info (-0.5)");
  }
  if (!checks.hasPatientPortal) {
    score -= 0.5;
    deductions.push("no patient portal (-0.5)");
  }
  if (!extracted.hasViewportMeta) {
    score -= 0.5;
    deductions.push("not mobile-optimized (-0.5)");
  }

  // Clamp score
  score = Math.max(1, Math.min(10, Math.round(score)));

  const explanation = `Score: ${score}/10. ` +
    (deductions.length > 0 ? `Deductions: ${deductions.join(", ")}.` : "All medical office essentials present!");

  return { score, explanation, checks };
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  const startTime = Date.now();
  let leadId = "";
  let websiteUrl = "";
  let lockAcquired = false;

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

    // Acquire lock to prevent concurrent audits on same lead
    lockAcquired = acquireAuditLock(leadId);
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Audit already in progress for this lead", leadId },
        { status: 409 }
      );
    }

    // Fetch lead
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      return NextResponse.json(
        { error: "Lead not found" },
        { status: 404 }
      );
    }

    if (!lead.websiteUrl) {
      return NextResponse.json(
        { error: "Lead has no websiteUrl" },
        { status: 400 }
      );
    }

    websiteUrl = lead.websiteUrl;
    logger.auditStart(leadId, websiteUrl);

    // Launch browser with timeout constraints
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    context.setDefaultTimeout(15000); // 15s timeout for individual operations
    const page = await context.newPage();

    let extracted: Extracted;
    let auditError: string | null = null;

    try {
      // Navigate with timeout
      await page.goto(lead.websiteUrl, {
        timeout: AUDIT_TIMEOUT_MS - 2000, // Leave 2s buffer for extraction
        waitUntil: "domcontentloaded",
      });

      // Run extractions in parallel for speed
      const [
        title,
        metaDescription,
        hasViewportMeta,
        h1,
        allLinks,
        ctas,
        pageText,
        navItemCount,
      ] = await Promise.all([
        // Title
        page.title(),
        
        // Meta description
        page.$eval('meta[name="description"]', (el) => el.getAttribute("content")).catch(() => null),
        
        // Viewport meta
        page.$eval('meta[name="viewport"]', () => true).catch(() => false),
        
        // First H1
        page.$eval("h1", (el) => el.textContent?.trim() || null).catch(() => null),
        
        // All links (for analysis)
        page.$$eval("a", (elements) => {
          return elements.slice(0, 50).map((el) => ({
            text: el.textContent?.trim() || "",
            href: el.href || null,
          }));
        }),
        
        // Visible CTAs (buttons and prominent links)
        page.$$eval("a, button", (elements) => {
          const results: { text: string; href: string | null }[] = [];
          for (const el of elements) {
            if (results.length >= 10) break;
            const text = el.textContent?.trim() || "";
            if (text && text.length > 0 && text.length < 60) {
              const href = el.tagName === "A" ? (el as HTMLAnchorElement).href : null;
              results.push({ text, href });
            }
          }
          return results;
        }),
        
        // Page text
        page.$eval("body", (el) => el.textContent || ""),
        
        // Nav item count
        page.$$eval("nav a, nav button, header a, header button", (els) => els.length),
      ]);

      const telLinkCount = countTelLinks(allLinks);

      extracted = {
        title,
        metaDescription,
        h1,
        ctas,
        allLinks,
        pageText: pageText.slice(0, 8000),
        navItemCount,
        hasViewportMeta,
        hasTelLinks: telLinkCount > 0,
        telLinkCount,
        hasAppointmentLink: hasAppointmentLink(allLinks),
        hasPatientPortalLink: hasPatientPortalLink(allLinks),
        hasAddressInfo: hasAddressKeywords(pageText),
        hasHoursInfo: hasHoursKeywords(pageText),
        textContentLength: pageText.replace(/\s+/g, " ").trim().length,
      };
    } catch (pageError) {
      const errorMessage = pageError instanceof Error ? pageError.message : "Failed to load page";
      // Detect timeout errors specifically
      const isTimeout = errorMessage.toLowerCase().includes("timeout") ||
                        errorMessage.includes("Timeout") ||
                        errorMessage.includes("exceeded");
      auditError = isTimeout ? "timeout" : errorMessage;
      extracted = {
        title: null,
        metaDescription: null,
        h1: null,
        ctas: [],
        allLinks: [],
        pageText: "",
        navItemCount: 0,
        hasViewportMeta: false,
        hasTelLinks: false,
        telLinkCount: 0,
        hasAppointmentLink: false,
        hasPatientPortalLink: false,
        hasAddressInfo: false,
        hasHoursInfo: false,
        textContentLength: 0,
      };
    }

    // Generate findings and score
    const findings = auditError
      ? [`Website could not be loaded: ${auditError}. This prevents potential patients from accessing your practice information.`]
      : generateFindings(extracted);

    const { score, explanation, checks } = auditError
      ? { score: 1, explanation: "Score: 1/10. Website failed to load — critical issue.", checks: null }
      : calculateScore(extracted);

    const extractedJson = JSON.stringify({
      title: extracted.title,
      metaDescription: extracted.metaDescription,
      h1: extracted.h1,
      ctas: extracted.ctas.slice(0, 5),
      navItemCount: extracted.navItemCount,
      hasViewportMeta: extracted.hasViewportMeta,
      // Medical office checks
      hasAppointmentCTA: checks?.hasAppointmentCTA ?? false,
      appointmentCTAText: checks?.appointmentCTAText ?? null,
      hasClickToCall: checks?.hasClickToCall ?? false,
      hasPhoneVisible: checks?.hasPhoneVisible ?? false,
      hasAddress: checks?.hasAddress ?? false,
      hasHours: checks?.hasHours ?? false,
      hasInsuranceInfo: checks?.hasInsuranceInfo ?? false,
      insuranceKeywordsFound: checks?.insuranceKeywordsFound ?? [],
      hasNewPatientInfo: checks?.hasNewPatientInfo ?? false,
      newPatientKeywordsFound: checks?.newPatientKeywordsFound ?? [],
      hasPatientPortal: checks?.hasPatientPortal ?? false,
      portalText: checks?.portalText ?? null,
      textContentLength: extracted.textContentLength,
      scoreExplanation: explanation,
    });

    // Calculate confidence (1-5)
    // 5 = fully loaded with title, H1, and 3+ CTAs
    // 3 = partial extraction
    // 1 = minimal extraction or error
    let confidence = 1;
    if (auditError) {
      confidence = 1;
    } else {
      const hasTitle = !!extracted.title && extracted.title.length > 0;
      const hasH1 = !!extracted.h1 && extracted.h1.length > 0;
      const ctaCount = extracted.ctas.length;
      const hasEnoughContent = extracted.textContentLength > 200;

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
    }

    // Upsert audit
    const audit = await prisma.audit.upsert({
      where: { leadId },
      create: {
        leadId,
        score,
        confidence,
        findingsJson: JSON.stringify(findings),
        extractedJson,
        error: auditError,
      },
      update: {
        score,
        confidence,
        findingsJson: JSON.stringify(findings),
        extractedJson,
        error: auditError,
      },
    });

    // Update lead status to AUDITED
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "AUDITED" },
    });

    const durationMs = Date.now() - startTime;
    logger.auditComplete({
      leadId,
      websiteUrl,
      durationMs,
      success: !auditError,
      score: audit.score,
      error: auditError || undefined,
    });

    return NextResponse.json({
      score: audit.score,
      findings,
      extracted: JSON.parse(extractedJson),
      error: auditError,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    logger.auditComplete({
      leadId,
      websiteUrl,
      durationMs,
      success: false,
      error: errorMessage,
    });

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  } finally {
    // Always release lock
    if (lockAcquired && leadId) {
      releaseAuditLock(leadId);
    }
    // Always close browser
    if (browser) {
      await browser.close();
    }
  }
}
