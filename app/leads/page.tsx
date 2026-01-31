"use client";

import { useState, useEffect, useCallback } from "react";

type Audit = {
  score: number;
  confidence: number;
  findingsJson: string;
  extractedJson: string;
  error: string | null;
};

type DraftVersions = {
  owner: {
    email1: string;
    followUp1: string;
    followUp2: string;
    dm: string;
  };
  front_desk: {
    email1: string;
    followUp1: string;
    followUp2: string;
    dm: string;
  };
};

type Audience = "owner" | "front_desk";

type ContactMethod = "EMAIL" | "CONTACT_FORM" | "IG_DM" | "PHONE" | "OTHER";

const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  EMAIL: "Email",
  CONTACT_FORM: "Contact Form",
  IG_DM: "IG DM",
  PHONE: "Phone",
  OTHER: "Other",
};

type DesignAudit = {
  score: number;
  findingsJson: string;
  error: string | null;
};

type SeoAudit = {
  score: number;
  findingsJson: string;
  error: string | null;
};

type Lead = {
  id: string;
  createdAt: string;
  name: string;
  websiteUrl: string;
  city: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  recipientName: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  contactMethod: ContactMethod | null;
  notes: string | null;
  audit: Audit | null;
  designAudit: DesignAudit | null;
  seoAudit: SeoAudit | null;
  outreachDraft: {
    email1: string;
    versionsJson: string;
  } | null;
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAudience, setSelectedAudience] = useState<Audience>("owner");
  const [toast, setToast] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLead, setNewLead] = useState({ name: "", websiteUrl: "", city: "" });
  const [addingLead, setAddingLead] = useState(false);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (!res.ok) throw new Error("Failed to fetch leads");
      const data = await res.json();
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleAddLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name || !newLead.websiteUrl) return;

    setAddingLead(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLead),
      });

      if (res.ok) {
        setNewLead({ name: "", websiteUrl: "", city: "" });
        setShowAddForm(false);
        fetchLeads();
        showToast("Lead added!");
      }
    } catch {
      showToast("Failed to add lead");
    } finally {
      setAddingLead(false);
    }
  };

  const copyEmail = async (lead: Lead, emailType: "email1" | "followUp1" | "followUp2" | "dm" = "email1") => {
    if (!lead.outreachDraft) return;
    
    try {
      const versions: DraftVersions = JSON.parse(lead.outreachDraft.versionsJson || "{}");
      const audienceVersions = versions[selectedAudience];
      
      if (audienceVersions && audienceVersions[emailType]) {
        await navigator.clipboard.writeText(audienceVersions[emailType]);
        showToast("Copied!");
      } else {
        await navigator.clipboard.writeText(lead.outreachDraft.email1);
        showToast("Copied!");
      }
    } catch {
      await navigator.clipboard.writeText(lead.outreachDraft.email1);
      showToast("Copied!");
    }
  };

  const sendEmail = (lead: Lead) => {
    if (!lead.outreachDraft) return;
    
    try {
      const versions: DraftVersions = JSON.parse(lead.outreachDraft.versionsJson || "{}");
      const email = versions[selectedAudience]?.email1 || lead.outreachDraft.email1;
      
      // Extract subject line from email (usually first line)
      const lines = email.split("\n");
      let subject = `Website Redesign for ${lead.name}`;
      let body = email;
      
      if (lines[0]?.toLowerCase().startsWith("subject:")) {
        subject = lines[0].replace(/^subject:\s*/i, "");
        body = lines.slice(1).join("\n").trim();
      }
      
      // Open email client
      const mailtoLink = `mailto:${lead.email || ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoLink, "_blank");
    } catch {
      showToast("Failed to open email");
    }
  };

  const downloadReport = async (lead: Lead) => {
    // Open report page where they can download the styled PDF
    window.open(`/api/report?leadId=${lead.id}&type=design`, "_blank");
    showToast("Opening report - click Download PDF button!");
  };

  const openReport = (lead: Lead) => {
    // Open report in new tab via API
    window.open(`/api/report?leadId=${lead.id}&type=design`, "_blank");
  };

  const statusColors: Record<string, string> = {
    NEW: "bg-slate-600 text-slate-200",
    AUDITED: "bg-blue-600/20 text-blue-300 border border-blue-500/30",
    DRAFTED: "bg-purple-600/20 text-purple-300 border border-purple-500/30",
    SENT: "bg-yellow-600/20 text-yellow-300 border border-yellow-500/30",
    REPLIED: "bg-orange-600/20 text-orange-300 border border-orange-500/30",
    WON: "bg-green-600/20 text-green-300 border border-green-500/30",
    LOST: "bg-red-600/20 text-red-300 border border-red-500/30",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-slate-400">Loading leads...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-red-400">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Lead Dashboard</h1>
          <p className="text-slate-400 mt-1">{leads.length} leads total</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="btn-primary"
          >
            ➕ Add Lead
          </button>
        </div>
      </div>

      {/* Add Lead Form */}
      {showAddForm && (
        <div className="card p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Lead</h3>
          <form onSubmit={handleAddLead} className="flex flex-col md:flex-row gap-3">
            <input
              type="text"
              placeholder="Business Name *"
              value={newLead.name}
              onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
              className="input flex-1"
              required
            />
            <input
              type="text"
              placeholder="Website URL *"
              value={newLead.websiteUrl}
              onChange={(e) => setNewLead({ ...newLead, websiteUrl: e.target.value })}
              className="input flex-1"
              required
            />
            <input
              type="text"
              placeholder="City (optional)"
              value={newLead.city}
              onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
              className="input w-full md:w-40"
            />
            <button
              type="submit"
              disabled={addingLead}
              className="btn-primary whitespace-nowrap"
            >
              {addingLead ? "Adding..." : "Add Lead"}
            </button>
          </form>
        </div>
      )}

      {/* Audience Toggle */}
      <div className="card p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <span className="text-sm font-medium text-slate-300">Copy emails for:</span>
          <div className="flex rounded-lg overflow-hidden border border-white/10">
            <button
              onClick={() => setSelectedAudience("owner")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                selectedAudience === "owner"
                  ? "bg-purple-600 text-white"
                  : "bg-transparent text-slate-400 hover:text-white"
              }`}
            >
              👔 Owner
            </button>
            <button
              onClick={() => setSelectedAudience("front_desk")}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                selectedAudience === "front_desk"
                  ? "bg-purple-600 text-white"
                  : "bg-transparent text-slate-400 hover:text-white"
              }`}
            >
              🖥️ Front Desk
            </button>
          </div>
          <span className="text-xs text-slate-500">
            {selectedAudience === "owner"
              ? "Business-focused messaging"
              : "Shorter, operational messaging"}
          </span>
        </div>
      </div>

      {/* Leads Grid */}
      {leads.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-white mb-2">No leads yet</h3>
          <p className="text-slate-400 mb-6">
            Use the Single URL page to audit websites and they&apos;ll appear here.
          </p>
          <a href="/assistant" className="btn-primary inline-block">
            🚀 Audit a Website
          </a>
        </div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="card p-5 hover:border-white/20 transition-colors">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* Lead Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white truncate">{lead.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[lead.status] || ""}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                    <a
                      href={lead.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 truncate max-w-xs"
                    >
                      {lead.websiteUrl.replace("https://", "").replace("http://", "")}
                    </a>
                    {lead.city && <span>📍 {lead.city}</span>}
                    {lead.email && <span>✉️ {lead.email}</span>}
                  </div>
                </div>

                {/* Scores */}
                <div className="flex items-center gap-4">
                  {(lead.designAudit || lead.audit) && (
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        (lead.designAudit?.score || (lead.audit?.score || 0) * 10) >= 70 
                          ? "text-green-400" 
                          : (lead.designAudit?.score || (lead.audit?.score || 0) * 10) >= 50 
                          ? "text-yellow-400" 
                          : "text-red-400"
                      }`}>
                        {lead.designAudit?.score || (lead.audit?.score || 0) * 10}
                      </div>
                      <div className="text-xs text-slate-500">Design</div>
                    </div>
                  )}
                  {lead.seoAudit && (
                    <div className="text-center">
                      <div className={`text-2xl font-bold ${
                        lead.seoAudit.score >= 70 ? "text-green-400" : 
                        lead.seoAudit.score >= 50 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {lead.seoAudit.score}
                      </div>
                      <div className="text-xs text-slate-500">SEO</div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {(lead.designAudit || lead.audit) && (
                    <>
                      <button
                        onClick={() => openReport(lead)}
                        className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg font-medium transition-colors"
                      >
                        📄 View Report
                      </button>
                      <button
                        onClick={() => downloadReport(lead)}
                        className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm rounded-lg font-medium transition-colors"
                      >
                        ⬇️ Download
                      </button>
                    </>
                  )}
                  {lead.outreachDraft && (
                    <>
                      <button
                        onClick={() => sendEmail(lead)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg font-medium transition-colors"
                      >
                        ✉️ Send Email
                      </button>
                      <button
                        onClick={() => copyEmail(lead, "email1")}
                        className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg font-medium transition-colors"
                      >
                        📋 Copy Email
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Follow-up info */}
              {(lead.lastContactedAt || lead.nextFollowUpAt) && (
                <div className="mt-4 pt-4 border-t border-white/5 flex flex-wrap gap-4 text-sm">
                  {lead.lastContactedAt && (
                    <span className="text-slate-500">
                      📅 Sent {new Date(lead.lastContactedAt).toLocaleDateString()}
                      {lead.contactMethod && ` via ${CONTACT_METHOD_LABELS[lead.contactMethod]}`}
                    </span>
                  )}
                  {lead.nextFollowUpAt && (
                    <span className={new Date(lead.nextFollowUpAt) <= new Date() ? "text-orange-400" : "text-slate-500"}>
                      ⏰ Follow-up {new Date(lead.nextFollowUpAt).toLocaleDateString()}
                      {new Date(lead.nextFollowUpAt) <= new Date() && " (overdue!)"}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Export Button */}
      {leads.length > 0 && (
        <div className="mt-6 flex justify-end">
          <a
            href="/api/export"
            download
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
          >
            📥 Export CSV
          </a>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-slate-800 text-white px-4 py-3 rounded-xl shadow-lg border border-white/10 flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.2s ease-out; }
      `}</style>
    </div>
  );
}
