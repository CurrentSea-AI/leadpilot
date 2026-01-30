"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-indigo-500/20 rounded-full blur-[120px]" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-sm font-medium mb-8">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
              </span>
              AI-Powered Lead Generation
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Find Businesses That</span>
              <br />
              <span className="gradient-text">Need Your Services</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Discover companies with outdated websites in any city and niche. 
              AI identifies opportunities, generates personalized outreach, 
              and helps you close more redesign clients.
            </p>

            {/* Two Path CTAs */}
            <div className="max-w-2xl mx-auto mb-8">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Find Leads Path */}
                <Link
                  href="/auto"
                  className="group card p-6 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-4 group-hover:bg-indigo-500/30 transition-colors">
                    <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Find Leads by City</h3>
                  <p className="text-sm text-slate-400">
                    Enter a city and niche. AI finds businesses with outdated websites ready for a redesign.
                  </p>
                </Link>

                {/* Single Audit Path */}
                <Link
                  href="/assistant"
                  className="group card p-6 hover:border-indigo-500/50 transition-all text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4 group-hover:bg-purple-500/30 transition-colors">
                    <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">Audit a Specific Site</h3>
                  <p className="text-sm text-slate-400">
                    Have a prospect in mind? Audit their site and generate a personalized report.
                  </p>
                </Link>
              </div>
              <p className="text-sm text-slate-500 mt-4 text-center">
                Free to use · No credit card required
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div>
                <div className="text-3xl font-bold text-white">30s</div>
                <div className="text-sm text-slate-500">Analysis time</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">50+</div>
                <div className="text-sm text-slate-500">Check points</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">Free</div>
                <div className="text-sm text-slate-500">No credit card</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              How It Works
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              From cold leads to warm conversations in three steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              icon={<TargetIcon />}
              title="Pick a City & Niche"
              description="Choose any location and industry — dentists in Miami, restaurants in Austin, salons in LA."
            />
            <StepCard
              number="02"
              icon={<ScanIcon />}
              title="AI Finds Opportunities"
              description="We scrape Google, analyze each website, and identify businesses with outdated sites."
            />
            <StepCard
              number="03"
              icon={<ReportIcon />}
              title="Send & Close"
              description="Get personalized outreach and shareable reports. Just send the link and start conversations."
            />
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 bg-[#0a0a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Perfect For Any Industry
            </h2>
            <p className="text-slate-400">
              Audit websites in any niche with industry-specific insights
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: <MedicalIcon />, name: "Healthcare" },
              { icon: <LegalIcon />, name: "Legal" },
              { icon: <FoodIcon />, name: "Restaurants" },
              { icon: <FitnessIcon />, name: "Fitness" },
              { icon: <SalonIcon />, name: "Beauty" },
              { icon: <HomeIcon />, name: "Real Estate" },
              { icon: <ToolIcon />, name: "Services" },
              { icon: <StarIcon />, name: "Any Industry" },
            ].map((niche) => (
              <div
                key={niche.name}
                className="card text-center py-6 hover:border-indigo-500/30"
              >
                <div className="w-10 h-10 mx-auto mb-3 text-indigo-400">{niche.icon}</div>
                <div className="text-sm font-medium text-slate-300">{niche.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                Find the Leads That Actually Convert
              </h2>
              <p className="text-slate-400 mb-8">
                Stop cold emailing random businesses. Our AI identifies companies 
                with genuine website problems — the ones most likely to pay for 
                your services.
              </p>
              <ul className="space-y-4">
                {[
                  "Automated Google search scraping",
                  "AI-powered website scoring (0-100)",
                  "Identifies specific problems to pitch",
                  "Personalized email drafts generated",
                  "Shareable reports to send prospects",
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-3 text-slate-300">
                    <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 p-8">
              <div className="text-center mb-6">
                <div className="text-6xl font-bold gradient-text mb-2">73</div>
                <div className="text-slate-400">Design Score</div>
              </div>
              <div className="space-y-3">
                <FindingRow impact="critical" text="No online booking option" />
                <FindingRow impact="major" text="Phone not clickable on mobile" />
                <FindingRow impact="moderate" text="Missing trust signals" />
                <FindingRow impact="minor" text="Slow page load time" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#0a0a1a]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Audit Your First Website?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join thousands of professionals using LeadPilot to find opportunities and win new clients.
          </p>
          <div className="max-w-md mx-auto">
            <div className="flex gap-3">
              <input
                type="url"
                placeholder="Enter website URL..."
                className="flex-1 px-4 py-4 bg-[#0d0d1a] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value) {
                    router.push(`/assistant?url=${encodeURIComponent(e.currentTarget.value)}`);
                  }
                }}
              />
              <Link
                href="/assistant"
                className="btn-primary px-8 py-4 flex items-center gap-2"
              >
                Get Started
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="font-semibold text-white">LeadPilot</span>
              </div>
              <p className="text-sm text-slate-500">
                AI-powered website audits for professionals.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/auto" className="hover:text-white transition-colors">Auto Prospect</Link></li>
                <li><Link href="/assistant" className="hover:text-white transition-colors">Single Audit</Link></li>
                <li><Link href="/dashboard" className="hover:text-white transition-colors">Dashboard</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/about" className="hover:text-white transition-colors">About</Link></li>
                <li><Link href="/blog" className="hover:text-white transition-colors">Blog</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Partners */}
            <div>
              <h4 className="font-semibold text-white mb-4">Partners</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/advertise" className="hover:text-white transition-colors">Advertise</Link></li>
                <li><Link href="/affiliates" className="hover:text-white transition-colors">Affiliates</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/5">
            <div className="text-sm text-slate-500">
              © 2026 LeadPilot. All rights reserved.
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Step Card Component
function StepCard({ number, icon, title, description }: { number: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="card relative group">
      <div className="absolute -top-4 -left-4 text-5xl font-bold text-indigo-500/10">{number}</div>
      <div className="w-12 h-12 mb-4 text-indigo-400">{icon}</div>
      <h3 className="text-xl font-semibold text-white mb-2">{title}</h3>
      <p className="text-slate-400">{description}</p>
    </div>
  );
}

function FindingRow({ impact, text }: { impact: "critical" | "major" | "moderate" | "minor"; text: string }) {
  const colors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    major: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    moderate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    minor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${colors[impact]}`}>
      <span className="text-xs font-medium uppercase">{impact}</span>
      <span className="text-slate-300 text-sm">{text}</span>
    </div>
  );
}

// SVG Icon Components
function TargetIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

function ReportIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M9 12h6M9 16h6M17 21H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function MedicalIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 6v12M6 12h12" />
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}

function LegalIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 6l9-3 9 3M3 6v12l9 3 9-3V6M3 6l9 3 9-3M12 9v12" />
    </svg>
  );
}

function FoodIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 3v18M4 9h16M6 3c0 3.314 2.686 6 6 6s6-2.686 6-6" />
    </svg>
  );
}

function FitnessIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M4 12h2M18 12h2M6 8v8M18 8v8M8 10v4h8v-4H8z" />
    </svg>
  );
}

function SalonIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <circle cx="12" cy="8" r="5" />
      <path d="M5 21c0-4 3-7 7-7s7 3 7 7" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 12l9-9 9 9M5 10v10a1 1 0 001 1h3v-6h6v6h3a1 1 0 001-1V10" />
    </svg>
  );
}

function ToolIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}
