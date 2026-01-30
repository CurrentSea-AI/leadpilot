import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { normalizeWebsiteUrl } from "@/lib/normalize";
import { getBrowser } from "@/lib/browser";
import type { Browser } from "puppeteer-core";

/**
 * AUTOMATED LEAD FINDER
 * 
 * Searches Google for medical practices in a given city
 * and extracts their website URLs.
 */

const findSchema = z.object({
  city: z.string().min(2, "City is required"),
  state: z.string().optional(),
  query: z.string().optional().default("medical office"),
  limit: z.number().min(1).max(20).optional().default(10),
});

type FoundLead = {
  name: string;
  website: string;
  address?: string;
  phone?: string;
};

async function searchGoogleMaps(
  browser: Browser,
  city: string,
  state: string | undefined,
  query: string,
  limit: number
): Promise<FoundLead[]> {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  await page.setViewport({ width: 1440, height: 900 });
  
  const leads: FoundLead[] = [];

  try {
    const location = state ? `${city}, ${state}` : city;
    const searchQuery = `${query} ${location}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    await page.goto(mapsUrl, { timeout: 30000, waitUntil: "networkidle2" });
    
    // Wait for results to load
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to load more results
    await page.evaluate(() => {
      const feed = document.querySelector('[role="feed"]');
      if (feed) {
        for (let i = 0; i < 3; i++) {
          feed.scrollBy(0, 500);
        }
      }
    });
    await new Promise(r => setTimeout(r, 2000));

    // Get all result items - simplified extraction
    const items = await page.$$('[role="feed"] > div > div > a');
    
    for (const item of items.slice(0, limit * 2)) {
      try {
        await item.click();
        await new Promise(r => setTimeout(r, 2000));

        const name = await page.$eval('h1', el => el.textContent).catch(() => null);
        const websiteLink = await page.$eval('a[data-item-id="authority"]', el => el.getAttribute('href')).catch(() => null);
        const address = await page.$eval('[data-item-id="address"] .fontBodyMedium', el => el.textContent).catch(() => null);
        const phone = await page.$eval('[data-item-id^="phone"] .fontBodyMedium', el => el.textContent).catch(() => null);

        if (name && websiteLink && !websiteLink.includes('google.com')) {
          leads.push({
            name: name.trim(),
            website: websiteLink,
            address: address?.trim(),
            phone: phone?.trim(),
          });

          if (leads.length >= limit) break;
        }
      } catch {
        continue;
      }
    }
  } finally {
    await page.close();
  }

  return leads;
}

async function searchGoogleWeb(
  browser: Browser,
  city: string,
  state: string | undefined,
  query: string,
  limit: number
): Promise<FoundLead[]> {
  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  
  const leads: FoundLead[] = [];

  try {
    const location = state ? `${city}, ${state}` : city;
    const searchQuery = `${query} ${location} -yelp -healthgrades -zocdoc -vitals`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`;

    await page.goto(searchUrl, { timeout: 20000, waitUntil: "domcontentloaded" });
    await new Promise(r => setTimeout(r, 2000));

    // Get search results using evaluate
    const results = await page.$$('#search .g');

    for (const result of results) {
      try {
        const href = await result.$eval('a', el => el.getAttribute('href')).catch(() => null);
        const title = await result.$eval('h3', el => el.textContent).catch(() => null);

        if (href && title && href.startsWith('http') && !href.includes('google.com')) {
          const skipDomains = ['yelp.com', 'healthgrades.com', 'zocdoc.com', 'vitals.com', 'webmd.com', 'facebook.com', 'linkedin.com', 'youtube.com', 'wikipedia.org'];
          if (!skipDomains.some(d => href.includes(d))) {
            leads.push({
              name: title.trim(),
              website: href,
            });

            if (leads.length >= limit) break;
          }
        }
      } catch {
        continue;
      }
    }
  } finally {
    await page.close();
  }

  return leads;
}

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

    // Get browser
    const browser = await getBrowser();

    // Try Google Maps first, fall back to web search
    let leads = await searchGoogleMaps(browser, city, state, query, limit);
    
    if (leads.length < limit) {
      // Supplement with web search
      const webLeads = await searchGoogleWeb(browser, city, state, query, limit - leads.length);
      const existingUrls = new Set(leads.map(l => normalizeWebsiteUrl(l.website)));
      for (const lead of webLeads) {
        const normalized = normalizeWebsiteUrl(lead.website);
        if (!existingUrls.has(normalized)) {
          leads.push(lead);
          existingUrls.add(normalized);
        }
        if (leads.length >= limit) break;
      }
    }

    // Filter out duplicates against existing leads in DB
    const existingLeads = await prisma.lead.findMany({
      select: { websiteUrl: true },
    });
    const existingUrls = new Set(existingLeads.map(l => normalizeWebsiteUrl(l.websiteUrl)));

    const newLeads = leads.filter(l => !existingUrls.has(normalizeWebsiteUrl(l.website)));

    return NextResponse.json({
      found: leads.length,
      new: newLeads.length,
      duplicates: leads.length - newLeads.length,
      leads: newLeads,
      query: `${query} ${city}${state ? `, ${state}` : ''}`,
    });
  } catch (error) {
    console.error("Find error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

