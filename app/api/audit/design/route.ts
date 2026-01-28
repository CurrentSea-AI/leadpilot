import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chromium, Browser } from "playwright";
import prisma from "@/lib/prisma";
import logger from "@/lib/logger";
import { acquireAuditLock, releaseAuditLock } from "@/lib/audit-lock";

const AUDIT_TIMEOUT_MS = 20000;

const auditSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
});

type CTA = {
  text: string;
  href: string | null;
};

type DesignFinding = {
  category: string;
  issue: string;
  impact: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
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
  imageCount: number;
  hasHeroSection: boolean;
  hasSocialLinks: boolean;
  hasTestimonials: boolean;
  hasForms: boolean;
  colorContrast: string;
  fontCount: number;
};

// Detection helpers
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
    /\b\d{5}(-\d{4})?\b/,
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

function hasPhoneOnPage(pageText: string): boolean {
  const phoneRegex = /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/;
  return phoneRegex.test(pageText);
}

function generateDesignFindings(extracted: Extracted): DesignFinding[] {
  const findings: DesignFinding[] = [];
  const pageTextLower = extracted.pageText.toLowerCase();

  // CRITICAL: Primary conversion elements
  if (!extracted.hasAppointmentLink) {
    findings.push({
      category: "Conversion",
      issue: "No clear appointment booking button",
      impact: "critical",
      recommendation: "Add a prominent 'Book Appointment' or 'Schedule Now' button in the header and hero section. Make it stand out with a contrasting color.",
    });
  }

  if (!extracted.hasTelLinks && !hasPhoneOnPage(extracted.pageText)) {
    findings.push({
      category: "Conversion",
      issue: "Phone number not visible or not clickable",
      impact: "critical",
      recommendation: "Display the phone number prominently in the header and make it a tap-to-call link for mobile users.",
    });
  } else if (!extracted.hasTelLinks && hasPhoneOnPage(extracted.pageText)) {
    findings.push({
      category: "Mobile Experience",
      issue: "Phone number is displayed but not clickable",
      impact: "major",
      recommendation: "Convert the phone number to a 'tel:' link so mobile users can tap to call directly.",
    });
  }

  // MAJOR: Trust & credibility
  if (!extracted.hasAddressInfo) {
    findings.push({
      category: "Trust & Credibility",
      issue: "Office address not prominently displayed",
      impact: "major",
      recommendation: "Add the full address in the footer and consider an embedded Google Map for easy navigation.",
    });
  }

  if (!extracted.hasHoursInfo) {
    findings.push({
      category: "Trust & Credibility",
      issue: "Office hours not listed",
      impact: "major",
      recommendation: "Display office hours clearly on the homepage and contact page. Patients need to know when they can reach you.",
    });
  }

  // Insurance info
  const hasInsurance = ["insurance", "we accept", "medicare", "medicaid", "blue cross", "aetna", "cigna", "united healthcare"].some(kw => pageTextLower.includes(kw));
  if (!hasInsurance) {
    findings.push({
      category: "Patient Information",
      issue: "No insurance information visible",
      impact: "major",
      recommendation: "Add an 'Insurance We Accept' section. This is one of the first things new patients look for.",
    });
  }

  // New patient info
  const hasNewPatient = ["new patient", "new patients", "first visit", "become a patient"].some(kw => pageTextLower.includes(kw));
  if (!hasNewPatient) {
    findings.push({
      category: "Patient Information",
      issue: "No clear path for new patients",
      impact: "major",
      recommendation: "Create a 'New Patients' section explaining how to get started, what to bring, and what to expect.",
    });
  }

  // MODERATE: User experience
  if (!extracted.hasViewportMeta) {
    findings.push({
      category: "Mobile Experience",
      issue: "Website may not be mobile-optimized",
      impact: "moderate",
      recommendation: "Ensure the site is fully responsive. Over 60% of healthcare searches happen on mobile devices.",
    });
  }

  if (!extracted.hasHeroSection) {
    findings.push({
      category: "Visual Design",
      issue: "No clear hero section with value proposition",
      impact: "moderate",
      recommendation: "Add a hero section with a clear headline, brief description, and prominent call-to-action button.",
    });
  }

  if (!extracted.hasTestimonials) {
    findings.push({
      category: "Trust & Credibility",
      issue: "No patient testimonials or reviews",
      impact: "moderate",
      recommendation: "Add a testimonials section with patient reviews. Social proof significantly increases conversion rates.",
    });
  }

  if (!extracted.hasForms) {
    findings.push({
      category: "Conversion",
      issue: "No contact or inquiry form",
      impact: "moderate",
      recommendation: "Add a simple contact form for patients who prefer not to call. Include fields for name, phone, email, and message.",
    });
  }

  // MINOR: Nice-to-haves
  if (!extracted.hasPatientPortalLink) {
    findings.push({
      category: "Patient Experience",
      issue: "No patient portal link visible",
      impact: "minor",
      recommendation: "If you have a patient portal, make it easily accessible from the homepage header.",
    });
  }

  if (!extracted.hasSocialLinks) {
    findings.push({
      category: "Online Presence",
      issue: "No social media links",
      impact: "minor",
      recommendation: "Add links to your practice's social media profiles to build community and trust.",
    });
  }

  return findings;
}

