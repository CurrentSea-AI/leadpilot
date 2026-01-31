import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { normalizeWebsiteUrl } from "@/lib/normalize";

/**
 * AUTOMATED LEAD FINDER
 * 
 * Returns sample leads for a given city/query.
 * For real lead finding, you would integrate with:
 * - Google Custom Search API
 * - SerpAPI
 * - Or a similar search service
 */

const findSchema = z.object({
  city: z.string().min(2, "City is required"),
  state: z.string().optional(),
  query: z.string().optional().default("medical office"),
  limit: z.number().min(1).max(20).optional().default(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = findSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { city, state, query, limit } = validation.data;
    const location = state ? `${city}, ${state}` : city;

    // For now, return instructions on how to find leads manually
    // In production, you would use Google Custom Search API or SerpAPI
    
    // Check for existing leads to avoid duplicates
    const existingLeads = await prisma.lead.findMany({
      select: { websiteUrl: true },
    });
    const existingUrls = new Set(
      existingLeads
        .filter(l => l.websiteUrl)
        .map(l => normalizeWebsiteUrl(l.websiteUrl!))
    );

    return NextResponse.json({
      found: 0,
      new: 0,
      duplicates: 0,
      leads: [],
      query: `${query} ${location}`,
      message: `To find ${query} leads in ${location}, please use Google Maps or search manually and use the Single URL audit feature. Automated search requires a Google Custom Search API integration.`,
      searchUrl: `https://www.google.com/maps/search/${encodeURIComponent(`${query} ${location}`)}`,
      existingLeadsCount: existingUrls.size,
    });
  } catch (error) {
    console.error("Find error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
