import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/openai";
import { defaultOffer } from "@/lib/config";
import { normalizeWebsiteUrl } from "@/lib/normalize";
import { captureWebsite } from "@/lib/browser";
import OpenAI from "openai";

/**
 * FULL AUTOMATION ENDPOINT
 * 
 * Input: Just a website URL
 * Output: Complete lead with AI audit, personalized drafts, and shareable report
 * 
 * This is the "one-click" endpoint for your assistant to use.
 */

const processSchema = z.object({
  websiteUrl: z.string().url("Valid URL required"),
  name: z.string().optional(), // Auto-inferred if not provided
  city: z.string().optional(),
  apiKey: z.string().optional(), // User's OpenAI API key (BYOK)
});

type AuditFinding = {
  category: string;
  issue: string;
  impact: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
  details?: string;
};

type PracticeInfo = {
  type: string;
  specialties: string[];
  services: string[];
  location: string | null;
  targetAudience: string;
  uniqueSellingPoints: string[];
  tone: string;
  suggestedName: string;
};

type AIAuditResult = {
  designScore: number;
  seoScore: number;
  overallScore: number;
  designFindings: AuditFinding[];
  seoFindings: AuditFinding[];
  practiceInfo: PracticeInfo;
  summary: string;
};

type EmailVersions = {
  owner: { email1: string; followUp1: string; followUp2: string; dm: string };
  front_desk: { email1: string; followUp1: string; followUp2: string; dm: string };
};

async function runFullAIAnalysis(
  screenshotBase64: string,
  pageContent: string,
  websiteUrl: string,
  client: OpenAI
): Promise<AIAuditResult> {
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert web design and SEO auditor for medical practices. 
Analyze websites and provide comprehensive audits that justify a web redesign project.
Be specific - reference actual elements you see in the screenshot.
Extract practice information to help personalize outreach.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this medical practice website: ${websiteUrl}

PAGE CONTENT:
${pageContent.slice(0, 6000)}

Provide analysis as JSON:
{
  "designScore": <0-100>,
  "seoScore": <0-100>,
  "overallScore": <0-100 weighted average>,
  "designFindings": [{"category": "...", "issue": "...", "impact": "critical|major|moderate|minor", "recommendation": "...", "details": "..."}],
  "seoFindings": [{"category": "...", "issue": "...", "impact": "critical|major|moderate|minor", "recommendation": "...", "details": "..."}],
  "practiceInfo": {
    "type": "<e.g., Family Medicine, Dental, etc.>",
    "specialties": ["<services/specialties>"],
    "services": ["<specific services>"],
    "location": "<city, state if found>",
    "targetAudience": "<who they serve>",
    "uniqueSellingPoints": ["<differentiators>"],
    "tone": "<website tone>",
    "suggestedName": "<practice name from the website>"
  },
  "summary": "<2-3 sentence executive summary>"
}

Focus on 5-7 most impactful findings per category.`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${screenshotBase64}`, detail: "high" },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 4000,
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No AI response");
  return JSON.parse(content);
}

