import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import openai from "@/lib/openai";
import { defaultOffer } from "@/lib/config";

const draftSchema = z.object({
  leadId: z.string().min(1, "leadId is required"),
  offer: z
    .object({
      price: z.number().optional(),
      timelineDays: z.string().optional(),
      includes: z.array(z.string()).optional(),
    })
    .optional(),
});

type Finding = {
  category: string;
  issue: string;
  impact: string;
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
};

type EmailVersions = {
  owner: {
    email1: string;
    followUp1: string;
    followUp2: string;
    dm: string;
  };
  front_desk: {
    email1: string;
    followUp1: string;
    followUp2: string;
    dm: string;
  };
};

async function generatePersonalizedEmails(
  lead: { name: string; websiteUrl: string; recipientName: string | null },
  designFindings: Finding[],
  seoFindings: Finding[],
  practiceInfo: PracticeInfo,
  offer: typeof defaultOffer
): Promise<EmailVersions> {
  const systemPrompt = `You are an expert copywriter specializing in B2B outreach for web design services targeting medical practices.

Your emails are:
- Personal and conversational, not salesy
- Specific to the practice (reference what you learned about them)
- Value-focused (how you'll help them get more patients)
- Concise and scannable
- End with a soft call-to-action

You write two versions:
1. OWNER version: For the practice owner/physician - focus on patient acquisition, practice growth, and ROI
2. FRONT_DESK version: Shorter, operational - designed to get forwarded to the decision maker

Never use placeholder brackets like [Name] - use natural language that works without personalization if needed.`;

  const topDesignIssues = designFindings
    .filter((f) => f.impact === "critical" || f.impact === "major")
    .slice(0, 3);
  
  const topSeoIssues = seoFindings
    .filter((f) => f.impact === "critical" || f.impact === "major")
    .slice(0, 2);

  const userPrompt = `Write personalized outreach emails for this medical practice:

PRACTICE INFO:
- Name: ${lead.name}
- Website: ${lead.websiteUrl}
- Type: ${practiceInfo.type}
- Specialties: ${practiceInfo.specialties.join(", ") || "General practice"}
- Location: ${practiceInfo.location || "Not specified"}
- Target Audience: ${practiceInfo.targetAudience}
- Current Tone: ${practiceInfo.tone}
- Unique Points: ${practiceInfo.uniqueSellingPoints.join(", ") || "None identified"}

TOP DESIGN ISSUES FOUND:
${topDesignIssues.map((f, i) => `${i + 1}. ${f.issue} - ${f.recommendation}`).join("\n")}

TOP SEO ISSUES FOUND:
${topSeoIssues.map((f, i) => `${i + 1}. ${f.issue} - ${f.recommendation}`).join("\n")}

MY OFFER:
- Price: $${offer.price.toLocaleString()}
- Timeline: ${offer.timelineDays} business days
- Includes: ${offer.includes.join(", ")}

Generate the following JSON with personalized emails:

{
  "owner": {
    "email1": "<Full email with subject line on first line, then blank line, then body. ~150-200 words. Reference specific findings and practice type.>",
    "followUp1": "<Follow-up email 3 days later. ~80-100 words. Gentle reminder with new angle.>",
    "followUp2": "<Final follow-up. ~60-80 words. Last chance, respect their time.>",
    "dm": "<Instagram/LinkedIn DM version. ~40-60 words. Casual, friendly, gets to point fast.>"
  },
  "front_desk": {
    "email1": "<Shorter email asking who handles website decisions. ~80-100 words.>",
    "followUp1": "<Follow-up. ~50-60 words.>",
    "followUp2": "<Final check. ~40-50 words.>",
    "dm": "<Very short DM. ~30-40 words.>"
  }
}

Make each email feel personally written for this specific practice. Reference their specialty, location, or unique aspects.
Use "Hi there" or similar if no recipient name, never use brackets.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    max_tokens: 3000,
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  return JSON.parse(content) as EmailVersions;
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
    const validation = draftSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { leadId, offer: customOffer } = validation.data;

    const offer = {
      price: customOffer?.price ?? defaultOffer.price,
      timelineDays: customOffer?.timelineDays ?? defaultOffer.timelineDays,
      includes: customOffer?.includes ?? defaultOffer.includes,
    };

    // Fetch lead with audits
    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
      include: {
        designAudit: true,
        seoAudit: true,
        audit: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Get findings from audits
    let designFindings: Finding[] = [];
    let seoFindings: Finding[] = [];
    let practiceInfo: PracticeInfo = {
      type: "Medical Practice",
      specialties: [],
      services: [],
      location: lead.city,
      targetAudience: "Patients",
      uniqueSellingPoints: [],
      tone: "professional",
    };

    if (lead.designAudit) {
      designFindings = JSON.parse(lead.designAudit.findingsJson);
      const extracted = JSON.parse(lead.designAudit.extractedJson || "{}");
      if (extracted.practiceInfo) {
        practiceInfo = extracted.practiceInfo;
      }
    } else if (lead.audit) {
      // Fallback to legacy audit
      const legacyFindings = JSON.parse(lead.audit.findingsJson);
      designFindings = legacyFindings.map((f: string) => ({
        category: "Design",
        issue: f,
        impact: "major",
        recommendation: "",
      }));
    }

    if (lead.seoAudit) {
      seoFindings = JSON.parse(lead.seoAudit.findingsJson);
    }

    if (designFindings.length === 0 && seoFindings.length === 0) {
      return NextResponse.json(
        { error: "No audit findings available. Run an AI audit first." },
        { status: 400 }
      );
    }

    // Generate personalized emails with AI
    const versions = await generatePersonalizedEmails(
      {
        name: lead.name,
        websiteUrl: lead.websiteUrl,
        recipientName: lead.recipientName,
      },
      designFindings,
      seoFindings,
      practiceInfo,
      offer
    );

    // Save draft
    const draft = await prisma.outreachDraft.upsert({
      where: { leadId },
      create: {
        leadId,
        email1: versions.owner.email1,
        followUp1: versions.owner.followUp1,
        followUp2: versions.owner.followUp2,
        dmVersion: versions.owner.dm,
        versionsJson: JSON.stringify(versions),
      },
      update: {
        email1: versions.owner.email1,
        followUp1: versions.owner.followUp1,
        followUp2: versions.owner.followUp2,
        dmVersion: versions.owner.dm,
        versionsJson: JSON.stringify(versions),
      },
    });

    // Update lead status
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "DRAFTED" },
    });

    return NextResponse.json({
      id: draft.id,
      versions,
      practiceInfo,
    });
  } catch (error) {
    console.error("AI Draft error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

