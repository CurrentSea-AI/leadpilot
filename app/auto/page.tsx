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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-sm font-medium mb-6">
            🗺️ Google Maps Lead Finder
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

        {/* HOW TO SPOT BAD WEBSITES - Before You Audit */}
        <div className="card p-8 bg-gradient-to-br from-red-500/10 to-orange-500/10 border-red-500/20 mb-8">
          <h3 className="text-xl font-bold text-red-300 mb-2">🎯 How to Spot BAD Websites (Before Auditing)</h3>
          <p className="text-slate-400 text-sm mb-6">Save time! Look for these visual cues on Google Maps BEFORE you audit:</p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Red Flags = GOOD Prospects */}
            <div className="bg-red-500/10 rounded-xl p-5 border border-red-500/20">
              <div className="text-lg font-bold text-red-400 mb-3">🔥 AUDIT THESE (Bad = Good Prospect)</div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 text-red-200/80">
                  <span className="text-red-400 shrink-0">✓</span>
                  <span><strong>No photos</strong> or blurry/old business photos on Maps</span>
                </li>
                <li className="flex items-start gap-2 text-red-200/80">
                  <span className="text-red-400 shrink-0">✓</span>
                  <span><strong>Website looks dated</strong> when you click through</span>
                </li>
                <li className="flex items-start gap-2 text-red-200/80">
                  <span className="text-red-400 shrink-0">✓</span>
                  <span>URL ends in <strong>.webs.com, .wix.com, godaddysites.com</strong></span>
                </li>
                <li className="flex items-start gap-2 text-red-200/80">
                  <span className="text-red-400 shrink-0">✓</span>
                  <span><strong>3-4 star reviews</strong> (established but struggling)</span>
                </li>
                <li className="flex items-start gap-2 text-red-200/80">
                  <span className="text-red-400 shrink-0">✓</span>
                  <span>Website has <strong>flash animations, tiny text, cluttered layout</strong></span>
                </li>
                <li className="flex items-start gap-2 text-red-200/80">
                  <span className="text-red-400 shrink-0">✓</span>
                  <span><strong>Copyright 2018</strong> or older in footer</span>
                </li>
                <li className="flex items-start gap-2 text-red-200/80">
                  <span className="text-red-400 shrink-0">✓</span>
                  <span>No <strong>HTTPS</strong> (shows &quot;Not Secure&quot;)</span>
                </li>
              </ul>
            </div>

            {/* Green Flags = Skip */}
            <div className="bg-slate-500/10 rounded-xl p-5 border border-slate-500/20">
              <div className="text-lg font-bold text-slate-400 mb-3">⏭️ SKIP THESE (Already Good)</div>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2 text-slate-300/80">
                  <span className="text-slate-500 shrink-0">✗</span>
                  <span>Modern, clean website design</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300/80">
                  <span className="text-slate-500 shrink-0">✗</span>
                  <span>Professional photos throughout</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300/80">
                  <span className="text-slate-500 shrink-0">✗</span>
                  <span>Has online booking/scheduling</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300/80">
                  <span className="text-slate-500 shrink-0">✗</span>
                  <span>Mobile-responsive (looks good on phone)</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300/80">
                  <span className="text-slate-500 shrink-0">✗</span>
                  <span>Built with Squarespace, Webflow, or custom</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300/80">
                  <span className="text-slate-500 shrink-0">✗</span>
                  <span>Copyright 2024/2025/2026 in footer</span>
                </li>
                <li className="flex items-start gap-2 text-slate-300/80">
                  <span className="text-slate-500 shrink-0">✗</span>
                  <span>Part of a large chain/franchise</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* What the AI Detects */}
        <div className="card p-8 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border-purple-500/20 mb-8">
          <h3 className="text-xl font-bold text-purple-300 mb-4">🤖 What LeadPilot AI Detects (After You Audit)</h3>
          <p className="text-slate-400 text-sm mb-6">When you audit a URL, the AI automatically scores it and tells you:</p>
          
          <div className="grid md:grid-cols-4 gap-4">
            <div className="bg-red-500/20 rounded-lg p-4 border border-red-500/30 text-center">
              <div className="text-2xl mb-1">🔥</div>
              <div className="text-red-400 font-bold">HOT LEAD</div>
              <div className="text-xs text-slate-400">9-10/10 Score</div>
              <div className="text-xs text-red-200/60 mt-2">Terrible site + established business</div>
            </div>
            <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30 text-center">
              <div className="text-2xl mb-1">✅</div>
              <div className="text-green-400 font-bold">WORTH IT</div>
              <div className="text-xs text-slate-400">7-8/10 Score</div>
              <div className="text-xs text-green-200/60 mt-2">Outdated site + decent business</div>
            </div>
            <div className="bg-yellow-500/20 rounded-lg p-4 border border-yellow-500/30 text-center">
              <div className="text-2xl mb-1">🤔</div>
              <div className="text-yellow-400 font-bold">MAYBE</div>
              <div className="text-xs text-slate-400">5-6/10 Score</div>
              <div className="text-xs text-yellow-200/60 mt-2">Mediocre site or unclear</div>
            </div>
            <div className="bg-slate-500/20 rounded-lg p-4 border border-slate-500/30 text-center">
              <div className="text-2xl mb-1">⏭️</div>
              <div className="text-slate-400 font-bold">SKIP</div>
              <div className="text-xs text-slate-400">1-4/10 Score</div>
              <div className="text-xs text-slate-200/60 mt-2">Good website or dead business</div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-purple-500/20">
            <div className="text-sm text-purple-300 font-medium mb-2">🚩 AI Detects Red Flags Like:</div>
            <div className="flex flex-wrap gap-2">
              {["Copyright 2018", "No HTTPS", "Flash content", "Not mobile-friendly", "Broken images", "GoDaddy builder", "No online booking", "Missing trust signals"].map((flag) => (
                <span key={flag} className="px-2 py-1 bg-red-500/10 text-red-300 text-xs rounded-full border border-red-500/20">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="card p-8 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border-amber-500/20">
          <h3 className="text-xl font-bold text-amber-300 mb-4">💡 Pro Tips for High Close Rates</h3>
          <ul className="space-y-3 text-amber-200/80">
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span><strong className="text-amber-200">Medical offices, dentists, and law firms</strong> have the highest close rates</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span>Look for businesses that have been open <strong className="text-amber-200">5+ years</strong> - they have money but outdated sites</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span>Skip big chains - focus on <strong className="text-amber-200">independent local businesses</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-400">✓</span>
              <span>Each audit costs ~$0.05-0.10 - <strong className="text-amber-200">pre-screen visually first!</strong></span>
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
