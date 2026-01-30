import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getOpenAIClient } from "@/lib/openai";
import { defaultOffer } from "@/lib/config";
import { normalizeWebsiteUrl } from "@/lib/normalize";
import { getBrowser, captureWebsite } from "@/lib/browser";

/**
 * BATCH PROCESSOR
 * 
 * Takes a list of website URLs and processes them all through the AI pipeline.
 * Returns reports for each successful lead.
 */

const batchSchema = z.object({
  leads: z.array(z.object({
    name: z.string().optional(),
    website: z.string().url(),
    city: z.string().optional(),
  })).min(1).max(10),
});

type ProcessedLead = {
  website: string;
  status: "success" | "error" | "duplicate";
  name?: string;
  designScore?: number;
  seoScore?: number;
  reportUrl?: string;
  error?: string;
};

type AIResult = {
  designScore: number;
  seoScore: number;
  overallScore: number;
  designFindings: Array<{
    category: string;
    issue: string;
    impact: string;
    recommendation: string;
  }>;
  seoFindings: Array<{
    category: string;
    issue: string;
    impact: string;
    recommendation: string;
  }>;
  practiceInfo: {
    type: string;
    specialties: string[];
    services: string[];
    location: string | null;
    targetAudience: string;
    uniqueSellingPoints: string[];
    tone: string;
    suggestedName: string;
  };
  summary: string;
};

async function analyzeWebsite(
  websiteUrl: string
): Promise<{ screenshot: string; content: string }> {
  const result = await captureWebsite(websiteUrl);
  return { screenshot: result.screenshotBase64, content: result.pageContent };
}

async function runAIAnalysis(
  screenshot: string,
  content: string,
  websiteUrl: string
): Promise<AIResult> {
  const openaiClient = getOpenAIClient();
  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert web design and SEO auditor for medical practices. 
Analyze websites and provide comprehensive audits. Be specific - reference actual elements you see.
Extract practice information to help personalize outreach.`,
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this medical practice website: ${websiteUrl}

PAGE CONTENT:
${content.slice(0, 5000)}

Provide analysis as JSON:
{
  "designScore": <0-100>,
  "seoScore": <0-100>,
  "overallScore": <0-100>,
  "designFindings": [{"category": "...", "issue": "...", "impact": "critical|major|moderate|minor", "recommendation": "..."}],
  "seoFindings": [{"category": "...", "issue": "...", "impact": "critical|major|moderate|minor", "recommendation": "..."}],
  "practiceInfo": {
    "type": "<practice type>",
    "specialties": ["<specialties>"],
    "services": ["<services>"],
    "location": "<city, state>",
    "targetAudience": "<audience>",
    "uniqueSellingPoints": ["<differentiators>"],
    "tone": "<tone>",
    "suggestedName": "<practice name from website>"
  },
  "summary": "<2-3 sentence summary>"
}`,
          },
          {
            type: "image_url",
            image_url: { url: `data:image/png;base64,${screenshot}`, detail: "low" },
          },
        ],
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
    temperature: 0.3,
  });

  const responseContent = response.choices[0]?.message?.content;
  if (!responseContent) throw new Error("No AI response");
  return JSON.parse(responseContent);
}

