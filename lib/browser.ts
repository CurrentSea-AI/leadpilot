import puppeteer, { Browser } from "puppeteer-core";

let browserInstance: Browser | null = null;

/**
 * Get a Puppeteer browser instance that works on Vercel
 */
export async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }

  const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isVercel) {
    // Running on Vercel/AWS Lambda - use @sparticuz/chromium
    const chromium = await import("@sparticuz/chromium");
    browserInstance = await puppeteer.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
      headless: true,
    });
  } else {
    // Running locally - try to find local Chrome
    const possiblePaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    ];

    let executablePath: string | undefined;
    const fs = await import("fs");
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        executablePath = p;
        break;
      }
    }

    browserInstance = await puppeteer.launch({
      executablePath,
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
  }

  return browserInstance;
}

/**
 * Take a screenshot and extract page content
 */
export async function captureWebsite(url: string): Promise<{
  screenshotBase64: string;
  pageContent: string;
  title: string;
}> {
  const browser = await getBrowser();
  const page = await browser.newPage();

  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1440, height: 900 });

    await page.goto(url, {
      timeout: 25000,
      waitUntil: "networkidle2",
    });

    // Wait for content to settle
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: "png",
      fullPage: false,
    });
    const screenshotBase64 = Buffer.from(screenshotBuffer).toString("base64");

    // Extract content
    const pageContent = await page.evaluate(() => document.body?.textContent || "");
    const title = await page.title();

    return { screenshotBase64, pageContent, title };
  } finally {
    await page.close();
  }
}

/**
 * Close browser (for cleanup)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
