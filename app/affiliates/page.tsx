import Link from "next/link";

export const metadata = {
  title: "Affiliate Program - Earn with LeadPilot",
  description: "Join the LeadPilot affiliate program and earn 30% recurring commission for every customer you refer.",
};

export default function AffiliatesPage() {
  return (
    <div className="min-h-[calc(100vh-4rem)] py-16 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-medium mb-6">
            💸 Affiliate Program
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Earn <span className="gradient-text">30% Recurring</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Recommend LeadPilot to web designers and agencies. 
            Earn 30% of every payment, forever.
          </p>
        </div>

        {/* Earnings Calculator */}
        <div className="card bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20 p-8 mb-12">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Potential Earnings</h2>
          <div className="grid md:grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-sm text-slate-400 mb-1">10 Pro Referrals</div>
              <div className="text-3xl font-bold text-emerald-400">$87/mo</div>
              <div className="text-xs text-slate-500">$1,044/year</div>
            </div>
            <div className="border-x border-white/10">
              <div className="text-sm text-slate-400 mb-1">25 Pro Referrals</div>
              <div className="text-3xl font-bold text-emerald-400">$217/mo</div>
              <div className="text-xs text-slate-500">$2,610/year</div>
            </div>
            <div>
              <div className="text-sm text-slate-400 mb-1">50 Pro Referrals</div>
              <div className="text-3xl font-bold text-emerald-400">$435/mo</div>
              <div className="text-xs text-slate-500">$5,220/year</div>
            </div>
          </div>
          <p className="text-center text-sm text-slate-500 mt-4">
            Based on Pro plan ($29/mo) at 30% commission
          </p>
        </div>

        {/* How It Works */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">1️⃣</span>
              </div>
              <h3 className="font-semibold text-white mb-2">Sign Up</h3>
              <p className="text-sm text-slate-400">
                Join our affiliate program and get your unique referral link.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">2️⃣</span>
              </div>
              <h3 className="font-semibold text-white mb-2">Share</h3>
              <p className="text-sm text-slate-400">
                Promote LeadPilot to your audience, community, or clients.
              </p>
            </div>
            <div className="card p-6">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">3️⃣</span>
              </div>
              <h3 className="font-semibold text-white mb-2">Get Paid</h3>
              <p className="text-sm text-slate-400">
                Earn 30% of every subscription payment, month after month.
              </p>
            </div>
          </div>
        </div>

        {/* Benefits */}
        <div className="card p-8 mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Why Join?</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: "💰", title: "30% Recurring", desc: "Not a one-time fee — earn every month the customer stays" },
              { icon: "🍪", title: "90-Day Cookie", desc: "Get credit for signups up to 90 days after the click" },
              { icon: "📊", title: "Real-Time Dashboard", desc: "Track clicks, signups, and earnings instantly" },
              { icon: "💳", title: "Monthly Payouts", desc: "Get paid via PayPal or Stripe on the 1st of each month" },
              { icon: "🎁", title: "Marketing Materials", desc: "Banners, copy, and email swipes ready to use" },
              { icon: "🤝", title: "Dedicated Support", desc: "Direct line to our affiliate manager" },
            ].map((benefit) => (
              <div key={benefit.title} className="flex items-start gap-3">
                <div className="text-2xl">{benefit.icon}</div>
                <div>
                  <div className="font-medium text-white">{benefit.title}</div>
                  <div className="text-sm text-slate-400">{benefit.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Who Should Join */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6">Perfect For</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: "📹", name: "YouTubers" },
              { icon: "✍️", name: "Bloggers" },
              { icon: "🐦", name: "Twitter/X" },
              { icon: "📧", name: "Newsletters" },
              { icon: "💼", name: "Agencies" },
              { icon: "🎓", name: "Course Creators" },
              { icon: "🎙️", name: "Podcasters" },
              { icon: "👥", name: "Communities" },
            ].map((item) => (
              <div key={item.name} className="card p-4 text-center">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-sm text-slate-400">{item.name}</div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20 p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Ready to Start Earning?</h2>
          <p className="text-slate-400 mb-6">
            Join our affiliate program today and start earning recurring commissions.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up?affiliate=true"
              className="btn-primary px-8 py-3"
            >
              🚀 Join Affiliate Program
            </Link>
            <Link
              href="mailto:affiliates@leadpilot.com"
              className="btn-secondary px-8 py-3"
            >
              Questions? Contact Us
            </Link>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6">Affiliate FAQ</h2>
          <div className="space-y-4">
            {[
              { 
                q: "When do I get paid?", 
                a: "Payouts happen on the 1st of each month for the previous month's earnings. Minimum payout is $50." 
              },
              { 
                q: "Can I promote via paid ads?", 
                a: "Yes, but you cannot bid on branded keywords (LeadPilot, Lead Pilot, etc.)." 
              },
              { 
                q: "What if a referral upgrades later?", 
                a: "You earn commission on all payments, including upgrades to higher tiers!" 
              },
              { 
                q: "How long do referrals stay attributed?", 
                a: "Forever! Once someone signs up with your link, you earn on all their payments." 
              },
            ].map((faq) => (
              <div key={faq.q} className="card p-5">
                <h3 className="font-semibold text-white mb-2">{faq.q}</h3>
                <p className="text-sm text-slate-400">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

