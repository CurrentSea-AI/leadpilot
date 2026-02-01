"use client";

import { useState } from "react";
import Link from "next/link";

const NICHES = [
  { value: "medical_office", label: "Medical Office", icon: "🏥", query: "medical+offices" },
  { value: "dental_practice", label: "Dental Practice", icon: "🦷", query: "dental+practice" },
  { value: "law_firm", label: "Law Firm", icon: "⚖️", query: "law+firm" },
  { value: "restaurant", label: "Restaurant", icon: "🍽️", query: "restaurant" },
  { value: "gym_fitness", label: "Gym & Fitness", icon: "💪", query: "gym+fitness" },
  { value: "salon_spa", label: "Salon & Spa", icon: "💇", query: "salon+spa" },
  { value: "real_estate", label: "Real Estate", icon: "🏠", query: "real+estate+agency" },
  { value: "home_services", label: "Home Services", icon: "🔧", query: "home+services" },
  { value: "pet_services", label: "Pet Services", icon: "🐕", query: "pet+grooming+vet" },
  { value: "photographer", label: "Photographer", icon: "📸", query: "photographer" },
  { value: "contractor", label: "Contractor", icon: "🏗️", query: "contractor" },
  { value: "accounting", label: "Accounting Firm", icon: "📊", query: "accounting+firm" },
];

export default function AutoPage() {
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [niche, setNiche] = useState("medical_office");
  const [customQuery, setCustomQuery] = useState("");

  const selectedNiche = NICHES.find(n => n.value === niche);
  const searchQuery = customQuery || selectedNiche?.query || "business";
  
  const googleMapsUrl = city 
    ? `https://www.google.com/maps/search/${searchQuery}+${encodeURIComponent(city)}${state ? `+${encodeURIComponent(state)}` : ""}`
    : "";

  return (
    <div className="min-h-[calc(100vh-4rem)]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-6">
            🎯 Lead Finder
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Find <span className="gradient-text">Prospects</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto">
            Search for businesses that need website redesigns. Copy their website URL and audit with AI.
          </p>
        </div>

        {/* Step 1: Configure Search */}
        <div className="card p-8 mb-8">
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
              placeholder={selectedNiche?.label}
              className="input"
            />
            <p className="text-xs text-slate-500 mt-1">Leave empty to use the selected niche</p>
          </div>

          {/* Location */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-300 mb-2">City *</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Austin"
                className="input"
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
              />
            </div>
          </div>

          {/* Open Google Maps Button */}
          {city.trim() ? (
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
            >
              🗺️ Open Google Maps Search
            </a>
          ) : (
            <button
              disabled
              className="w-full btn-primary py-4 text-lg opacity-50 cursor-not-allowed"
            >
              Enter a city to search
            </button>
          )}
        </div>

        {/* Step 2: Instructions */}
        <div className="card p-8 mb-8 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center text-sm font-bold">2</span>
            Copy Website URLs from Google Maps
          </h2>
          
          <div className="space-y-4 text-slate-300">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">A</div>
              <div>
                <div className="font-medium text-white">Click on a business in Google Maps</div>
                <div className="text-sm text-slate-400">Look for ones with outdated websites</div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">B</div>
              <div>
                <div className="font-medium text-white">Find their website link in the business details</div>
                <div className="text-sm text-slate-400">Look for the globe 🌐 icon or &quot;Website&quot; button</div>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold shrink-0">C</div>
              <div>
                <div className="font-medium text-white">Copy the website URL</div>
                <div className="text-sm text-slate-400">Right-click → Copy link address</div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Audit */}
        <div className="card p-8 mb-8 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center text-sm font-bold">3</span>
            Audit with AI
          </h2>
          
          <p className="text-slate-300 mb-6">
            Paste the website URL into the Single URL page. LeadPilot will analyze the website, 
            generate a professional audit report, and create personalized outreach emails.
          </p>
          
          <Link
            href="/assistant"
            className="w-full btn-primary py-4 text-lg flex items-center justify-center gap-2"
          >
            🚀 Go to Single URL Audit
          </Link>
        </div>

        {/* Pro Tips */}
        <div className="card p-8 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <h3 className="text-xl font-bold text-amber-300 mb-4">💡 Pro Tips for Finding Good Prospects</h3>
          <ul className="space-y-3 text-amber-200/80">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span>Look for businesses with <strong className="text-amber-200">no website listed</strong> or very old-looking sites</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span>Skip businesses using Wix/Squarespace - they usually do it themselves</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span>Focus on practices with <strong className="text-amber-200">3-5 star reviews</strong> - they&apos;re established but need help</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span>Medical offices, dentists, and law firms have the highest close rates</span>
            </li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="mt-8 flex flex-col sm:flex-row gap-4">
          <Link 
            href="/assistant" 
            className="flex-1 card p-6 text-center hover:border-indigo-500/30 transition-colors"
          >
            <div className="text-3xl mb-2">🎯</div>
            <div className="font-semibold text-white">Single URL</div>
            <div className="text-sm text-slate-400">Audit one website</div>
          </Link>
          <Link 
            href="/leads" 
            className="flex-1 card p-6 text-center hover:border-indigo-500/30 transition-colors"
          >
            <div className="text-3xl mb-2">📊</div>
            <div className="font-semibold text-white">Lead Dashboard</div>
            <div className="text-sm text-slate-400">View all your leads</div>
          </Link>
          <Link 
            href="/dashboard" 
            className="flex-1 card p-6 text-center hover:border-indigo-500/30 transition-colors"
          >
            <div className="text-3xl mb-2">📈</div>
            <div className="font-semibold text-white">Stats</div>
            <div className="text-sm text-slate-400">Track your progress</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
