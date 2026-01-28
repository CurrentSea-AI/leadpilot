"use client";

import { useState, useEffect, useCallback } from "react";

type Audit = {
  score: number;
  findingsJson: string;
};

type DraftVersions = {
  owner: { email1: string; followUp1: string; followUp2: string; dm: string };
  front_desk: { email1: string; followUp1: string; followUp2: string; dm: string };
};

type Lead = {
  id: string;
  name: string;
  websiteUrl: string;
  status: string;
  recipientName: string | null;
  lastContactedAt: string | null;
  nextFollowUpAt: string | null;
  audit: Audit | null;
  outreachDraft: { versionsJson: string } | null;
};

type Audience = "owner" | "front_desk";

export default function TodayPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [audience, setAudience] = useState<Audience>("owner");

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch("/api/leads");
      if (res.ok) {
        const data = await res.json();
        setLeads(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  // Filter leads into sections
  const now = new Date();

  const sendToday = leads.filter((l) => {
    if (l.lastContactedAt) return false; // Already contacted
    if (l.status === "NEW") return true;
    if (l.status === "AUDITED" && l.audit && l.audit.score >= 6) return true;
    if (l.status === "DRAFTED") return true;
    return false;
  });

  const followUpToday = leads.filter((l) => {
    if (l.status !== "SENT") return false;
    if (!l.nextFollowUpAt) return false;
    return new Date(l.nextFollowUpAt) <= now;
  });

  const hotReplies = leads.filter((l) => l.status === "REPLIED");

  // Actions
  const runAudit = async (leadId: string) => {
    setActionLoading((p) => ({ ...p, [`audit-${leadId}`]: true }));
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) {
        fetchLeads();
        showToast("Audit complete!");
      } else {
        showToast("Audit failed");
      }
    } catch {
      showToast("Audit failed");
    } finally {
      setActionLoading((p) => ({ ...p, [`audit-${leadId}`]: false }));
    }
  };

  const generateDraft = async (leadId: string) => {
    setActionLoading((p) => ({ ...p, [`draft-${leadId}`]: true }));
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });
      if (res.ok) {
        fetchLeads();
        showToast("Draft generated!");
      } else {
        showToast("Draft failed");
      }
    } catch {
      showToast("Draft failed");
    } finally {
      setActionLoading((p) => ({ ...p, [`draft-${leadId}`]: false }));
    }
  };

  const copyEmail = async (lead: Lead, type: "email1" | "followUp1" | "followUp2") => {
    if (!lead.outreachDraft) return;
    try {
      const versions: DraftVersions = JSON.parse(lead.outreachDraft.versionsJson || "{}");
      const v = versions[audience];
      if (v && v[type]) {
        const text = v[type]
          .replace(/\{\{PracticeName\}\}/g, lead.name)
          .replace(/\{\{Name\}\}/g, lead.recipientName || "there")
          .replace(/\{\{WebsiteUrl\}\}/g, lead.websiteUrl);
        await navigator.clipboard.writeText(text);
        showToast("Copied!");
      }
    } catch {
      showToast("Copy failed");
    }
  };

  const updateStatus = async (leadId: string, status: string) => {
    setActionLoading((p) => ({ ...p, [leadId]: true }));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        fetchLeads();
        showToast(`Marked ${status}`);
      }
    } finally {
      setActionLoading((p) => ({ ...p, [leadId]: false }));
    }
  };

  const markFollowUpSent = async (leadId: string, followUpNum: 1 | 2) => {
    setActionLoading((p) => ({ ...p, [`fu${followUpNum}-${leadId}`]: true }));
    try {
      const nextFollowUp = followUpNum === 1 ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null;
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastContactedAt: new Date().toISOString(),
          nextFollowUpAt: nextFollowUp,
        }),
      });
      if (res.ok) {
        fetchLeads();
        showToast(`Follow-up ${followUpNum} sent!`);
      }
    } finally {
      setActionLoading((p) => ({ ...p, [`fu${followUpNum}-${leadId}`]: false }));
    }
  };

  if (loading) {
    return <div className="p-8 text-gray-500">Loading...</div>;
  }

  const Section = ({
    title,
    leads,
    emptyMsg,
    color,
  }: {
    title: string;
    leads: Lead[];
    emptyMsg: string;
    color: string;
  }) => (
    <div className="mb-8">
      <h2 className={`text-lg font-bold mb-3 flex items-center gap-2 ${color}`}>
        <span className="w-6 h-6 rounded-full bg-current opacity-20 flex items-center justify-center text-sm">
          {leads.length}
        </span>
        {title}
      </h2>
      {leads.length === 0 ? (
        <p className="text-gray-400 text-sm">{emptyMsg}</p>
      ) : (
        <div className="space-y-2">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border rounded-lg px-4 py-3 flex items-center justify-between gap-4"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium truncate">{lead.name}</div>
                <div className="text-xs text-gray-500 truncate">{lead.websiteUrl}</div>
                {lead.audit && (
                  <span className="text-xs text-gray-400">Score: {lead.audit.score}/10</span>
                )}
              </div>
              <div className="flex flex-wrap gap-1 shrink-0">
                {/* NEW leads: Run Audit */}
                {lead.status === "NEW" && (
                  <button
                    onClick={() => runAudit(lead.id)}
                    disabled={actionLoading[`audit-${lead.id}`]}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                  >
                    {actionLoading[`audit-${lead.id}`] ? "..." : "Audit"}
                  </button>
                )}
                {/* AUDITED leads: Generate Draft */}
                {lead.status === "AUDITED" && !lead.outreachDraft && (
                  <button
                    onClick={() => generateDraft(lead.id)}
                    disabled={actionLoading[`draft-${lead.id}`]}
                    className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 disabled:opacity-50"
                  >
                    {actionLoading[`draft-${lead.id}`] ? "..." : "Draft"}
                  </button>
                )}
                {/* Has draft: Copy buttons */}
                {lead.outreachDraft && (
                  <>
                    <button
                      onClick={() => copyEmail(lead, "email1")}
                      className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                    >
                      Copy E1
                    </button>
                    {lead.status === "SENT" && (
                      <>
                        <button
                          onClick={() => copyEmail(lead, "followUp1")}
                          className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                          Copy F1
                        </button>
                        <button
                          onClick={() => copyEmail(lead, "followUp2")}
                          className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                        >
                          Copy F2
                        </button>
                      </>
                    )}
                  </>
                )}
                {/* SENT leads: Follow-up actions */}
                {lead.status === "SENT" && (
                  <>
                    <button
                      onClick={() => markFollowUpSent(lead.id, 1)}
                      disabled={actionLoading[`fu1-${lead.id}`]}
                      className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      {actionLoading[`fu1-${lead.id}`] ? "..." : "Sent F1"}
                    </button>
                    <button
                      onClick={() => markFollowUpSent(lead.id, 2)}
                      disabled={actionLoading[`fu2-${lead.id}`]}
                      className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
                    >
                      {actionLoading[`fu2-${lead.id}`] ? "..." : "Sent F2"}
                    </button>
                    <button
                      onClick={() => updateStatus(lead.id, "REPLIED")}
                      disabled={actionLoading[lead.id]}
                      className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 disabled:opacity-50"
                    >
                      Replied
                    </button>
                  </>
                )}
                {/* REPLIED leads: Win/Loss */}
                {lead.status === "REPLIED" && (
                  <>
                    <button
                      onClick={() => updateStatus(lead.id, "WON")}
                      disabled={actionLoading[lead.id]}
                      className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                    >
                      Won
                    </button>
                    <button
                      onClick={() => updateStatus(lead.id, "LOST")}
                      disabled={actionLoading[lead.id]}
                      className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      Lost
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Today</h1>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Audience:</span>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value as Audience)}
            className="text-sm border rounded px-2 py-1"
          >
            <option value="owner">👔 Owner</option>
            <option value="front_desk">🖥️ Front Desk</option>
          </select>
          <a
            href="/leads"
            className="text-sm text-blue-600 hover:underline ml-4"
          >
            All Leads →
          </a>
        </div>
      </div>

      <Section
        title="Send Today"
        leads={sendToday}
        emptyMsg="No new leads ready to send. Add leads or run audits."
        color="text-blue-600"
      />

      <Section
        title="Follow Up Today"
        leads={followUpToday}
        emptyMsg="No follow-ups due today. 🎉"
        color="text-orange-600"
      />

      <Section
        title="Hot Replies"
        leads={hotReplies}
        emptyMsg="No replies yet. Keep sending!"
        color="text-green-600"
      />

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <span className="text-green-400">✓</span>
          {toast}
        </div>
      )}
    </div>
  );
}

