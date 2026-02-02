/**
 * Simple website capture using fetch (works on Vercel without browser)
 */
export async function captureWebsite(url: string): Promise<{
  screenshotBase64: string;
  pageContent: string;
  title: string;
}> {
  console.log(`[captureWebsite] Starting capture for: ${url}`);
  
  try {
    // Fetch the page HTML with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Comprehensive browser-like headers to avoid blocking
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
        "Pragma": "no-cache",
        "Sec-Ch-Ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"macOS"',
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    
    clearTimeout(timeout);

    console.log(`[captureWebsite] Response status: ${response.status}`);
    
    if (!response.ok) {
      throw new Error(`Website returned HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    console.log(`[captureWebsite] Fetched ${html.length} bytes of HTML`);

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

    console.log(`[captureWebsite] Successfully captured: ${title}`);
    return { screenshotBase64, pageContent, title };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[captureWebsite] Error: ${message}`);
    
    if (message.includes("abort")) {
      throw new Error(`Website took too long to respond (30s timeout)`);
    }
    
    throw new Error(`Could not access website: ${message}`);
  }
}

