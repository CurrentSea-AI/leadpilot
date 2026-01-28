"use client";

import { useState, useEffect } from "react";

type TestResult = {
  name: string;
  passed: boolean;
  message: string;
};

type DebugResponse = {
  status: "all_passed" | "some_failed";
  passed: number;
  failed: number;
  total: number;
  durationMs: number;
  results: TestResult[];
};

export default function DebugPage() {
  const [data, setData] = useState<DebugResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/debug");
      if (!res.ok) throw new Error("Failed to run tests");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runTests();
  }, []);

  // Group results by category
  const groupResults = (results: TestResult[]) => {
    const groups: Record<string, TestResult[]> = {};
    for (const r of results) {
      const category = r.name.split(":")[0] || "Other";
      if (!groups[category]) groups[category] = [];
      groups[category].push(r);
    }
    return groups;
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Debug Tests</h1>
        <button
          onClick={runTests}
          disabled={loading}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded disabled:opacity-50"
        >
          {loading ? "Running..." : "↻ Run Again"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {data && (
        <>
          {/* Summary */}
          <div
            className={`mb-6 p-4 rounded-lg border-2 ${
              data.status === "all_passed"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {data.status === "all_passed" ? "✅" : "❌"}
                </span>
                <div>
                  <div
                    className={`text-lg font-bold ${
                      data.status === "all_passed" ? "text-green-700" : "text-red-700"
                    }`}
                  >
                    {data.status === "all_passed"
                      ? "All Tests Passed"
                      : `${data.failed} Test${data.failed > 1 ? "s" : ""} Failed`}
                  </div>
                  <div className="text-sm text-gray-600">
                    {data.passed}/{data.total} passed in {data.durationMs}ms
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-mono">
                  <span className="text-green-600">{data.passed}</span>
                  <span className="text-gray-400"> / </span>
                  <span className={data.failed > 0 ? "text-red-600" : "text-gray-400"}>
                    {data.failed}
                  </span>
                </div>
                <div className="text-xs text-gray-500">passed / failed</div>
              </div>
            </div>
          </div>

          {/* Grouped results */}
          {Object.entries(groupResults(data.results)).map(([category, results]) => {
            const categoryPassed = results.filter((r) => r.passed).length;
            const categoryFailed = results.filter((r) => !r.passed).length;

            return (
              <div key={category} className="mb-6">
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  {category}
                  <span className="text-sm font-normal text-gray-500">
                    ({categoryPassed}/{results.length})
                  </span>
                  {categoryFailed > 0 && (
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                      {categoryFailed} failed
                    </span>
                  )}
                </h2>
                <div className="space-y-1">
                  {results.map((result, i) => (
                    <div
                      key={i}
                      className={`px-3 py-2 rounded text-sm flex items-start justify-between gap-4 ${
                        result.passed ? "bg-green-50" : "bg-red-50"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <span>{result.passed ? "✓" : "✗"}</span>
                        <span className={result.passed ? "text-gray-700" : "text-red-700"}>
                          {result.name.split(":").slice(1).join(":").trim() || result.name}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-mono shrink-0 ${
                          result.passed ? "text-gray-500" : "text-red-600"
                        }`}
                      >
                        {result.message.length > 60
                          ? result.message.slice(0, 60) + "..."
                          : result.message}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </>
      )}

      {loading && !data && (
        <div className="text-center py-12 text-gray-500">Running tests...</div>
      )}

      <div className="mt-8 text-center space-x-4">
        <a href="/health" className="text-sm text-blue-600 hover:underline">
          Health Check →
        </a>
        <a href="/leads" className="text-sm text-blue-600 hover:underline">
          Leads →
        </a>
      </div>
    </div>
  );
}

