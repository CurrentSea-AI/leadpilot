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

type SeoFinding = {
  category: string;
  issue: string;
  impact: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
};

type SeoExtracted = {
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1: string | null;
  h1Count: number;
  h2Count: number;
  h3Count: number;
  hasCanonical: boolean;
  canonicalUrl: string | null;
  hasRobotsMeta: boolean;
  robotsContent: string | null;
  hasOpenGraph: boolean;
  ogTags: Record<string, string>;
  hasTwitterCard: boolean;
  hasSchemaMarkup: boolean;
  schemaTypes: string[];
  isHttps: boolean;
  hasViewportMeta: boolean;
  imageCount: number;
  imagesWithAlt: number;
  imagesWithoutAlt: number;
  internalLinkCount: number;
  externalLinkCount: number;
  brokenLinkCount: number;
  wordCount: number;
  hasXmlSitemap: boolean;
  loadTimeMs: number;
};

function generateSeoFindings(extracted: SeoExtracted, websiteUrl: string): SeoFinding[] {
  const findings: SeoFinding[] = [];

  // CRITICAL: Core SEO elements
  if (!extracted.title) {
    findings.push({
      category: "On-Page SEO",
      issue: "Missing page title (title tag)",
      impact: "critical",
      recommendation: "Add a unique, descriptive title tag between 50-60 characters. Include your practice name and location.",
    });
  } else if (extracted.titleLength < 30) {
    findings.push({
      category: "On-Page SEO",
      issue: `Title tag too short (${extracted.titleLength} characters)`,
      impact: "major",
      recommendation: "Expand your title to 50-60 characters. Example: 'Family Medicine Clinic in [City] | Dr. [Name] Medical Practice'",
    });
  } else if (extracted.titleLength > 60) {
    findings.push({
      category: "On-Page SEO",
      issue: `Title tag too long (${extracted.titleLength} characters)`,
      impact: "moderate",
      recommendation: "Shorten your title to 60 characters or less to prevent truncation in search results.",
    });
  }

  if (!extracted.metaDescription) {
    findings.push({
      category: "On-Page SEO",
      issue: "Missing meta description",
      impact: "critical",
      recommendation: "Add a compelling meta description of 150-160 characters that describes your practice and includes a call to action.",
    });
  } else if (extracted.metaDescriptionLength < 120) {
    findings.push({
      category: "On-Page SEO",
      issue: `Meta description too short (${extracted.metaDescriptionLength} characters)`,
      impact: "moderate",
      recommendation: "Expand your meta description to 150-160 characters to maximize click-through rates from search results.",
    });
  } else if (extracted.metaDescriptionLength > 160) {
    findings.push({
      category: "On-Page SEO",
      issue: `Meta description too long (${extracted.metaDescriptionLength} characters)`,
      impact: "minor",
      recommendation: "Trim your meta description to 160 characters to prevent truncation in search results.",
    });
  }

  // Heading structure
  if (extracted.h1Count === 0) {
    findings.push({
      category: "Content Structure",
      issue: "Missing H1 heading",
      impact: "critical",
      recommendation: "Add a single H1 tag with your main keyword, like 'Family Medicine Practice in [City]'.",
    });
  } else if (extracted.h1Count > 1) {
    findings.push({
      category: "Content Structure",
      issue: `Multiple H1 tags (${extracted.h1Count} found)`,
      impact: "major",
      recommendation: "Use only one H1 tag per page. Convert additional H1s to H2 or H3 tags.",
    });
  }

  if (extracted.h2Count === 0) {
    findings.push({
      category: "Content Structure",
      issue: "No H2 headings found",
      impact: "moderate",
      recommendation: "Add H2 headings to structure your content. Use them for sections like 'Our Services', 'About Us', 'Contact'.",
    });
  }

  // HTTPS
  if (!extracted.isHttps) {
    findings.push({
      category: "Technical SEO",
      issue: "Website not using HTTPS",
      impact: "critical",
      recommendation: "Migrate to HTTPS immediately. Google penalizes non-HTTPS sites, and patients need to trust your security.",
    });
  }

  // Canonical URL
  if (!extracted.hasCanonical) {
    findings.push({
      category: "Technical SEO",
      issue: "Missing canonical URL tag",
      impact: "major",
      recommendation: "Add a canonical tag to prevent duplicate content issues. Set it to the preferred URL of each page.",
    });
  }

  // Open Graph
  if (!extracted.hasOpenGraph) {
    findings.push({
      category: "Social SEO",
      issue: "Missing Open Graph tags",
      impact: "moderate",
      recommendation: "Add Open Graph tags (og:title, og:description, og:image) so your pages look good when shared on social media.",
    });
  }

  // Schema Markup
  if (!extracted.hasSchemaMarkup) {
    findings.push({
      category: "Technical SEO",
      issue: "No schema markup (structured data)",
      impact: "major",
      recommendation: "Add LocalBusiness and MedicalBusiness schema markup to help Google understand your practice and show rich results.",
    });
  } else if (!extracted.schemaTypes.some(t => t.toLowerCase().includes("medical") || t.toLowerCase().includes("physician") || t.toLowerCase().includes("localbusiness"))) {
    findings.push({
      category: "Technical SEO",
      issue: "Schema markup present but missing healthcare-specific types",
      impact: "moderate",
      recommendation: "Add MedicalBusiness or Physician schema types for better local medical search visibility.",
    });
  }

  // Image optimization
  if (extracted.imagesWithoutAlt > 0) {
    findings.push({
      category: "Accessibility & SEO",
      issue: `${extracted.imagesWithoutAlt} images missing alt text`,
      impact: extracted.imagesWithoutAlt > 5 ? "major" : "moderate",
      recommendation: "Add descriptive alt text to all images. This helps with accessibility and image search rankings.",
    });
  }

  // Content length
  if (extracted.wordCount < 300) {
    findings.push({
      category: "Content",
      issue: `Thin content (only ${extracted.wordCount} words)`,
      impact: "major",
      recommendation: "Add more content to your homepage. Aim for at least 500-800 words covering your services, location, and expertise.",
    });
  }

  // Mobile optimization
  if (!extracted.hasViewportMeta) {
    findings.push({
      category: "Mobile SEO",
      issue: "Missing viewport meta tag",
      impact: "critical",
      recommendation: "Add <meta name='viewport' content='width=device-width, initial-scale=1'> for proper mobile rendering.",
    });
  }

  // Page speed (basic check)
  if (extracted.loadTimeMs > 3000) {
    findings.push({
      category: "Performance",
      issue: `Slow page load time (${(extracted.loadTimeMs / 1000).toFixed(1)}s)`,
      impact: "major",
      recommendation: "Optimize page speed by compressing images, minifying CSS/JS, and using browser caching. Aim for under 3 seconds.",
    });
  }

  return findings;
}

