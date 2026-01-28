import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { chromium } from "playwright";

type HealthCheck = {
  name: string;
  status: "pass" | "fail";
  message: string;
  durationMs?: number;
};

export async function GET() {
  const checks: HealthCheck[] = [];

  // 1. Database connection check
  const dbStart = Date.now();
  try {
    await prisma.lead.count();
    checks.push({
      name: "database",
      status: "pass",
      message: "SQLite database connected",
      durationMs: Date.now() - dbStart,
    });
  } catch (error) {
    checks.push({
      name: "database",
      status: "fail",
      message: error instanceof Error ? error.message : "Database connection failed",
      durationMs: Date.now() - dbStart,
    });
  }

  // 2. OpenAI API key check
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && openaiKey.length > 10 && openaiKey.startsWith("sk-")) {
    checks.push({
      name: "openai",
      status: "pass",
      message: `API key configured (${openaiKey.slice(0, 7)}...${openaiKey.slice(-4)})`,
    });
  } else if (openaiKey) {
    checks.push({
      name: "openai",
      status: "fail",
      message: "API key exists but appears invalid (should start with sk-)",
    });
  } else {
    checks.push({
      name: "openai",
      status: "fail",
      message: "OPENAI_API_KEY environment variable not set",
    });
  }

  // 3. Playwright check
  const pwStart = Date.now();
  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://example.com", { timeout: 10000, waitUntil: "domcontentloaded" });
    const title = await page.title();
    await browser.close();

    if (title.includes("Example")) {
      checks.push({
        name: "playwright",
        status: "pass",
        message: `Headless browser working (loaded example.com: "${title}")`,
        durationMs: Date.now() - pwStart,
      });
    } else {
      checks.push({
        name: "playwright",
        status: "fail",
        message: `Page loaded but unexpected title: "${title}"`,
        durationMs: Date.now() - pwStart,
      });
    }
  } catch (error) {
    checks.push({
      name: "playwright",
      status: "fail",
      message: error instanceof Error ? error.message : "Playwright test failed",
      durationMs: Date.now() - pwStart,
    });
  }

  const allPassed = checks.every((c) => c.status === "pass");

  return NextResponse.json(
    {
      status: allPassed ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: allPassed ? 200 : 503 }
  );
}

