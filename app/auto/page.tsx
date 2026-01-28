"use client";

import { useState } from "react";
import Link from "next/link";

type FoundLead = {
  name: string;
  website: string;
  address?: string;
  phone?: string;
};

type ProcessedResult = {
  website: string;
  status: "success" | "error" | "duplicate";
  name?: string;
  designScore?: number;
  seoScore?: number;
  reportUrl?: string;
  error?: string;
};

type Step = "idle" | "finding" | "found" | "processing" | "done";

const NICHES = [
  { value: "medical_office", label: "Medical Office", icon: "🏥" },
  { value: "dental_practice", label: "Dental Practice", icon: "🦷" },
  { value: "law_firm", label: "Law Firm", icon: "⚖️" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️" },
  { value: "gym_fitness", label: "Gym & Fitness", icon: "💪" },
  { value: "salon_spa", label: "Salon & Spa", icon: "💇" },
  { value: "real_estate", label: "Real Estate", icon: "🏠" },
  { value: "home_services", label: "Home Services", icon: "🔧" },
  { value: "pet_services", label: "Pet Services", icon: "🐕" },
  { value: "photographer", label: "Photographer", icon: "📸" },
  { value: "contractor", label: "Contractor", icon: "🏗️" },
  { value: "accounting", label: "Accounting Firm", icon: "📊" },
];

export default function AutoPage() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [count, setCount] = useState(5);
  const [niche, setNiche] = useState("medical_office");
  const [customQuery, setCustomQuery] = useState("");
  
  const [step, setStep] = useState<Step>("idle");
  const [foundLeads, setFoundLeads] = useState<FoundLead[]>([]);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const selectedNiche = NICHES.find(n => n.value === niche);
  const searchQuery = customQuery || selectedNiche?.label || niche;

  const findLeads = async () => {
    if (!city.trim()) return;
    
    setStep("finding");
    setError(null);
    setFoundLeads([]);
    setResults([]);

    try {
      const res = await fetch("/api/ai/find", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          city, 
          state, 
          query: searchQuery,
          niche,
          limit: count 
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to find leads");
        setStep("idle");
        return;
      }

      if (data.leads.length === 0) {
        setError("No new leads found. Try a different city or search term.");
        setStep("idle");
        return;
      }

      setFoundLeads(data.leads);
      setStep("found");
    } catch {
      setError("Network error. Please try again.");
      setStep("idle");
    }
  };

  const processAll = async () => {
    if (foundLeads.length === 0) return;

    setStep("processing");
    setResults([]);

    try {
      const res = await fetch("/api/ai/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: foundLeads.map(l => ({
            name: l.name,
            website: l.website,
            city: `${city}${state ? `, ${state}` : ""}`,
            niche,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Processing failed");
        setStep("found");
        return;
      }

      setResults(data.results);
      setStep("done");
    } catch {
      setError("Network error during processing.");
      setStep("found");
    }
  };

  const copyAllReportLinks = async () => {
    const successResults = results.filter(r => r.status === "success" && r.reportUrl);
    const links = successResults.map(r => `${window.location.origin}${r.reportUrl}`).join("\n");
    await navigator.clipboard.writeText(links);
  };

  const reset = () => {
    setStep("idle");
    setFoundLeads([]);
    setResults([]);
    setError(null);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            Fully Automated
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Auto <span className="gradient-text">Prospector</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Enter a city and niche. AI finds prospects, audits websites, and generates reports. Zero manual work.
          </p>
        </div>

        {/* Step 1: Config */}
        {(step === "idle" || step === "finding") && (
          <div className="card p-8 mb-8 animate-fade-in">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-sm font-bold">1</span>
              Choose Your Target
            </h2>
            
            {/* Niche Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-3">Business Type</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {NICHES.map((n) => (
                  <button
                    key={n.value}
                    onClick={() => setNiche(n.value)}
                    disabled={step === "finding"}
                    className={`p-3 rounded-xl border text-center transition-all ${
                      niche === n.value
                        ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                        : "bg-[#1a1a2e] border-white/5 text-slate-400 hover:border-white/10 hover:text-white"
                    }`}
                  >
                    <div className="text-2xl mb-1">{n.icon}</div>
                    <div className="text-xs font-medium truncate">{n.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Query */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Custom Search (optional)
              </label>
              <input
                type="text"
                value={customQuery}
                onChange={(e) => setCustomQuery(e.target.value)}
                placeholder={`Or search: "${selectedNiche?.label}"`}
                className="input"
                disabled={step === "finding"}
              />
              <p className="text-xs text-slate-500 mt-1">Leave empty to use the selected niche</p>
            </div>

            {/* Location */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">City *</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Austin"
                  className="input"
                  disabled={step === "finding"}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="TX"
                  className="input"
                  disabled={step === "finding"}
                />
              </div>
            </div>

            {/* Count */}
            <div className="mb-8">
              <label className="block text-sm font-medium text-slate-300 mb-2">How Many Prospects?</label>
              <div className="flex gap-2">
                {[3, 5, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    disabled={step === "finding"}
                    className={`flex-1 py-3 rounded-xl font-medium transition-all ${
                      count === n
                        ? "bg-indigo-500 text-white"
                        : "bg-[#1a1a2e] text-slate-400 hover:text-white border border-white/5"
                    }`}
                  >
                    {n} prospects
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={findLeads}
              disabled={step === "finding" || !city.trim()}
              className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === "finding" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Finding {searchQuery} in {city}...
                </span>
              ) : (
                <>🔍 Find Prospects</>
              )}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400">
                {error}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Review */}
        {(step === "found" || step === "processing") && (
          <div className="card p-8 mb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">2</span>
                Found {foundLeads.length} Prospects
              </h2>
              <button onClick={reset} className="text-sm text-slate-400 hover:text-white transition-colors">
                ← Start Over
              </button>
            </div>

            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {foundLeads.map((lead, i) => (
                <div key={i} className="flex items-center justify-between py-3 px-4 bg-[#1a1a2e] rounded-lg border border-white/5">
                  <div>
                    <div className="font-medium text-white">{lead.name}</div>
                    <div className="text-sm text-slate-500">{lead.website.replace(/^https?:\/\//, "")}</div>
                  </div>
                  <span className="text-green-400">✓</span>
                </div>
              ))}
            </div>

            <button
              onClick={processAll}
              disabled={step === "processing"}
              className="w-full btn-primary py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {step === "processing" ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI Analyzing... (2-3 min)
                </span>
              ) : (
                <>🚀 Process All with AI</>
              )}
            </button>

            <p className="text-center text-sm text-slate-500 mt-3">
              AI will audit each website, generate personalized emails, and create shareable reports.
            </p>
          </div>
        )}

        {/* Step 3: Results */}
        {step === "done" && (
          <div className="card p-8 mb-8 animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">✓</span>
                {results.filter(r => r.status === "success").length} Reports Ready
              </h2>
              <button onClick={reset} className="text-sm text-slate-400 hover:text-white transition-colors">
                ← Process More
              </button>
            </div>

            {/* Actions */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={copyAllReportLinks}
                className="flex-1 py-3 bg-green-500 text-white font-medium rounded-xl hover:bg-green-600 transition-colors"
              >
                📋 Copy All Report Links
              </button>
              <Link
                href="/leads"
                className="flex-1 py-3 bg-[#1a1a2e] text-white font-medium rounded-xl hover:bg-[#252540] transition-colors text-center border border-white/5"
              >
                View in Dashboard
              </Link>
            </div>

            {/* Results */}
            <div className="space-y-3">
              {results.map((result, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-4 px-4 rounded-lg border ${
                    result.status === "success" ? "bg-green-500/10 border-green-500/20" :
                    result.status === "duplicate" ? "bg-yellow-500/10 border-yellow-500/20" :
                    "bg-red-500/10 border-red-500/20"
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-white">{result.name || result.website}</div>
                    <div className="text-sm text-slate-500">{result.website.replace(/^https?:\/\//, "")}</div>
                  </div>
                  
                  {result.status === "success" && (
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`text-lg font-bold ${
                          (result.designScore || 0) >= 70 ? "text-green-400" :
                          (result.designScore || 0) >= 50 ? "text-yellow-400" : "text-red-400"
                        }`}>
                          {result.designScore}
                        </div>
                        <div className="text-xs text-slate-500">Score</div>
                      </div>
                      <Link
                        href={result.reportUrl!}
                        target="_blank"
                        className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-600 transition-colors"
                      >
                        View →
                      </Link>
                    </div>
                  )}
                  
                  {result.status === "duplicate" && (
                    <div className="flex items-center gap-3">
                      <span className="text-yellow-400 text-sm">Already exists</span>
                      {result.reportUrl && (
                        <Link href={result.reportUrl} target="_blank" className="text-sm text-yellow-400 hover:underline">
                          View →
                        </Link>
                      )}
                    </div>
                  )}
                  
                  {result.status === "error" && (
                    <span className="text-red-400 text-sm">{result.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 p-8">
          <h3 className="text-xl font-bold text-white mb-6">How It Works</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl mb-3">🔍</div>
              <div className="font-semibold text-white mb-1">Find</div>
              <div className="text-sm text-slate-400">Searches Google for businesses in your target area</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">🤖</div>
              <div className="font-semibold text-white mb-1">Analyze</div>
              <div className="text-sm text-slate-400">AI audits design, SEO, and extracts business info</div>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-3">📄</div>
              <div className="font-semibold text-white mb-1">Report</div>
              <div className="text-sm text-slate-400">Creates shareable reports + personalized emails</div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10 text-center text-sm text-slate-400">
            💡 Cost: ~$0.10-0.15 per prospect (OpenAI API)
          </div>
        </div>
      </div>
    </div>
  );
}