async function generateEmails(
  leadName: string,
  websiteUrl: string,
  findings: AIResult["designFindings"],
  practiceInfo: AIResult["practiceInfo"]
): Promise<{ owner: { email1: string; followUp1: string; followUp2: string; dm: string }; front_desk: { email1: string; followUp1: string; followUp2: string; dm: string } }> {
  const topIssues = findings.filter(f => f.impact === "critical" || f.impact === "major").slice(0, 3);

  const openaiClient = getOpenAIClient();
  const response = await openaiClient.chat.completions.create({
    model: "gpt-4o-mini", // Use mini for cost efficiency in batch
    messages: [
      {
        role: "system",
        content: `Write personalized B2B outreach emails for web design services. Personal, specific, value-focused, concise. No placeholder brackets.`,
      },
      {
        role: "user",
        content: `Write emails for:
PRACTICE: ${leadName}
WEBSITE: ${websiteUrl}
TYPE: ${practiceInfo.type}
LOCATION: ${practiceInfo.location || "Unknown"}
ISSUES: ${topIssues.map(f => f.issue).join("; ")}
OFFER: $${defaultOffer.price} / ${defaultOffer.timelineDays} days

Return JSON:
{
  "owner": {"email1": "<150-200 words with Subject: line>", "followUp1": "<80 words>", "followUp2": "<60 words>", "dm": "<50 words>"},
  "front_desk": {"email1": "<80 words>", "followUp1": "<50 words>", "followUp2": "<40 words>", "dm": "<30 words>"}
}`,
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 2000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error("No AI response");
  return JSON.parse(content);
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const validation = batchSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { leads } = validation.data;
    const results: ProcessedLead[] = [];

    for (const leadInput of leads) {
      const websiteUrl = normalizeWebsiteUrl(leadInput.website);

      try {
        // Check for existing lead
        const existingLead = await prisma.lead.findFirst({
          where: { websiteUrl },
          include: { designAudit: true, outreachDraft: true },
        });

        if (existingLead?.designAudit && existingLead?.outreachDraft) {
          // Already processed
          const report = await prisma.report.findFirst({
            where: { leadId: existingLead.id },
            orderBy: { createdAt: "desc" },
          });

          results.push({
            website: websiteUrl,
            status: "duplicate",
            name: existingLead.name,
            designScore: existingLead.designAudit.score,
            reportUrl: report ? `/report/${report.publicId}` : undefined,
          });
          continue;
        }

        // Analyze website
        const { screenshot, content } = await analyzeWebsite(websiteUrl);
        const aiResult = await runAIAnalysis(screenshot, content, websiteUrl);

        // Create or update lead
        const leadName = leadInput.name || aiResult.practiceInfo.suggestedName || "Unknown Practice";
        
        let lead;
        if (existingLead) {
          lead = await prisma.lead.update({
            where: { id: existingLead.id },
            data: { name: leadName, city: leadInput.city || aiResult.practiceInfo.location, status: "AUDITED" },
          });
        } else {
          lead = await prisma.lead.create({
            data: {
              name: leadName,
              websiteUrl,
              city: leadInput.city || aiResult.practiceInfo.location,
              source: "ai_batch",
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

        // Generate emails
        const emails = await generateEmails(
          lead.name,
          websiteUrl,
          [...aiResult.designFindings, ...aiResult.seoFindings],
          aiResult.practiceInfo
        );

        await prisma.outreachDraft.upsert({
          where: { leadId: lead.id },
          create: {
            leadId: lead.id,
            email1: emails.owner.email1,
            followUp1: emails.owner.followUp1,
            followUp2: emails.owner.followUp2,
            dmVersion: emails.owner.dm,
            versionsJson: JSON.stringify(emails),
          },
          update: {
            email1: emails.owner.email1,
            followUp1: emails.owner.followUp1,
            followUp2: emails.owner.followUp2,
            dmVersion: emails.owner.dm,
            versionsJson: JSON.stringify(emails),
          },
        });

        await prisma.lead.update({
          where: { id: lead.id },
          data: { status: "DRAFTED" },
        });

        // Generate report
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

        results.push({
          website: websiteUrl,
          status: "success",
          name: lead.name,
          designScore: aiResult.designScore,
          seoScore: aiResult.seoScore,
          reportUrl: `/report/${report.publicId}`,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        results.push({
          website: websiteUrl,
          status: "error",
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.status === "success").length;
    const errorCount = results.filter(r => r.status === "error").length;
    const duplicateCount = results.filter(r => r.status === "duplicate").length;

    return NextResponse.json({
      processed: results.length,
      success: successCount,
      errors: errorCount,
      duplicates: duplicateCount,
      results,
    });
  } catch (error) {
    console.error("Batch error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

