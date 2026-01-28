"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Stats = {
  totalLeads: number;
  audited: number;
  drafted: number;
  sent: number;
  reportsViewed: number;
};

type RecentLead = {
  id: string;
  name: string;
  websiteUrl: string;
  status: string;
  designScore?: number;
  createdAt: string;
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentLeads, setRecentLeads] = useState<RecentLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<{ used: number; limit: number; tier: string } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/stats").then(r => r.ok ? r.json() : null),
      fetch("/api/leads?limit=5").then(r => r.ok ? r.json() : null),
      fetch("/api/user").then(r => r.ok ? r.json() : null),
    ]).then(([statsData, leadsData, userData]) => {
      if (statsData) setStats(statsData);
      if (leadsData) setRecentLeads(leadsData.leads || []);
      if (userData) setUsage({ used: userData.prospectsUsed, limit: userData.prospectsLimit, tier: userData.tier });
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">Dashboard</h1>
            <p className="text-slate-400">Your prospecting overview</p>
          </div>
          <Link
            href="/auto"
            className="btn-primary px-6 py-3"
          >
            🚀 Find New Prospects
          </Link>
        </div>

        {/* Usage Banner */}
        {usage && usage.limit !== Infinity && (
          <div className="card p-4 mb-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <div className="text-sm text-slate-400">Monthly Usage</div>
                <div className="text-xl font-bold text-white">
                  {usage.used} / {usage.limit} prospects
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-32 h-2 bg-[#1a1a2e] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                  style={{ width: `${Math.min(100, (usage.used / usage.limit) * 100)}%` }}
                />
              </div>
              {usage.tier === "FREE" && (
                <Link href="/billing" className="text-sm text-indigo-400 hover:text-indigo-300">
                  Upgrade →
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard 
            label="Total Leads" 
            value={stats?.totalLeads || 0} 
            icon="👥"
            color="indigo"
          />
          <StatCard 
            label="Audited" 
            value={stats?.audited || 0} 
            icon="🔍"
            color="blue"
          />
          <StatCard 
            label="Drafted" 
            value={stats?.drafted || 0} 
            icon="✉️"
            color="purple"
          />
          <StatCard 
            label="Sent" 
            value={stats?.sent || 0} 
            icon="📤"
            color="green"
          />
          <StatCard 
            label="Reports Viewed" 
            value={stats?.reportsViewed || 0} 
            icon="👀"
            color="orange"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <QuickActionCard
                icon="🚀"
                title="Auto Prospect"
                description="Find and audit businesses automatically"
                href="/auto"
                color="indigo"
              />
              <QuickActionCard
                icon="🔗"
                title="Single URL"
                description="Audit a specific website"
                href="/assistant"
                color="purple"
              />
              <QuickActionCard
                icon="📊"
                title="View All Leads"
                description="Manage your lead database"
                href="/leads"
                color="blue"
              />
            </div>
          </div>

          {/* Recent Leads */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">Recent Leads</h2>
              <Link href="/leads" className="text-sm text-indigo-400 hover:text-indigo-300">
                View all →
              </Link>
            </div>
            
            {recentLeads.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-4">🎯</div>
                <h3 className="text-lg font-semibold text-white mb-2">No leads yet</h3>
                <p className="text-slate-400 mb-6">Start prospecting to see your leads here</p>
                <Link href="/auto" className="btn-primary inline-block px-6 py-3">
                  Find Your First Prospects
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="card p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white truncate">{lead.name}</div>
                      <div className="text-sm text-slate-500 truncate">
                        {lead.websiteUrl.replace(/^https?:\/\//, "")}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {lead.designScore !== undefined && (
                        <div className={`text-lg font-bold ${getScoreColor(lead.designScore)}`}>
                          {lead.designScore}
                        </div>
                      )}
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(lead.status)}`}>
                        {lead.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  const colorClasses: Record<string, string> = {
    indigo: "bg-indigo-500/10 text-indigo-400",
    blue: "bg-blue-500/10 text-blue-400",
    purple: "bg-purple-500/10 text-purple-400",
    green: "bg-green-500/10 text-green-400",
    orange: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="card p-4">
      <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
        <span className="text-xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-500">{label}</div>
    </div>
  );
}

function QuickActionCard({ 
  icon, 
  title, 
  description, 
  href, 
  color 
}: { 
  icon: string; 
  title: string; 
  description: string; 
  href: string; 
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    indigo: "bg-indigo-500/10 group-hover:bg-indigo-500/20",
    purple: "bg-purple-500/10 group-hover:bg-purple-500/20",
    blue: "bg-blue-500/10 group-hover:bg-blue-500/20",
  };

  return (
    <Link href={href} className="card p-4 flex items-center gap-4 group hover:border-white/20 transition-colors">
      <div className={`w-12 h-12 rounded-xl ${colorClasses[color]} flex items-center justify-center transition-colors`}>
        <span className="text-2xl">{icon}</span>
      </div>
      <div>
        <div className="font-medium text-white group-hover:text-indigo-400 transition-colors">{title}</div>
        <div className="text-sm text-slate-500">{description}</div>
      </div>
    </Link>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    NEW: "bg-blue-500/20 text-blue-400",
    AUDITED: "bg-purple-500/20 text-purple-400",
    DRAFTED: "bg-indigo-500/20 text-indigo-400",
    SENT: "bg-green-500/20 text-green-400",
    REPLIED: "bg-emerald-500/20 text-emerald-400",
    WON: "bg-green-500/20 text-green-400",
    LOST: "bg-red-500/20 text-red-400",
  };
  return colors[status] || "bg-slate-500/20 text-slate-400";
}