function calculateDesignScore(findings: DesignFinding[]): number {
  let score = 100;

  for (const finding of findings) {
    switch (finding.impact) {
      case "critical":
        score -= 15;
        break;
      case "major":
        score -= 10;
        break;
      case "moderate":
        score -= 5;
        break;
      case "minor":
        score -= 2;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
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
    lockAcquired = acquireAuditLock(`design-${leadId}`);
    
    if (!lockAcquired) {
      return NextResponse.json(
        { error: "Design audit already in progress for this lead" },
        { status: 409 }
      );
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.websiteUrl) {
      return NextResponse.json({ error: "Lead has no websiteUrl" }, { status: 400 });
    }

    websiteUrl = lead.websiteUrl;
    logger.auditStart(leadId, websiteUrl);

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();

    let extracted: Extracted;
    let auditError: string | null = null;

    try {
      await page.goto(websiteUrl, {
        timeout: AUDIT_TIMEOUT_MS - 2000,
        waitUntil: "domcontentloaded",
      });

      const [
        title,
        metaDescription,
        hasViewportMeta,
        h1,
        allLinks,
        ctas,
        pageText,
        navItemCount,
        imageCount,
        hasHeroSection,
        hasSocialLinks,
        hasTestimonials,
        hasForms,
      ] = await Promise.all([
        page.title(),
        page.$eval('meta[name="description"]', (el) => el.getAttribute("content")).catch(() => null),
        page.$eval('meta[name="viewport"]', () => true).catch(() => false),
        page.$eval("h1", (el) => el.textContent?.trim() || null).catch(() => null),
        page.$$eval("a", (elements) => elements.slice(0, 50).map((el) => ({
          text: el.textContent?.trim() || "",
          href: el.href || null,
        }))),
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
        page.$eval("body", (el) => el.textContent || ""),
        page.$$eval("nav a, nav button, header a, header button", (els) => els.length),
        page.$$eval("img", (els) => els.length),
        page.$eval("[class*='hero'], [id*='hero'], section:first-of-type", () => true).catch(() => false),
        page.$$eval("a[href*='facebook'], a[href*='twitter'], a[href*='instagram'], a[href*='linkedin']", (els) => els.length > 0),
        page.$eval("[class*='testimonial'], [class*='review'], [id*='testimonial']", () => true).catch(() => false),
        page.$eval("form", () => true).catch(() => false),
      ]);

      const telLinkCount = allLinks.filter((link) => link.href?.startsWith("tel:")).length;

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
        imageCount,
        hasHeroSection,
        hasSocialLinks,
        hasTestimonials,
        hasForms,
        colorContrast: "unknown",
        fontCount: 0,
      };
    } catch (pageError) {
      const errorMessage = pageError instanceof Error ? pageError.message : "Failed to load page";
      auditError = errorMessage.toLowerCase().includes("timeout") ? "timeout" : errorMessage;
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
        imageCount: 0,
        hasHeroSection: false,
        hasSocialLinks: false,
        hasTestimonials: false,
        hasForms: false,
        colorContrast: "unknown",
        fontCount: 0,
      };
    }

    const findings = auditError
      ? [{
          category: "Accessibility",
          issue: `Website could not be loaded: ${auditError}`,
          impact: "critical" as const,
          recommendation: "Ensure the website is accessible and loads within a reasonable time frame.",
        }]
      : generateDesignFindings(extracted);

    const score = auditError ? 0 : calculateDesignScore(findings);

    const designAudit = await prisma.designAudit.upsert({
      where: { leadId },
      create: {
        leadId,
        score,
        findingsJson: JSON.stringify(findings),
        extractedJson: JSON.stringify(extracted),
        error: auditError,
      },
      update: {
        score,
        findingsJson: JSON.stringify(findings),
        extractedJson: JSON.stringify(extracted),
        error: auditError,
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
      websiteUrl,
      durationMs,
      success: !auditError,
      score,
      error: auditError || undefined,
    });

    return NextResponse.json({
      id: designAudit.id,
      score,
      findings,
      extracted,
      error: auditError,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    if (lockAcquired && leadId) {
      releaseAuditLock(`design-${leadId}`);
    }
    if (browser) {
      await browser.close();
    }
  }
}