function calculateSeoScore(findings: SeoFinding[]): number {
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
    lockAcquired = acquireAuditLock(`seo-${leadId}`);

    if (!lockAcquired) {
      return NextResponse.json(
        { error: "SEO audit already in progress for this lead" },
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

    let extracted: SeoExtracted;
    let auditError: string | null = null;
    const pageLoadStart = Date.now();

    try {
      await page.goto(websiteUrl, {
        timeout: AUDIT_TIMEOUT_MS - 2000,
        waitUntil: "domcontentloaded",
      });

      const loadTimeMs = Date.now() - pageLoadStart;

      const [
        title,
        metaDescription,
        h1,
        h1Count,
        h2Count,
        h3Count,
        canonical,
        robotsMeta,
        ogTags,
        hasTwitterCard,
        schemaScripts,
        hasViewportMeta,
        images,
        links,
        pageText,
      ] = await Promise.all([
        page.title(),
        page.$eval('meta[name="description"]', (el) => el.getAttribute("content")).catch(() => null),
        page.$eval("h1", (el) => el.textContent?.trim() || null).catch(() => null),
        page.$$eval("h1", (els) => els.length),
        page.$$eval("h2", (els) => els.length),
        page.$$eval("h3", (els) => els.length),
        page.$eval('link[rel="canonical"]', (el) => el.getAttribute("href")).catch(() => null),
        page.$eval('meta[name="robots"]', (el) => el.getAttribute("content")).catch(() => null),
        page.$$eval('meta[property^="og:"]', (els) => {
          const tags: Record<string, string> = {};
          els.forEach((el) => {
            const prop = el.getAttribute("property");
            const content = el.getAttribute("content");
            if (prop && content) tags[prop] = content;
          });
          return tags;
        }),
        page.$eval('meta[name="twitter:card"]', () => true).catch(() => false),
        page.$$eval('script[type="application/ld+json"]', (els) => els.map((el) => el.textContent || "")),
        page.$eval('meta[name="viewport"]', () => true).catch(() => false),
        page.$$eval("img", (els) => els.map((el) => ({
          src: el.src,
          alt: el.alt || null,
        }))),
        page.$$eval("a", (els) => els.map((el) => ({
          href: el.href,
          isInternal: el.href.startsWith(window.location.origin),
        }))),
        page.$eval("body", (el) => el.textContent || ""),
      ]);

      // Parse schema types
      const schemaTypes: string[] = [];
      for (const script of schemaScripts) {
        try {
          const parsed = JSON.parse(script);
          if (parsed["@type"]) {
            schemaTypes.push(parsed["@type"]);
          }
          if (Array.isArray(parsed["@graph"])) {
            for (const item of parsed["@graph"]) {
              if (item["@type"]) schemaTypes.push(item["@type"]);
            }
          }
        } catch {
          // Invalid JSON, skip
        }
      }

      const wordCount = pageText.replace(/\s+/g, " ").trim().split(/\s+/).length;

      extracted = {
        title,
        titleLength: title?.length || 0,
        metaDescription,
        metaDescriptionLength: metaDescription?.length || 0,
        h1,
        h1Count,
        h2Count,
        h3Count,
        hasCanonical: !!canonical,
        canonicalUrl: canonical,
        hasRobotsMeta: !!robotsMeta,
        robotsContent: robotsMeta,
        hasOpenGraph: Object.keys(ogTags).length > 0,
        ogTags,
        hasTwitterCard,
        hasSchemaMarkup: schemaScripts.length > 0,
        schemaTypes,
        isHttps: websiteUrl.startsWith("https://"),
        hasViewportMeta,
        imageCount: images.length,
        imagesWithAlt: images.filter((img) => img.alt && img.alt.length > 0).length,
        imagesWithoutAlt: images.filter((img) => !img.alt || img.alt.length === 0).length,
        internalLinkCount: links.filter((l) => l.isInternal).length,
        externalLinkCount: links.filter((l) => !l.isInternal).length,
        brokenLinkCount: 0, // Would need additional requests to check
        wordCount,
        hasXmlSitemap: false, // Would need separate request
        loadTimeMs,
      };
    } catch (pageError) {
      const errorMessage = pageError instanceof Error ? pageError.message : "Failed to load page";
      auditError = errorMessage.toLowerCase().includes("timeout") ? "timeout" : errorMessage;
      extracted = {
        title: null,
        titleLength: 0,
        metaDescription: null,
        metaDescriptionLength: 0,
        h1: null,
        h1Count: 0,
        h2Count: 0,
        h3Count: 0,
        hasCanonical: false,
        canonicalUrl: null,
        hasRobotsMeta: false,
        robotsContent: null,
        hasOpenGraph: false,
        ogTags: {},
        hasTwitterCard: false,
        hasSchemaMarkup: false,
        schemaTypes: [],
        isHttps: websiteUrl.startsWith("https://"),
        hasViewportMeta: false,
        imageCount: 0,
        imagesWithAlt: 0,
        imagesWithoutAlt: 0,
        internalLinkCount: 0,
        externalLinkCount: 0,
        brokenLinkCount: 0,
        wordCount: 0,
        hasXmlSitemap: false,
        loadTimeMs: 0,
      };
    }

    const findings = auditError
      ? [{
          category: "Technical SEO",
          issue: `Website could not be loaded: ${auditError}`,
          impact: "critical" as const,
          recommendation: "Ensure the website is accessible. A website that doesn't load can't be indexed by search engines.",
        }]
      : generateSeoFindings(extracted, websiteUrl);

    const score = auditError ? 0 : calculateSeoScore(findings);

    const seoAudit = await prisma.seoAudit.upsert({
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
      id: seoAudit.id,
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
      releaseAuditLock(`seo-${leadId}`);
    }
    if (browser) {
      await browser.close();
    }
  }
}

