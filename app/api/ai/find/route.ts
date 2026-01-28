import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { chromium, Browser } from "playwright";
import prisma from "@/lib/prisma";
import { normalizeWebsiteUrl } from "@/lib/normalize";

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
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
  });
  
  const page = await context.newPage();
  const leads: FoundLead[] = [];

  try {
    const location = state ? `${city}, ${state}` : city;
    const searchQuery = `${query} ${location}`;
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(searchQuery)}`;

    await page.goto(mapsUrl, { timeout: 30000, waitUntil: "networkidle" });
    
    // Wait for results to load
    await page.waitForTimeout(3000);

    // Scroll to load more results
    const resultsPanel = page.locator('[role="feed"]').first();
    for (let i = 0; i < 3; i++) {
      await resultsPanel.evaluate((el) => el.scrollBy(0, 500));
      await page.waitForTimeout(1000);
    }

    // Get all result items
    const items = await page.locator('[role="feed"] > div > div > a').all();
    
    for (const item of items.slice(0, limit * 2)) { // Get extra to filter
      try {
        // Click on the item to get details
        await item.click();
        await page.waitForTimeout(2000);

        // Extract business info
        const name = await page.locator('h1').first().textContent().catch(() => null);
        
        // Look for website link
        const websiteLink = await page.locator('a[data-item-id="authority"]').getAttribute('href').catch(() => null);
        
        // Get address
        const address = await page.locator('[data-item-id="address"] .fontBodyMedium').textContent().catch(() => null);
        
        // Get phone
        const phone = await page.locator('[data-item-id^="phone"] .fontBodyMedium').textContent().catch(() => null);

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
        // Skip this item and continue
        continue;
      }
    }
  } finally {
    await context.close();
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
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  
  const page = await context.newPage();
  const leads: FoundLead[] = [];

  try {
    const location = state ? `${city}, ${state}` : city;
    const searchQuery = `${query} ${location} -yelp -healthgrades -zocdoc -vitals`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&num=20`;

    await page.goto(searchUrl, { timeout: 20000, waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);

    // Get search results
    const results = await page.locator('#search .g').all();

    for (const result of results) {
      try {
        const linkEl = await result.locator('a').first();
        const href = await linkEl.getAttribute('href');
        const titleEl = await result.locator('h3').first();
        const title = await titleEl.textContent();

        if (href && title && href.startsWith('http') && !href.includes('google.com')) {
          // Filter out aggregator sites
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
    await context.close();
  }

  return leads;
}

export async function POST(request: NextRequest) {
  let browser: Browser | null = null;

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

    // Launch browser
    browser = await chromium.launch({ headless: true });

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
  } finally {
    if (browser) await browser.close();
  }
}

