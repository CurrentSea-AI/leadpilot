/**
 * Simple website capture using fetch (works on Vercel without browser)
 */
export async function captureWebsite(url: string): Promise<{
  screenshotBase64: string;
  pageContent: string;
  title: string;
}> {
  try {
    // Fetch the page HTML
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "Unknown";

    // Extract text content (simple HTML stripping)
    const pageContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 15000);

    // No screenshot available - return empty string
    // The AI will analyze based on content only
    const screenshotBase64 = "";

    return { screenshotBase64, pageContent, title };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to capture website: ${message}`);
  }
}

/**
 * Placeholder for browser functions (not needed with fetch approach)
 */
export async function getBrowser(): Promise<null> {
  return null;
}

export async function closeBrowser(): Promise<void> {
  // No-op
}
