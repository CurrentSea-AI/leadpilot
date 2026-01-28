import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { defaultOffer } from "@/lib/config";
import logger from "@/lib/logger";

const batchDraftSchema = z.object({
  leadIds: z
    .array(z.string().min(1))
    .min(1, "At least one leadId required")
    .max(10, "Maximum 10 leads per batch"),
  offer: z
    .object({
      price: z.number().optional(),
      timelineDays: z.string().optional(),
      includes: z.array(z.string()).optional(),
    })
    .optional(),
});

type DraftResult = {
  leadId: string;
  success: boolean;
  error?: string;
};

type DraftVersions = {
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

// Placeholders:
// {{PracticeName}} - The practice/lead name
// {{Name}} - The recipient's name (or "there" if not set)
// {{WebsiteUrl}} - The website URL

// ============ OWNER VERSION ============

function generateOwnerEmail1(
  lead: { name: string; websiteUrl: string },
  audit: { findingsJson: string; score: number },
  offer: typeof defaultOffer
): string {
  const findings = JSON.parse(audit.findingsJson) as string[];
  const topFindings = findings.slice(0, 3);

  const findingsList = topFindings.map((f, i) => `${i + 1}. ${f}`).join("\n");

  const includesList = offer.includes.map((item) => `• ${item}`).join("\n");

  return `Subject: Helping {{PracticeName}} convert more website visitors to booked patients

Hi {{Name}},

I was reviewing {{WebsiteUrl}} from a patient's perspective and noticed a few areas that may be affecting your booking rate:

${findingsList}

These aren't major overhauls — they're straightforward fixes that directly impact how easily patients can find you, trust you, and book an appointment.

Here's what I typically include for practices like yours:

${includesList}

Investment: $${offer.price.toLocaleString()}
Timeline: ${offer.timelineDays} business days

I'd love to walk you through these findings in a quick 15-minute call — would that work this week?

Best regards`;
}

function generateOwnerFollowUp1(): string {
  return `Subject: Quick follow-up — {{PracticeName}} patient experience

Hi {{Name}},

Just following up on my earlier note about your website. I know running a practice keeps you busy, but the issues I flagged are the kinds of things that quietly cost you patients every week — especially on mobile.

Happy to chat whenever works for you. Even a 10-minute call can help clarify whether it's worth addressing.

Best`;
}

function generateOwnerFollowUp2(): string {
  return `Subject: Last note — {{PracticeName}}

Hi {{Name}},

I'll keep this brief — I sent a couple of observations about your website that I believe could meaningfully improve your patient acquisition.

If you're interested, I'm happy to discuss. If the timing isn't right, no worries at all — I appreciate you reading this far.

Take care`;
}

function generateOwnerDm(
  audit: { findingsJson: string }
): string {
  const findings = JSON.parse(audit.findingsJson) as string[];
  const topFinding = findings[0] || "some areas that could improve patient conversions";

  return `Hi {{Name}}! I took a look at {{PracticeName}}'s website from a patient's perspective and noticed ${topFinding.toLowerCase().slice(0, 80)}... These kinds of things quietly affect booking rates. Mind if I share a few thoughts?`;
}

// ============ FRONT DESK VERSION ============

function generateFrontDeskEmail1(
  audit: { findingsJson: string }
): string {
  const findings = JSON.parse(audit.findingsJson) as string[];
  const topFinding = findings[0] || "a few things that could use a quick update";

  return `Subject: Quick question about {{PracticeName}}'s website

Hi {{Name}},

I noticed ${topFinding.toLowerCase().slice(0, 100)} on your website.

Who handles website updates for the practice? I'd love to pass along a few suggestions that could help patients book more easily.

Thanks!`;
}

function generateFrontDeskFollowUp1(): string {
  return `Subject: Following up — {{PracticeName}} website

Hi {{Name}},

Just checking in on my earlier email. Would you be able to point me to whoever handles the website? I have a few quick ideas that could help.

Thanks!`;
}

function generateFrontDeskFollowUp2(): string {
  return `Subject: Last check-in — {{PracticeName}}

Hi {{Name}},

Quick final follow-up — if there's someone who manages website updates for the practice, I'd appreciate an intro. Otherwise, no worries!

Thanks`;
}

function generateFrontDeskDm(
  audit: { findingsJson: string }
): string {
  const findings = JSON.parse(audit.findingsJson) as string[];
  const topFinding = findings[0] || "a quick improvement opportunity";

  return `Hey {{Name}}! I noticed ${topFinding.toLowerCase().slice(0, 60)}... on {{PracticeName}}'s site. Do you know who handles website stuff there?`;
}

function generateAllVersions(
  lead: { name: string; websiteUrl: string },
  audit: { findingsJson: string; score: number },
  offer: typeof defaultOffer
): DraftVersions {
  return {
    owner: {
      email1: generateOwnerEmail1(lead, audit, offer),
      followUp1: generateOwnerFollowUp1(),
      followUp2: generateOwnerFollowUp2(),
      dm: generateOwnerDm(audit),
    },
    front_desk: {
      email1: generateFrontDeskEmail1(audit),
      followUp1: generateFrontDeskFollowUp1(),
      followUp2: generateFrontDeskFollowUp2(),
      dm: generateFrontDeskDm(audit),
    },
  };
}

const MIN_SCORE_FOR_DRAFT = 6;

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const results: DraftResult[] = [];

  try {
    const body = await request.json();

    const validation = batchDraftSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { leadIds, offer: customOffer } = validation.data;

    // Merge custom offer with defaults
    const offer = {
      price: customOffer?.price ?? defaultOffer.price,
      timelineDays: customOffer?.timelineDays ?? defaultOffer.timelineDays,
      includes: customOffer?.includes ?? defaultOffer.includes,
    };

    logger.info("Batch draft generation started", { count: leadIds.length });

    // Process leads sequentially
    for (const leadId of leadIds) {
      try {
        // Fetch lead with audit
        const lead = await prisma.lead.findUnique({
          where: { id: leadId },
          include: { audit: true },
        });

        if (!lead) {
          results.push({
            leadId,
            success: false,
            error: "Lead not found",
          });
          continue;
        }

        if (!lead.audit) {
          results.push({
            leadId,
            success: false,
            error: "Lead has not been audited yet",
          });
          continue;
        }

        if (lead.audit.score < MIN_SCORE_FOR_DRAFT) {
          results.push({
            leadId,
            success: false,
            error: `Score ${lead.audit.score}/10 is below minimum ${MIN_SCORE_FOR_DRAFT}`,
          });
          continue;
        }

        // Generate both audience versions (with placeholders)
        const versions = generateAllVersions(lead, lead.audit, offer);
        const versionsJson = JSON.stringify(versions);

        // Upsert outreach draft
        await prisma.outreachDraft.upsert({
          where: { leadId },
          create: {
            leadId,
            email1: versions.owner.email1,
            followUp1: versions.owner.followUp1,
            followUp2: versions.owner.followUp2,
            dmVersion: versions.owner.dm,
            versionsJson,
          },
          update: {
            email1: versions.owner.email1,
            followUp1: versions.owner.followUp1,
            followUp2: versions.owner.followUp2,
            dmVersion: versions.owner.dm,
            versionsJson,
          },
        });

        // Update lead status to DRAFTED
        await prisma.lead.update({
          where: { id: leadId },
          data: { status: "DRAFTED" },
        });

        results.push({
          leadId,
          success: true,
        });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        results.push({
          leadId,
          success: false,
          error: errorMessage,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const durationMs = Date.now() - startTime;

    logger.info("Batch draft generation completed", {
      processed: results.length,
      succeeded,
      failed,
      durationMs,
    });

    return NextResponse.json({
      processed: results.length,
      succeeded,
      failed,
      results,
    });
  } catch (error) {
    console.error("Batch draft generation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
