"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

// Force dynamic rendering since we use useSearchParams
export const dynamic = "force-dynamic";

type UserData = {
  tier: string;
  prospectsUsed: number;
  prospectsLimit: number;
  prospectsRemaining: number;
  hasStripeCustomer: boolean;
};

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    description: "Try it out",
    features: [
      "5 prospects/month",
      "Design audit only",
      "Basic reports",
      "Email templates",
    ],
    notIncluded: [
      "SEO audit",
      "AI-personalized emails",
      "Branded reports",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$29",
    description: "For freelancers",
    features: [
      "100 prospects/month",
      "Design + SEO audits",
      "AI personalized emails",
      "Branded reports",
      "Priority support",
    ],
    featured: true,
  },
  {
    id: "agency",
    name: "Agency",
    price: "$99",
    description: "For teams",
    features: [
      "Unlimited prospects",
      "All Pro features",
      "White-label reports",
      "Team accounts (coming soon)",
      "API access",
      "Dedicated support",
    ],
  },
];

export default function BillingPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const searchParams = useSearchParams();
  
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const res = await fetch("/api/user");
      if (res.ok) {
        const data = await res.json();
        setUserData(data);
      }
    } catch (error) {
      console.error("Failed to fetch user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start checkout");
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      alert("Failed to start upgrade");
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
      });
      
      const data = await res.json();
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to open billing portal");
      }
    } catch (error) {
      console.error("Portal error:", error);
      alert("Failed to open billing portal");
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Success/Cancel Messages */}
        {success && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-center">
            🎉 Welcome to your new plan! Your account has been upgraded.
          </div>
        )}
        {canceled && (
          <div className="mb-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-center">
            Checkout was canceled. You can try again anytime.
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Billing & Plans</h1>
          <p className="text-slate-400">Upgrade to unlock more prospects and features</p>
        </div>

        {/* Current Usage */}
        {userData && (
          <div className="card p-6 mb-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-slate-400 mb-1">Current Plan</div>
                <div className="text-2xl font-bold text-white flex items-center gap-2">
                  {userData.tier}
                  {userData.tier !== "FREE" && (
                    <span className="text-xs px-2 py-1 bg-indigo-500/20 text-indigo-400 rounded-full">
                      Active
                    </span>
                  )}
                </div>
              </div>
              
              <div className="text-right">
                <div className="text-sm text-slate-400 mb-1">Monthly Usage</div>
                <div className="text-2xl font-bold text-white">
                  {userData.prospectsUsed} / {userData.prospectsLimit === Infinity ? "∞" : userData.prospectsLimit}
                </div>
                <div className="text-xs text-slate-500">
                  {userData.prospectsRemaining === Infinity ? "Unlimited" : `${userData.prospectsRemaining} remaining`}
                </div>
              </div>
            </div>
            
            {/* Progress Bar */}
            {userData.prospectsLimit !== Infinity && (
              <div className="mt-4">
                <div className="h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all"
                    style={{ width: `${Math.min(100, (userData.prospectsUsed / userData.prospectsLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            
            {userData.hasStripeCustomer && userData.tier !== "FREE" && (
              <button
                onClick={handleManageBilling}
                className="mt-4 text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Manage Billing & Invoices →
              </button>
            )}
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrentPlan = userData?.tier.toLowerCase() === plan.id.toLowerCase();
            
            return (
              <div 
                key={plan.id}
                className={`card relative ${
                  plan.featured 
                    ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-transparent" 
                    : ""
                }`}
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-indigo-500 text-white text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                
                <div className="text-center mb-6">
                  <div className="text-lg font-medium text-slate-400 mb-1">{plan.name}</div>
                  <div className="text-4xl font-bold text-white mb-1">
                    {plan.price}
                    <span className="text-lg font-normal text-slate-500">/mo</span>
                  </div>
                  <div className="text-sm text-slate-500">{plan.description}</div>
                </div>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-slate-300 text-sm">
                      <svg className="w-4 h-4 text-green-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                  {plan.notIncluded?.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-slate-500 text-sm">
                      <svg className="w-4 h-4 text-slate-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                
                {isCurrentPlan ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl font-medium bg-green-500/20 text-green-400 border border-green-500/30 cursor-default"
                  >
                    Current Plan
                  </button>
                ) : plan.id === "free" ? (
                  <button
                    disabled
                    className="w-full py-3 rounded-xl font-medium bg-white/5 text-slate-500 border border-white/10 cursor-default"
                  >
                    Free Tier
                  </button>
                ) : (
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={upgrading !== null}
                    className={`w-full py-3 rounded-xl font-medium transition-colors ${
                      plan.featured
                        ? "bg-indigo-500 text-white hover:bg-indigo-600"
                        : "bg-white/5 text-white hover:bg-white/10 border border-white/10"
                    } disabled:opacity-50`}
                  >
                    {upgrading === plan.id ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Starting checkout...
                      </span>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Frequently Asked Questions</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">Can I cancel anytime?</h3>
              <p className="text-slate-400 text-sm">Yes! You can cancel your subscription at any time from the billing portal. You{"'"}ll keep your plan until the end of your billing period.</p>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">What counts as a prospect?</h3>
              <p className="text-slate-400 text-sm">Each unique business website you audit counts as one prospect. Re-auditing the same website doesn{"'"}t count again.</p>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">Do unused prospects roll over?</h3>
              <p className="text-slate-400 text-sm">No, prospect limits reset monthly. We recommend upgrading if you consistently need more.</p>
            </div>
            <div className="card p-6">
              <h3 className="font-semibold text-white mb-2">What payment methods do you accept?</h3>
              <p className="text-slate-400 text-sm">We accept all major credit cards through Stripe, including Visa, Mastercard, and American Express.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

