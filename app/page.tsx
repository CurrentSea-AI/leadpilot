import Link from "next/link";

export default function LandingPage() {
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
              AI-Powered Prospecting
            </div>

            {/* Headline */}
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
              <span className="text-white">Find Clients on</span>
              <br />
              <span className="gradient-text">Complete Autopilot</span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
              Enter a city and niche. AI finds businesses, audits their websites, 
              generates personalized outreach, and creates shareable reports. 
              You just send the links.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link
                href="/sign-up"
                className="btn-primary text-lg px-8 py-4 flex items-center gap-2"
              >
                Start Free Trial
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                href="/auto"
                className="btn-secondary text-lg px-8 py-4"
              >
                Try Demo
              </Link>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-lg mx-auto">
              <div>
                <div className="text-3xl font-bold text-white">30s</div>
                <div className="text-sm text-slate-500">Per prospect</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">95%</div>
                <div className="text-sm text-slate-500">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-white">$0.10</div>
                <div className="text-sm text-slate-500">Per audit</div>
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
              Three Steps to New Clients
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Our AI handles the entire prospecting workflow from start to finish
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              number="01"
              icon="🎯"
              title="Choose Your Target"
              description="Select any city and business niche — medical offices, restaurants, law firms, gyms, salons, and more."
            />
            <StepCard
              number="02"
              icon="🤖"
              title="AI Does the Work"
              description="Our AI finds businesses, captures screenshots, analyzes design & SEO, and writes personalized outreach."
            />
            <StepCard
              number="03"
              icon="📤"
              title="Send & Close"
              description="Get shareable reports and ready-to-send emails. Just copy, paste, and start conversations."
            />
          </div>
        </div>
      </section>

      {/* Niches */}
      <section className="py-24 bg-[#0a0a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Works for Any Service Business
            </h2>
            <p className="text-slate-400">
              Pre-configured niches with industry-specific audit criteria
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "🏥", name: "Medical Offices" },
              { icon: "🦷", name: "Dental Practices" },
              { icon: "⚖️", name: "Law Firms" },
              { icon: "🍽️", name: "Restaurants" },
              { icon: "💪", name: "Gyms & Fitness" },
              { icon: "💇", name: "Salons & Spas" },
              { icon: "🏠", name: "Real Estate" },
              { icon: "🔧", name: "Home Services" },
              { icon: "🐕", name: "Pet Services" },
              { icon: "📸", name: "Photographers" },
              { icon: "🏗️", name: "Contractors" },
              { icon: "✨", name: "Any Niche" },
            ].map((niche) => (
              <div
                key={niche.name}
                className="card text-center py-6 hover:border-indigo-500/30"
              >
                <div className="text-3xl mb-2">{niche.icon}</div>
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
                Vision AI Audits Every Website
              </h2>
              <p className="text-slate-400 mb-8">
                GPT-4o analyzes actual screenshots to identify design issues, 
                UX problems, and missed conversion opportunities that 
                rule-based tools miss.
              </p>
              <ul className="space-y-4">
                {[
                  "Screenshot-based visual analysis",
                  "Design & UX audit (0-100 score)",
                  "SEO technical audit",
                  "Industry-specific recommendations",
                  "Shareable PDF-style reports",
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

      {/* Pricing */}
      <section className="py-24 bg-[#0a0a1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-slate-400">
              Start free, upgrade when you need more
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              description="Try it out"
              features={[
                "5 prospects/month",
                "Design audit",
                "Basic reports",
                "Email templates",
              ]}
              cta="Get Started"
              href="/sign-up"
            />
            <PricingCard
              name="Pro"
              price="$29"
              description="For freelancers"
              features={[
                "100 prospects/month",
                "Design + SEO audits",
                "AI personalized emails",
                "Branded reports",
                "Priority support",
              ]}
              cta="Start Pro Trial"
              href="/sign-up?plan=pro"
              featured
            />
            <PricingCard
              name="Agency"
              price="$99"
              description="For teams"
              features={[
                "Unlimited prospects",
                "All Pro features",
                "White-label reports",
                "Team accounts",
                "API access",
                "Dedicated support",
              ]}
              cta="Contact Sales"
              href="/contact"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Find Your Next Client?
          </h2>
          <p className="text-xl text-slate-400 mb-10">
            Join hundreds of web designers and agencies using LeadPilot to automate their prospecting.
          </p>
          <Link
            href="/sign-up"
            className="btn-primary text-lg px-8 py-4 inline-flex items-center gap-2"
          >
            Start Your Free Trial
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
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
                AI-powered prospecting for web designers and agencies.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/auto" className="hover:text-white transition-colors">Auto Prospect</Link></li>
                <li><Link href="/assistant" className="hover:text-white transition-colors">Single Audit</Link></li>
                <li><Link href="/#pricing" className="hover:text-white transition-colors">Pricing</Link></li>
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

            {/* Monetization */}
            <div>
              <h4 className="font-semibold text-white mb-4">Partners</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link href="/advertise" className="hover:text-white transition-colors">📢 Advertise</Link></li>
                <li><Link href="/affiliates" className="hover:text-white transition-colors">💰 Affiliates</Link></li>
                <li><Link href="/api" className="hover:text-white transition-colors">🔌 API</Link></li>
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
              <Link href="https://twitter.com/leadpilot" className="hover:text-white transition-colors">Twitter</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function StepCard({ number, icon, title, description }: { number: string; icon: string; title: string; description: string }) {
  return (
    <div className="card relative group">
      <div className="absolute -top-4 -left-4 text-5xl font-bold text-indigo-500/10">{number}</div>
      <div className="text-4xl mb-4">{icon}</div>
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

function PricingCard({
  name,
  price,
  description,
  features,
  cta,
  href,
  featured,
}: {
  name: string;
  price: string;
  description: string;
  features: string[];
  cta: string;
  href: string;
  featured?: boolean;
}) {
  return (
    <div className={`card relative ${featured ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-transparent" : ""}`}>
      {featured && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-medium rounded-full">
          Most Popular
        </div>
      )}
      <div className="text-center mb-6">
        <div className="text-lg font-medium text-slate-400 mb-1">{name}</div>
        <div className="text-4xl font-bold text-white mb-1">
          {price}
          <span className="text-lg font-normal text-slate-500">/mo</span>
        </div>
        <div className="text-sm text-slate-500">{description}</div>
      </div>
      <ul className="space-y-3 mb-8">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-slate-300 text-sm">
            <svg className="w-4 h-4 text-indigo-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block text-center py-3 rounded-lg font-medium transition-colors ${
          featured
            ? "bg-indigo-500 text-white hover:bg-indigo-600"
            : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
