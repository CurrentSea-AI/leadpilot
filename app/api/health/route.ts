import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { captureWebsite } from "@/lib/browser";

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
      message: "PostgreSQL database connected",
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
    // When using BYOK, no server-side key is expected
    checks.push({
      name: "openai",
      status: "pass",
      message: "BYOK mode - users provide their own API keys",
    });
  }

  // 3. Website fetch check (replaces browser check)
  const fetchStart = Date.now();
  try {
    const result = await captureWebsite("https://example.com");
    if (result.title.includes("Example")) {
      checks.push({
        name: "fetch",
        status: "pass",
        message: `Website fetching works (loaded example.com: "${result.title}")`,
        durationMs: Date.now() - fetchStart,
      });
    } else {
      checks.push({
        name: "fetch",
        status: "pass",
        message: `Fetched page with title: "${result.title}"`,
        durationMs: Date.now() - fetchStart,
      });
    }
  } catch (error) {
    checks.push({
      name: "fetch",
      status: "fail",
      message: error instanceof Error ? error.message : "Fetch test failed",
      durationMs: Date.now() - fetchStart,
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
