import Link from "next/link";

export const metadata = {
  title: "Advertise on LeadPilot - Reach Web Designers & Agencies",
  description: "Get your product in front of thousands of web designers, freelancers, and agencies actively prospecting for clients.",
};

export default function AdvertisePage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-300 text-sm font-medium mb-6">
            💰 Advertising Opportunities
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Advertise on <span className="gradient-text">LeadPilot</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Reach thousands of web designers, freelancers, and digital agencies 
            who are actively looking for tools and services.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-16">
          <div className="card text-center py-8">
            <div className="text-4xl font-bold gradient-text mb-2">10K+</div>
            <div className="text-slate-400">Monthly Users</div>
          </div>
          <div className="card text-center py-8">
            <div className="text-4xl font-bold gradient-text mb-2">50K+</div>
            <div className="text-slate-400">Page Views</div>
          </div>
          <div className="card text-center py-8">
            <div className="text-4xl font-bold gradient-text mb-2">85%</div>
            <div className="text-slate-400">Decision Makers</div>
          </div>
        </div>

        {/* Audience */}
        <div className="card p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Our Audience</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-white mb-3">Who Uses LeadPilot</h3>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Freelance Web Designers
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Digital Marketing Agencies
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  Web Development Agencies
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  SEO Consultants
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">✓</span>
                  SaaS Founders
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-white mb-3">They{"'"}re Looking For</h3>
              <ul className="space-y-2 text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">→</span>
                  Design & Development Tools
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">→</span>
                  Hosting & Infrastructure
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">→</span>
                  Project Management Software
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">→</span>
                  Business & Productivity Apps
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-indigo-400">→</span>
                  Learning Resources & Courses
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Ad Options */}
        <h2 className="text-2xl font-bold text-white mb-6">Advertising Options</h2>
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card p-6">
            <div className="text-3xl mb-4">📢</div>
            <h3 className="text-xl font-bold text-white mb-2">Banner Ads</h3>
            <p className="text-slate-400 text-sm mb-4">
              Display ads in high-visibility areas including header, sidebar, and footer.
            </p>
            <div className="text-2xl font-bold text-white mb-1">
              $200<span className="text-sm font-normal text-slate-500">/month</span>
            </div>
            <div className="text-xs text-slate-500">Starting price</div>
          </div>

          <div className="card p-6 border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-transparent">
            <div className="text-3xl mb-4">⭐</div>
            <h3 className="text-xl font-bold text-white mb-2">Sponsored Listing</h3>
            <p className="text-slate-400 text-sm mb-4">
              Featured placement in our tools directory or partner recommendations.
            </p>
            <div className="text-2xl font-bold text-white mb-1">
              $500<span className="text-sm font-normal text-slate-500">/month</span>
            </div>
            <div className="text-xs text-slate-500">Best value</div>
          </div>

          <div className="card p-6">
            <div className="text-3xl mb-4">📧</div>
            <h3 className="text-xl font-bold text-white mb-2">Newsletter Sponsor</h3>
            <p className="text-slate-400 text-sm mb-4">
              Reach our engaged email subscribers with a dedicated sponsorship slot.
            </p>
            <div className="text-2xl font-bold text-white mb-1">
              $300<span className="text-sm font-normal text-slate-500">/issue</span>
            </div>
            <div className="text-xs text-slate-500">Per newsletter</div>
          </div>
        </div>

        {/* Contact CTA */}
        <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-slate-400 mb-6">
            Contact us to discuss advertising opportunities and custom packages.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="mailto:ads@leadpilot.com"
              className="btn-primary px-8 py-3"
            >
              📧 Contact for Advertising
            </Link>
            <Link
              href="https://twitter.com/leadpilot"
              target="_blank"
              className="btn-secondary px-8 py-3"
            >
              DM on Twitter
            </Link>
          </div>
        </div>

        {/* Ad Networks Info */}
        <div className="mt-16">
          <h2 className="text-xl font-bold text-white mb-6">We Also Support</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Google AdSense", logo: "🔷" },
              { name: "Carbon Ads", logo: "⚫" },
              { name: "EthicalAds", logo: "🟢" },
              { name: "BuySellAds", logo: "🟠" },
            ].map((network) => (
              <div key={network.name} className="card p-4 text-center">
                <div className="text-2xl mb-2">{network.logo}</div>
                <div className="text-sm text-slate-400">{network.name}</div>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">
            We work with multiple ad networks to ensure the best fit for your campaign.
          </p>
        </div>
      </div>
    </div>
  );
}