async function generateEmails(
  lead: { name: string; websiteUrl: string },
  findings: { design: AuditFinding[]; seo: AuditFinding[] },
  practiceInfo: PracticeInfo,
  offer: typeof defaultOffer,
  client: OpenAI
): Promise<EmailVersions> {
  const topIssues = [...findings.design, ...findings.seo]
    .filter((f) => f.impact === "critical" || f.impact === "major")
    .slice(0, 4);

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You write personalized B2B outreach emails for web design services.
Style: Personal, specific to the practice, value-focused, concise.
Never use placeholder brackets - write complete, ready-to-send emails.`,
      },
      {
        role: "user",
        content: `Write outreach emails for:

PRACTICE: ${lead.name}
WEBSITE: ${lead.websiteUrl}
TYPE: ${practiceInfo.type}
LOCATION: ${practiceInfo.location || "Unknown"}
SPECIALTIES: ${practiceInfo.specialties.join(", ")}

KEY ISSUES FOUND:
${topIssues.map((f, i) => `${i + 1}. ${f.issue}`).join("\n")}

OFFER: $${offer.price} / ${offer.timelineDays} days / ${offer.includes.join(", ")}

Return JSON:
{
  "owner": {
    "email1": "<Subject: ...\\n\\nBody... 150-200 words>",
    "followUp1": "<80-100 words>",
    "followUp2": "<60-80 words>",
    "dm": "<40-60 words>"
  },
  "front_desk": {
    "email1": "<80-100 words, ask who handles website>",
    "followUp1": "<50-60 words>",
    "followUp2": "<40-50 words>",
    "dm": "<30-40 words>"
  }
}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No AI response");
  return JSON.parse(content);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = processSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { websiteUrl: rawUrl, name: providedName, city, apiKey } = validation.data;
    const websiteUrl = normalizeWebsiteUrl(rawUrl);

    // Get OpenAI client (use user's key if provided, otherwise fall back to env)
    const openaiClient = getOpenAIClient(apiKey);

    // Check for existing lead
    const existingLead = await prisma.lead.findFirst({
      where: { websiteUrl },
      include: { designAudit: true, seoAudit: true, outreachDraft: true },
    });

    if (existingLead?.designAudit && existingLead?.outreachDraft) {
      // Already processed - return existing data
      const report = await prisma.report.findFirst({
        where: { leadId: existingLead.id },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        status: "already_processed",
        leadId: existingLead.id,
        name: existingLead.name,
        designScore: existingLead.designAudit.score,
        seoScore: existingLead.seoAudit?.score,
        reportUrl: report ? `/report/${report.publicId}` : null,
        message: "This website has already been processed. Use the existing report.",
      });
    }

    // Capture website screenshot and content
    const { screenshotBase64, pageContent } = await captureWebsite(websiteUrl);

    // Run AI analysis
    const aiResult = await runFullAIAnalysis(screenshotBase64, pageContent, websiteUrl, openaiClient);

    // Create or update lead
    const leadName = providedName || aiResult.practiceInfo.suggestedName || "Unknown Practice";
    
    let lead;
    if (existingLead) {
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: { name: leadName, city: city || aiResult.practiceInfo.location, status: "AUDITED" },
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          name: leadName,
          websiteUrl,
          city: city || aiResult.practiceInfo.location,
          source: "ai_process",
          status: "AUDITED",
        },
      });
    }

    // Save audits
    await prisma.designAudit.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        score: aiResult.designScore,
        findingsJson: JSON.stringify(aiResult.designFindings),
        extractedJson: JSON.stringify({ practiceInfo: aiResult.practiceInfo, summary: aiResult.summary }),
      },
      update: {
        score: aiResult.designScore,
        findingsJson: JSON.stringify(aiResult.designFindings),
        extractedJson: JSON.stringify({ practiceInfo: aiResult.practiceInfo, summary: aiResult.summary }),
      },
    });

    await prisma.seoAudit.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        score: aiResult.seoScore,
        findingsJson: JSON.stringify(aiResult.seoFindings),
        extractedJson: JSON.stringify({ practiceInfo: aiResult.practiceInfo }),
      },
      update: {
        score: aiResult.seoScore,
        findingsJson: JSON.stringify(aiResult.seoFindings),
        extractedJson: JSON.stringify({ practiceInfo: aiResult.practiceInfo }),
      },
    });

    // Generate personalized emails
    const emailVersions = await generateEmails(
      { name: lead.name, websiteUrl },
      { design: aiResult.designFindings, seo: aiResult.seoFindings },
      aiResult.practiceInfo,
      defaultOffer,
      openaiClient
    );

    await prisma.outreachDraft.upsert({
      where: { leadId: lead.id },
      create: {
        leadId: lead.id,
        email1: emailVersions.owner.email1,
        followUp1: emailVersions.owner.followUp1,
        followUp2: emailVersions.owner.followUp2,
        dmVersion: emailVersions.owner.dm,
        versionsJson: JSON.stringify(emailVersions),
      },
      update: {
        email1: emailVersions.owner.email1,
        followUp1: emailVersions.owner.followUp1,
        followUp2: emailVersions.owner.followUp2,
        dmVersion: emailVersions.owner.dm,
        versionsJson: JSON.stringify(emailVersions),
      },
    });

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: "DRAFTED" },
    });

    // Generate shareable report
    const reportData = {
      lead: { name: lead.name, websiteUrl, city: lead.city },
      generatedAt: new Date().toISOString(),
      type: "full",
      designAudit: { score: aiResult.designScore, findings: aiResult.designFindings },
      seoAudit: { score: aiResult.seoScore, findings: aiResult.seoFindings },
      practiceInfo: aiResult.practiceInfo,
      summary: aiResult.summary,
    };

    const report = await prisma.report.create({
      data: {
        leadId: lead.id,
        type: "full",
        dataJson: JSON.stringify(reportData),
      },
    });

    return NextResponse.json({
      status: "success",
      leadId: lead.id,
      name: lead.name,
      websiteUrl,
      designScore: aiResult.designScore,
      seoScore: aiResult.seoScore,
      overallScore: aiResult.overallScore,
      summary: aiResult.summary,
      practiceInfo: aiResult.practiceInfo,
      reportUrl: `/report/${report.publicId}`,
      reportId: report.publicId,
      emailPreview: {
        owner: emailVersions.owner.email1.slice(0, 200) + "...",
        frontDesk: emailVersions.front_desk.email1.slice(0, 200) + "...",
      },
    });
  } catch (error) {
    console.error("Process error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
