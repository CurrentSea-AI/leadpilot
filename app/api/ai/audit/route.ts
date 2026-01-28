import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chromium, Browser } from "playwright";
import prisma from "@/lib/prisma";
import openai from "@/lib/openai";

const AUDIT_TIMEOUT_MS = 30000;

const auditSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
});

type AuditFinding = {
  category: string;
  issue: string;
  impact: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
  details?: string;
};

type AIAuditResult = {
  designScore: number;
  seoScore: number;
  overallScore: number;
  designFindings: AuditFinding[];
  seoFindings: AuditFinding[];
  practiceInfo: {
    type: string;
    specialties: string[];
    services: string[];
    location: string | null;
    targetAudience: string;
    uniqueSellingPoints: string[];
    tone: string;
  };
  summary: string;
};

async function analyzeWithVision(
  screenshotBase64: string,
  pageContent: string,
  websiteUrl: string
): Promise<AIAuditResult> {
  const systemPrompt = `You are an expert web design and SEO auditor specializing in medical practice websites. 
You analyze websites from both a design/UX perspective and an SEO perspective.
You provide actionable, specific findings that a web designer can use to pitch services.

For medical practice websites, you understand:
- Patient journey and conversion optimization
- Trust signals and credibility markers
- HIPAA-conscious design principles
- Local SEO for healthcare
- Mobile-first medical search behavior
- Appointment booking optimization

Be specific and reference what you actually see in the screenshot and content.`;

  const userPrompt = `Analyze this medical practice website: ${websiteUrl}

SCREENSHOT: [Attached image]

PAGE CONTENT (extracted text):
${pageContent.slice(0, 8000)}

Provide a comprehensive audit in the following JSON format:

{
  "designScore": <0-100 score for design/UX>,
  "seoScore": <0-100 score for SEO>,
  "overallScore": <0-100 weighted average>,
  "designFindings": [
    {
      "category": "<Conversion|Mobile|Trust|Visual|Navigation|Content>",
      "issue": "<specific issue observed>",
      "impact": "<critical|major|moderate|minor>",
      "recommendation": "<specific actionable fix>",
      "details": "<what you observed that led to this finding>"
    }
  ],
  "seoFindings": [
    {
      "category": "<On-Page|Technical|Local|Content|Performance>",
      "issue": "<specific SEO issue>",
      "impact": "<critical|major|moderate|minor>",
      "recommendation": "<specific fix>",
      "details": "<technical details>"
    }
  ],
  "practiceInfo": {
    "type": "<type of medical practice, e.g., Family Medicine, Dental, Dermatology>",
    "specialties": ["<list of specialties/services mentioned>"],
    "services": ["<specific services offered>"],
    "location": "<city/state if mentioned>",
    "targetAudience": "<who the practice seems to target>",
    "uniqueSellingPoints": ["<what makes them different>"],
    "tone": "<professional|friendly|clinical|modern|outdated>"
  },
  "summary": "<2-3 sentence executive summary of the website's strengths and weaknesses>"
}

Focus on findings that would justify a $1,500-3,000 website redesign project.
Be honest but frame issues as opportunities for improvement.
Limit to 5-7 findings per category, prioritizing the most impactful issues.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: [
          { type: "text", text: userPrompt },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${screenshotBase64}`,
              detail: "high",
            },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as AIAuditResult;
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;
  const startTime = Date.now();

  try {
    // Check for API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured. Add OPENAI_API_KEY to your environment." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validation = auditSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { leadId } = validation.data;

    // Fetch lead
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    if (!lead.websiteUrl) {
      return NextResponse.json({ error: "Lead has no websiteUrl" }, { status: 400 });
    }

    // Launch browser and take screenshot
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
    });
    context.setDefaultTimeout(15000);
    const page = await context.newPage();

    let screenshotBase64: string;
    let pageContent: string;
    let auditError: string | null = null;

    try {
      await page.goto(lead.websiteUrl, {
        timeout: AUDIT_TIMEOUT_MS - 5000,
        waitUntil: "networkidle",
      });

      // Wait a bit for any lazy-loaded content
      await page.waitForTimeout(2000);

      // Take full-page screenshot
      const screenshotBuffer = await page.screenshot({
        fullPage: false, // Just viewport for faster processing
        type: "png",
      });
      screenshotBase64 = screenshotBuffer.toString("base64");

      // Extract page content
      pageContent = await page.$eval("body", (el) => el.textContent || "");
    } catch (pageError) {
      const errorMessage = pageError instanceof Error ? pageError.message : "Failed to load page";
      auditError = errorMessage;
      return NextResponse.json(
        { error: `Failed to load website: ${auditError}` },
        { status: 400 }
      );
    }

    // Analyze with AI
    const aiResult = await analyzeWithVision(screenshotBase64, pageContent, lead.websiteUrl);

    // Save Design Audit
    await prisma.designAudit.upsert({
      where: { leadId },
      create: {
        leadId,
        score: aiResult.designScore,
        findingsJson: JSON.stringify(aiResult.designFindings),
        extractedJson: JSON.stringify({
          practiceInfo: aiResult.practiceInfo,
          summary: aiResult.summary,
        }),
      },
      update: {
        score: aiResult.designScore,
        findingsJson: JSON.stringify(aiResult.designFindings),
        extractedJson: JSON.stringify({
          practiceInfo: aiResult.practiceInfo,
          summary: aiResult.summary,
        }),
      },
    });

    // Save SEO Audit
    await prisma.seoAudit.upsert({
      where: { leadId },
      create: {
        leadId,
        score: aiResult.seoScore,
        findingsJson: JSON.stringify(aiResult.seoFindings),
        extractedJson: JSON.stringify({
          practiceInfo: aiResult.practiceInfo,
        }),
      },
      update: {
        score: aiResult.seoScore,
        findingsJson: JSON.stringify(aiResult.seoFindings),
        extractedJson: JSON.stringify({
          practiceInfo: aiResult.practiceInfo,
        }),
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "AUDITED" },
    });

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      leadId,
      designScore: aiResult.designScore,
      seoScore: aiResult.seoScore,
      overallScore: aiResult.overallScore,
      designFindings: aiResult.designFindings,
      seoFindings: aiResult.seoFindings,
      practiceInfo: aiResult.practiceInfo,
      summary: aiResult.summary,
      durationMs,
    });
  } catch (error) {
    console.error("AI Audit error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

