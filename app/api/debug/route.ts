import { NextResponse } from "next/server";
import { runAllTests } from "@/lib/debug";

export async function GET() {
  const startTime = Date.now();
  const { passed, failed, results } = runAllTests();
  const durationMs = Date.now() - startTime;

  return NextResponse.json({
    status: failed === 0 ? "all_passed" : "some_failed",
    passed,
    failed,
    total: passed + failed,
    durationMs,
    results,
  });
}

