"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ProcessResult = {
  status: "success" | "already_processed";
  leadId: string;
  name: string;
  websiteUrl?: string;
  designScore: number;
  seoScore?: number;
  overallScore?: number;
  summary?: string;
  reportUrl: string | null;
  reportId?: string;
  emailPreview?: {
    owner: string;
    frontDesk: string;
  };
  practiceInfo?: {
    type: string;
    specialties: string[];
    location: string | null;
  };
  message?: string;
};

type HistoryItem = {
  id: string;
  url: string;
  name: string;
  score: number;
  reportUrl: string;
  timestamp: Date;
};

export default function AssistantPage() {
  const [url, setUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<ProcessResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [hasApiKey, setHasApiKey] = useState(false);

  // Check for API key on mount
  useEffect(() => {
    const key = localStorage.getItem("openai_api_key");
    setHasApiKey(!!key);
  }, []);

  const processWebsite = async () => {
    if (!url.trim()) return;

    // Get user's API key
    const userApiKey = localStorage.getItem("openai_api_key");
    if (!userApiKey) {
      setError("Please add your OpenAI API key in Settings first");
      return;
    }

    setProcessing(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/ai/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ websiteUrl: url, apiKey: userApiKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Processing failed");
        return;
      }

      setResult(data);

      // Add to history
      if (data.reportUrl) {
        setHistory((prev) => [
          {
            id: data.leadId,
            url: data.websiteUrl || url,
            name: data.name,
            score: data.overallScore || data.designScore,
            reportUrl: data.reportUrl,
            timestamp: new Date(),
          },
          ...prev.slice(0, 9), // Keep last 10
        ]);
      }

      setUrl("");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const copyReportUrl = async (reportUrl: string) => {
    const fullUrl = `${window.location.origin}${reportUrl}`;
    await navigator.clipboard.writeText(fullUrl);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
            ✨ Single URL Mode
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Quick <span className="gradient-text">Audit</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Paste a website URL → Get a complete audit, personalized outreach, and shareable report.
          </p>
        </div>

        {/* Main Input */}
        <div className="card p-8 mb-8">
          <div className="flex gap-3">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !processing && processWebsite()}
              placeholder="https://example-business.com"
              className="input flex-1 text-lg"
              disabled={processing}
            />
            <button
              onClick={processWebsite}
              disabled={processing || !url.trim()}
              className="btn-primary px-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                "🚀 Audit"
              )}
            </button>
          </div>

          {processing && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-3 rounded-lg">
                <div className="animate-pulse">🔍</div>
                <div className="text-sm">
                  <div className="font-medium">AI is analyzing the website...</div>
                  <div className="text-indigo-400">This takes about 30-60 seconds</div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
              <div className="font-medium">❌ Error</div>
              <div className="text-sm">{error}</div>
            </div>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="card p-8 mb-8 animate-slide-up">
            <div className="flex items-start justify-between mb-6">
              <div>
                <div className="text-sm text-slate-500 mb-1">
                  {result.status === "already_processed" ? "Already Processed" : "New Audit Complete"}
                </div>
                <h2 className="text-2xl font-bold text-white">{result.name}</h2>
                {result.practiceInfo && (
                  <div className="text-sm text-slate-400 mt-1">
                    {result.practiceInfo.type}
                    {result.practiceInfo.location && ` • ${result.practiceInfo.location}`}
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className={`text-4xl font-bold ${
                  (result.overallScore || result.designScore) >= 70 ? "text-green-400" :
                  (result.overallScore || result.designScore) >= 50 ? "text-yellow-400" : "text-red-400"
                }`}>
                  {result.overallScore || result.designScore}
                </div>
                <div className="text-sm text-slate-500">Overall Score</div>
              </div>
            </div>

            {result.summary && (
              <div className="bg-[#1a1a2e] rounded-lg p-4 mb-6 border border-white/5">
                <div className="text-sm font-medium text-slate-300 mb-1">AI Summary</div>
                <div className="text-slate-400">{result.summary}</div>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span>🎨</span>
                  <span className="text-sm font-medium text-purple-300">Design Score</span>
                </div>
                <div className="text-3xl font-bold text-purple-400">{result.designScore}</div>
              </div>
              {result.seoScore !== undefined && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span>🔍</span>
                    <span className="text-sm font-medium text-blue-300">SEO Score</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-400">{result.seoScore}</div>
                </div>
              )}
            </div>

            {/* Report Link - THE MAIN CTA */}
            {result.reportUrl && (
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold mb-1">📄 Shareable Report Ready!</div>
                    <div className="text-green-100 text-sm">
                      Send this link to the prospect
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyReportUrl(result.reportUrl!)}
                      className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition-colors"
                    >
                      📋 Copy
                    </button>
                    <Link
                      href={result.reportUrl}
                      target="_blank"
                      className="px-4 py-2 bg-white text-green-600 rounded-lg font-medium hover:bg-green-50 transition-colors"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Email Preview */}
            {result.emailPreview && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="text-sm font-medium text-slate-300 mb-3">📧 Personalized Email Generated</div>
                <div className="bg-[#1a1a2e] rounded-lg p-4 text-sm text-slate-400 font-mono whitespace-pre-wrap border border-white/5">
                  {result.emailPreview.owner}
                </div>
                <Link
                  href={`/leads`}
                  className="inline-block mt-3 text-sm text-indigo-400 hover:text-indigo-300"
                >
                  View full emails in Lead Dashboard →
                </Link>
              </div>
            )}
          </div>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="card p-6 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Recent Reports</h3>
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
                >
                  <div>
                    <div className="font-medium text-white">{item.name}</div>
                    <div className="text-sm text-slate-500">{item.url.replace(/^https?:\/\//, "")}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-lg font-bold ${
                      item.score >= 70 ? "text-green-400" :
                      item.score >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {item.score}
                    </div>
                    <button
                      onClick={() => copyReportUrl(item.reportUrl)}
                      className="text-sm text-slate-500 hover:text-white transition-colors"
                    >
                      📋
                    </button>
                    <Link
                      href={item.reportUrl}
                      target="_blank"
                      className="text-sm text-indigo-400 hover:text-indigo-300"
                    >
                      View →
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="card bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20 p-6">
          <h3 className="text-lg font-semibold text-amber-300 mb-3">📋 Quick Workflow</h3>
          <ol className="list-decimal list-inside space-y-2 text-amber-200/80">
            <li><strong className="text-amber-200">Find a business</strong> — Google Maps, Yelp, or any directory</li>
            <li><strong className="text-amber-200">Paste URL above</strong> — AI analyzes design, SEO, and generates emails</li>
            <li><strong className="text-amber-200">Send report link</strong> — Copy the shareable report URL to the prospect</li>
            <li><strong className="text-amber-200">Follow up</strong> — Use the personalized email in Leads Dashboard</li>
          </ol>
          <div className="mt-4 pt-4 border-t border-amber-500/20 text-sm text-amber-300/60">
            💡 Each analysis costs approximately $0.05-0.10 in OpenAI API credits
          </div>
        </div>
      </div>
    </div>
  );
}
