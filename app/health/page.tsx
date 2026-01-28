"use client";

import { useState, useEffect } from "react";

type HealthCheck = {
  name: string;
  status: "pass" | "fail";
  message: string;
  durationMs?: number;
};

type HealthResponse = {
  status: "healthy" | "unhealthy";
  timestamp: string;
  checks: HealthCheck[];
};

const CHECK_LABELS: Record<string, { label: string; icon: string }> = {
  database: { label: "Database", icon: "🗄️" },
  openai: { label: "OpenAI API", icon: "🤖" },
  playwright: { label: "Playwright", icon: "🎭" },
};

export default function HealthPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runHealthCheck = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Health check failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runHealthCheck();
  }, []);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">System Health</h1>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="text-sm bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded disabled:opacity-50"
        >
          {loading ? "Checking..." : "↻ Refresh"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          <strong>Error:</strong> {error}
        </div>
      )}

      {health && (
        <>
          {/* Overall status */}
          <div
            className={`mb-8 p-4 rounded-lg border-2 ${
              health.status === "healthy"
                ? "bg-green-50 border-green-200"
                : "bg-red-50 border-red-200"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">
                {health.status === "healthy" ? "✅" : "❌"}
              </span>
              <div>
                <div
                  className={`text-lg font-bold ${
                    health.status === "healthy" ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {health.status === "healthy" ? "All Systems Operational" : "Issues Detected"}
                </div>
                <div className="text-sm text-gray-500">
                  Last checked: {new Date(health.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>

          {/* Individual checks */}
          <div className="space-y-4">
            {health.checks.map((check) => {
              const meta = CHECK_LABELS[check.name] || { label: check.name, icon: "🔧" };
              return (
                <div
                  key={check.name}
                  className={`p-4 rounded-lg border ${
                    check.status === "pass"
                      ? "bg-white border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {meta.label}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                              check.status === "pass"
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {check.status === "pass" ? "PASS" : "FAIL"}
                          </span>
                        </div>
                        <div
                          className={`text-sm mt-1 ${
                            check.status === "pass" ? "text-gray-600" : "text-red-600"
                          }`}
                        >
                          {check.message}
                        </div>
                      </div>
                    </div>
                    {check.durationMs !== undefined && (
                      <span className="text-xs text-gray-400">{check.durationMs}ms</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {loading && !health && (
        <div className="space-y-4">
          {["database", "openai", "playwright"].map((name) => {
            const meta = CHECK_LABELS[name];
            return (
              <div
                key={name}
                className="p-4 rounded-lg border bg-gray-50 border-gray-200 animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl opacity-50">{meta.icon}</span>
                  <div>
                    <div className="font-medium text-gray-400">{meta.label}</div>
                    <div className="text-sm text-gray-300 mt-1">Checking...</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-8 text-center">
        <a href="/leads" className="text-sm text-blue-600 hover:underline">
          ← Back to Leads
        </a>
      </div>
    </div>
  );
}

