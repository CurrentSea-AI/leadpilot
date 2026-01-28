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

// Matches Prisma ContactMethod enum
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

type ImportResult = {
  insertedCount: number;
  skippedCount: number;
  skippedByUrl?: number;
  skippedByPhone?: number;
  errors: { row: number; message: string }[];
  skipped?: { row: number; reason: string; field: string; value: string }[];
};

type BatchAuditResult = {
  processed: number;
  succeeded: number;
  failed: number;
  results: { leadId: string; success: boolean; score?: number; error?: string }[];
};

type BatchDraftResult = {
  processed: number;
  succeeded: number;
  failed: number;
  results: { leadId: string; success: boolean; error?: string }[];
};

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add lead form state
  const [newLead, setNewLead] = useState({ name: "", websiteUrl: "", city: "" });
  const [addingLead, setAddingLead] = useState(false);

  // CSV upload state
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Action loading states
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>({});

  // Batch audit state
  const [batchAuditing, setBatchAuditing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchAuditResult | null>(null);

  // Batch draft state
  const [batchDrafting, setBatchDrafting] = useState(false);
  const [batchDraftResult, setBatchDraftResult] = useState<BatchDraftResult | null>(null);

  // Modal state for viewing audit details
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Audience toggle state (for copy functionality)
  const [selectedAudience, setSelectedAudience] = useState<Audience>("owner");

  // Toast notification state
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  };

  // Edit modal state for customizing placeholders before copying
  const [editModalLead, setEditModalLead] = useState<Lead | null>(null);
  const [editPracticeName, setEditPracticeName] = useState("");
  const [editRecipientName, setEditRecipientName] = useState("");
  const [savingRecipient, setSavingRecipient] = useState(false);

  const openEditModal = (lead: Lead) => {
    setEditModalLead(lead);
    setEditPracticeName(lead.name);
    setEditRecipientName(lead.recipientName || "");
  };

  const closeEditModal = () => {
    setEditModalLead(null);
    setEditPracticeName("");
    setEditRecipientName("");
  };

  const saveRecipientName = async () => {
    if (!editModalLead) return;
    
    setSavingRecipient(true);
    try {
      const res = await fetch(`/api/leads/${editModalLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientName: editRecipientName }),
      });
      
      if (res.ok) {
        fetchLeads();
        showToast("Saved!");
      }
    } catch {
      showToast("Failed to save");
    } finally {
      setSavingRecipient(false);
    }
  };

  // Replace placeholders in text
  const replacePlaceholders = (text: string, practiceName: string, recipientName: string, websiteUrl: string): string => {
    const nameToUse = recipientName.trim() || "there";
    return text
      .replace(/\{\{PracticeName\}\}/g, practiceName)
      .replace(/\{\{Name\}\}/g, nameToUse)
      .replace(/\{\{WebsiteUrl\}\}/g, websiteUrl);
  };

  // Send Checklist drawer state
  const [sendDrawerLead, setSendDrawerLead] = useState<Lead | null>(null);
  const [sendContactMethod, setSendContactMethod] = useState<ContactMethod>("EMAIL");
  const [sendNotes, setSendNotes] = useState("");
  const [sendNextFollowUp, setSendNextFollowUp] = useState("");
  const [sendingChecklist, setSendingChecklist] = useState(false);

  const openSendDrawer = (lead: Lead) => {
    setSendDrawerLead(lead);
    setSendContactMethod(lead.contactMethod || "EMAIL");
    setSendNotes(lead.notes || "");
    // Default to 3 days from now for follow-up
    const defaultFollowUp = new Date();
    defaultFollowUp.setDate(defaultFollowUp.getDate() + 3);
    setSendNextFollowUp(lead.nextFollowUpAt ? lead.nextFollowUpAt.split("T")[0] : defaultFollowUp.toISOString().split("T")[0]);
  };

  const closeSendDrawer = () => {
    setSendDrawerLead(null);
    setSendContactMethod("EMAIL");
    setSendNotes("");
    setSendNextFollowUp("");
  };

  const submitSendChecklist = async () => {
    if (!sendDrawerLead) return;
    
    setSendingChecklist(true);
    try {
      const res = await fetch(`/api/leads/${sendDrawerLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "SENT",
          lastContactedAt: new Date().toISOString(),
          nextFollowUpAt: sendNextFollowUp ? new Date(sendNextFollowUp).toISOString() : null,
          contactMethod: sendContactMethod,
          notes: sendNotes,
        }),
      });
      
      if (res.ok) {
        fetchLeads();
        showToast("Marked as sent!");
        closeSendDrawer();
      } else {
        showToast("Failed to update");
      }
    } catch {
      showToast("Failed to update");
    } finally {
      setSendingChecklist(false);
    }
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
        fetchLeads();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to add lead");
      }
    } catch {
      alert("Failed to add lead");
    } finally {
      setAddingLead(false);
    }
  };

  const [creatingDemo, setCreatingDemo] = useState(false);

  const createDemoLead = async () => {
    setCreatingDemo(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Demo Medical Office",
          websiteUrl: "https://example.com",
          city: "Demo City",
        }),
      });

      if (res.ok) {
        fetchLeads();
        showToast("Demo lead created!");
      } else {
        const data = await res.json();
        showToast(data.error || "Failed to create demo lead");
      }
    } catch {
      showToast("Failed to create demo lead");
    } finally {
      setCreatingDemo(false);
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setImportResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setImportResult(data);
        fetchLeads();
      } else {
        alert(data.error || "Import failed");
      }
    } catch {
      alert("Import failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const updateStatus = async (leadId: string, status: string) => {
    setActionLoading((prev) => ({ ...prev, [leadId]: true }));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        fetchLeads();
      } else {
        alert("Failed to update status");
      }
    } catch {
      alert("Failed to update status");
    } finally {
      setActionLoading((prev) => ({ ...prev, [leadId]: false }));
    }
  };

  // Mark Follow-up 1 as sent: set nextFollowUpAt = now + 3 days
  const markFollowUp1Sent = async (leadId: string) => {
    setActionLoading((prev) => ({ ...prev, [`fu1-${leadId}`]: true }));
    try {
      const nextFollowUp = new Date();
      nextFollowUp.setDate(nextFollowUp.getDate() + 3);
      
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastContactedAt: new Date().toISOString(),
          nextFollowUpAt: nextFollowUp.toISOString(),
        }),
      });

      if (res.ok) {
        fetchLeads();
        showToast("Follow-up 1 marked as sent!");
      } else {
        showToast("Failed to update");
      }
    } catch {
      showToast("Failed to update");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`fu1-${leadId}`]: false }));
    }
  };

  // Mark Follow-up 2 as sent: set nextFollowUpAt = null (no more follow-ups)
  const markFollowUp2Sent = async (leadId: string) => {
    setActionLoading((prev) => ({ ...prev, [`fu2-${leadId}`]: true }));
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lastContactedAt: new Date().toISOString(),
          nextFollowUpAt: null, // No more follow-ups scheduled
        }),
      });

      if (res.ok) {
        fetchLeads();
        showToast("Follow-up 2 marked as sent!");
      } else {
        showToast("Failed to update");
      }
    } catch {
      showToast("Failed to update");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`fu2-${leadId}`]: false }));
    }
  };

  const runAudit = async (leadId: string) => {
    setActionLoading((prev) => ({ ...prev, [`audit-${leadId}`]: true }));
    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (res.ok) {
        fetchLeads();
      } else {
        const data = await res.json();
        alert(data.error || "Audit failed");
      }
    } catch {
      alert("Audit failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`audit-${leadId}`]: false }));
    }
  };

  const generateDraft = async (leadId: string) => {
    setActionLoading((prev) => ({ ...prev, [`draft-${leadId}`]: true }));
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          offer: { price: 1500, timelineDays: "7–10" },
        }),
      });

      if (res.ok) {
        fetchLeads();
      } else {
        const data = await res.json();
        alert(data.error || "Draft generation failed");
      }
    } catch {
      alert("Draft generation failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`draft-${leadId}`]: false }));
    }
  };

  const runDesignAudit = async (leadId: string) => {
    setActionLoading((prev) => ({ ...prev, [`design-${leadId}`]: true }));
    try {
      const res = await fetch("/api/audit/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (res.ok) {
        fetchLeads();
        showToast("Design audit complete!");
      } else {
        const data = await res.json();
        alert(data.error || "Design audit failed");
      }
    } catch {
      alert("Design audit failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`design-${leadId}`]: false }));
    }
  };

  const runSeoAudit = async (leadId: string) => {
    setActionLoading((prev) => ({ ...prev, [`seo-${leadId}`]: true }));
    try {
      const res = await fetch("/api/audit/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId }),
      });

      if (res.ok) {
        fetchLeads();
        showToast("SEO audit complete!");
      } else {
        const data = await res.json();
        alert(data.error || "SEO audit failed");
      }
    } catch {
      alert("SEO audit failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`seo-${leadId}`]: false }));
    }
  };

  const generateReport = async (leadId: string, type: "design" | "seo" | "full") => {
    setActionLoading((prev) => ({ ...prev, [`report-${leadId}`]: true }));
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId, type }),
      });

      if (res.ok) {
        const data = await res.json();
        // Open report in new tab
        window.open(data.url, "_blank");
        showToast("Report generated!");
      } else {
        const data = await res.json();
        alert(data.error || "Report generation failed");
      }
    } catch {
      alert("Report generation failed");
    } finally {
      setActionLoading((prev) => ({ ...prev, [`report-${leadId}`]: false }));
    }
  };

  const copyEmail = async (lead: Lead, emailType: "email1" | "followUp1" | "followUp2" | "dm" = "email1") => {
    if (!lead.outreachDraft) return;
    
    // Use modal values if modal is open for this lead, otherwise use lead values
    const practiceName = editModalLead?.id === lead.id ? editPracticeName : lead.name;
    const recipientName = editModalLead?.id === lead.id ? editRecipientName : (lead.recipientName || "");
    
    try {
      const versions: DraftVersions = JSON.parse(lead.outreachDraft.versionsJson || "{}");
      const audienceVersions = versions[selectedAudience];
      
      if (audienceVersions && audienceVersions[emailType]) {
        const finalText = replacePlaceholders(audienceVersions[emailType], practiceName, recipientName, lead.websiteUrl);
        await navigator.clipboard.writeText(finalText);
        showToast("Copied!");
      } else {
        // Fallback to legacy email1
        const finalText = replacePlaceholders(lead.outreachDraft.email1, practiceName, recipientName, lead.websiteUrl);
        await navigator.clipboard.writeText(finalText);
        showToast("Copied!");
      }
    } catch {
      // Fallback to legacy email1
      const finalText = replacePlaceholders(lead.outreachDraft.email1, practiceName, recipientName, lead.websiteUrl);
      await navigator.clipboard.writeText(finalText);
      showToast("Copied!");
    }
  };

  const copyAll = async (lead: Lead) => {
    if (!lead.outreachDraft) return;
    
    // Use modal values if modal is open for this lead, otherwise use lead values
    const practiceName = editModalLead?.id === lead.id ? editPracticeName : lead.name;
    const recipientName = editModalLead?.id === lead.id ? editRecipientName : (lead.recipientName || "");
    
    try {
      const versions: DraftVersions = JSON.parse(lead.outreachDraft.versionsJson || "{}");
      const audienceVersions = versions[selectedAudience];
      
      if (audienceVersions) {
        const separator = "\n\n" + "=".repeat(50) + "\n\n";
        const allContent = [
          `--- EMAIL 1 ---\n\n${replacePlaceholders(audienceVersions.email1, practiceName, recipientName, lead.websiteUrl)}`,
          `--- FOLLOW-UP 1 ---\n\n${replacePlaceholders(audienceVersions.followUp1, practiceName, recipientName, lead.websiteUrl)}`,
          `--- FOLLOW-UP 2 ---\n\n${replacePlaceholders(audienceVersions.followUp2, practiceName, recipientName, lead.websiteUrl)}`,
          `--- DM VERSION ---\n\n${replacePlaceholders(audienceVersions.dm, practiceName, recipientName, lead.websiteUrl)}`,
        ].join(separator);
        
        await navigator.clipboard.writeText(allContent);
        showToast("Copied all emails!");
      } else {
        const finalText = replacePlaceholders(lead.outreachDraft.email1, practiceName, recipientName, lead.websiteUrl);
        await navigator.clipboard.writeText(finalText);
        showToast("Copied!");
      }
    } catch {
      showToast("Failed to copy");
    }
  };

  const runBatchAudit = async () => {
    // Get top 10 NEW leads
    const newLeads = leads.filter((l) => l.status === "NEW").slice(0, 10);
    if (newLeads.length === 0) {
      alert("No NEW leads to audit");
      return;
    }

    setBatchAuditing(true);
    setBatchResult(null);

    try {
      const res = await fetch("/api/audit/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: newLeads.map((l) => l.id) }),
      });

      const data = await res.json();
      if (res.ok) {
        setBatchResult(data);
        fetchLeads();
      } else {
        alert(data.error || "Batch audit failed");
      }
    } catch {
      alert("Batch audit failed");
    } finally {
      setBatchAuditing(false);
    }
  };

  const newLeadsCount = leads.filter((l) => l.status === "NEW").length;
  const newLeadsWithUrl = leads.filter((l) => l.status === "NEW" && l.websiteUrl);

  // Selection helpers
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectTop10New = () => {
    const top10 = newLeadsWithUrl.slice(0, 10).map((l) => l.id);
    setSelectedIds(new Set(top10));
  };

  const selectRandom10New = () => {
    const shuffled = [...newLeadsWithUrl].sort(() => Math.random() - 0.5);
    const random10 = shuffled.slice(0, 10).map((l) => l.id);
    setSelectedIds(new Set(random10));
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const runBatchAuditSelected = async () => {
    if (selectedIds.size === 0) {
      alert("No leads selected");
      return;
    }

    setBatchAuditing(true);
    setBatchResult(null);

    try {
      const res = await fetch("/api/audit/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (res.ok) {
        setBatchResult(data);
        setSelectedIds(new Set());
        fetchLeads();
      } else {
        alert(data.error || "Batch audit failed");
      }
    } catch {
      alert("Batch audit failed");
    } finally {
      setBatchAuditing(false);
    }
  };

  // Batch draft functions
  const runBatchDraftSelected = async () => {
    if (selectedIds.size === 0) {
      alert("No leads selected");
      return;
    }

    setBatchDrafting(true);
    setBatchDraftResult(null);

    try {
      const res = await fetch("/api/draft/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: Array.from(selectedIds) }),
      });

      const data = await res.json();
      if (res.ok) {
        setBatchDraftResult(data);
        setSelectedIds(new Set());
        fetchLeads();
      } else {
        alert(data.error || "Batch draft generation failed");
      }
    } catch {
      alert("Batch draft generation failed");
    } finally {
      setBatchDrafting(false);
    }
  };

  const runBatchDraftTop10Audited = async () => {
    // Get top 10 AUDITED leads with score >= 6, sorted by score desc
    const eligibleLeads = leads
      .filter((l) => l.status === "AUDITED" && l.audit && l.audit.score >= 6)
      .sort((a, b) => (b.audit?.score || 0) - (a.audit?.score || 0))
      .slice(0, 10);

    if (eligibleLeads.length === 0) {
      alert("No AUDITED leads with score >= 6 found");
      return;
    }

    setBatchDrafting(true);
    setBatchDraftResult(null);

    try {
      const res = await fetch("/api/draft/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadIds: eligibleLeads.map((l) => l.id) }),
      });

      const data = await res.json();
      if (res.ok) {
        setBatchDraftResult(data);
        fetchLeads();
      } else {
        alert(data.error || "Batch draft generation failed");
      }
    } catch {
      alert("Batch draft generation failed");
    } finally {
      setBatchDrafting(false);
    }
  };

  // Computed values for UI
  const auditedLeadsWithMinScore = leads.filter(
    (l) => l.status === "AUDITED" && l.audit && l.audit.score >= 6
  );

  const statusColors: Record<string, string> = {
    NEW: "bg-gray-100 text-gray-800",
    AUDITED: "bg-blue-100 text-blue-800",
    DRAFTED: "bg-purple-100 text-purple-800",
    SENT: "bg-yellow-100 text-yellow-800",
    REPLIED: "bg-orange-100 text-orange-800",
    WON: "bg-green-100 text-green-800",
    LOST: "bg-red-100 text-red-800",
  };

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-gray-500">Loading leads...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-500">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Lead Dashboard</h1>

      {/* Add Lead Form */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Add Lead</h2>
        <form onSubmit={handleAddLead} className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Name *"
            value={newLead.name}
            onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
            className="border rounded px-3 py-2 flex-1 min-w-[200px]"
            required
          />
          <input
            type="text"
            placeholder="Website URL *"
            value={newLead.websiteUrl}
            onChange={(e) => setNewLead({ ...newLead, websiteUrl: e.target.value })}
            className="border rounded px-3 py-2 flex-1 min-w-[200px]"
            required
          />
          <input
            type="text"
            placeholder="City (optional)"
            value={newLead.city}
            onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
            className="border rounded px-3 py-2 w-[150px]"
          />
          <button
            type="submit"
            disabled={addingLead}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {addingLead ? "Adding..." : "Add Lead"}
          </button>
          <button
            type="button"
            onClick={createDemoLead}
            disabled={creatingDemo}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
            title="Create a demo lead with example.com to test the workflow"
          >
            {creatingDemo ? "Creating..." : "🧪 Create Demo Lead"}
          </button>
        </form>
      </div>

      {/* CSV Upload */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Import CSV</h2>
        <div className="flex items-center gap-4">
          <input
            type="file"
            accept=".csv"
            onChange={handleCsvUpload}
            disabled={uploading}
            className="border rounded px-3 py-2"
          />
          {uploading && <span className="text-gray-500">Uploading...</span>}
        </div>
        {importResult && (
          <div className="mt-3 text-sm">
            <p className="text-green-600">Inserted: {importResult.insertedCount}</p>
            {importResult.skippedCount > 0 && (
              <div className="text-yellow-600">
                <p>
                  Skipped: {importResult.skippedCount}
                  {(importResult.skippedByUrl || importResult.skippedByPhone) && (
                    <span className="text-xs ml-1">
                      ({importResult.skippedByUrl || 0} by URL, {importResult.skippedByPhone || 0} by phone)
                    </span>
                  )}
                </p>
              </div>
            )}
            {importResult.errors.length > 0 && (
              <div className="text-red-600 mt-1">
                <p>Validation Errors:</p>
                <ul className="list-disc list-inside">
                  {importResult.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>
                      Row {err.row}: {err.message}
                    </li>
                  ))}
                  {importResult.errors.length > 5 && (
                    <li>...and {importResult.errors.length - 5} more errors</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Batch Actions */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">Batch Actions</h2>

        {/* Audience Toggle */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b">
          <span className="text-sm font-medium text-gray-700">Copy emails for:</span>
          <div className="flex rounded-lg overflow-hidden border">
            <button
              onClick={() => setSelectedAudience("owner")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedAudience === "owner"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              👔 Owner
            </button>
            <button
              onClick={() => setSelectedAudience("front_desk")}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedAudience === "front_desk"
                  ? "bg-purple-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              🖥️ Front Desk
            </button>
          </div>
          <span className="text-xs text-gray-500">
            {selectedAudience === "owner"
              ? "Business-focused, patient experience messaging"
              : "Shorter, operational, 'who handles your website?'"}
          </span>
        </div>

        {/* Selection Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm text-gray-600 mr-2">Select:</span>
          <button
            onClick={selectTop10New}
            disabled={batchAuditing || newLeadsWithUrl.length === 0}
            className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Top 10 NEW ({Math.min(newLeadsWithUrl.length, 10)})
          </button>
          <button
            onClick={selectRandom10New}
            disabled={batchAuditing || newLeadsWithUrl.length === 0}
            className="text-sm bg-gray-200 text-gray-700 px-3 py-1 rounded hover:bg-gray-300 disabled:opacity-50"
          >
            Random 10 NEW
          </button>
          {selectedIds.size > 0 && (
            <button
              onClick={clearSelection}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear ({selectedIds.size})
            </button>
          )}
        </div>

        {/* Batch Audit Buttons */}
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <button
            onClick={runBatchAuditSelected}
            disabled={batchAuditing || batchDrafting || selectedIds.size === 0}
            className="bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
          >
            {batchAuditing
              ? "Auditing..."
              : `Batch Audit Selected (${selectedIds.size})`}
          </button>
          <button
            onClick={runBatchAudit}
            disabled={batchAuditing || batchDrafting || newLeadsCount === 0}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:opacity-50 text-sm"
          >
            Quick: Top 10 NEW
          </button>
          {batchAuditing && (
            <span className="text-gray-500 text-sm">
              This may take a few minutes...
            </span>
          )}
        </div>

        {/* Batch Draft Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={runBatchDraftSelected}
            disabled={batchDrafting || batchAuditing || selectedIds.size === 0}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
          >
            {batchDrafting
              ? "Generating..."
              : `Generate Drafts for Selected (${selectedIds.size})`}
          </button>
          <button
            onClick={runBatchDraftTop10Audited}
            disabled={batchDrafting || batchAuditing || auditedLeadsWithMinScore.length === 0}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 text-sm"
          >
            Generate Drafts for Top 10 Audited ({Math.min(auditedLeadsWithMinScore.length, 10)})
          </button>
          {batchDrafting && (
            <span className="text-gray-500 text-sm">
              Generating drafts...
            </span>
          )}
        </div>

        {/* Batch Audit Results */}
        {batchResult && (
          <div className="mt-3 text-sm">
            <p className="font-medium text-gray-700">Audit Results:</p>
            <p className="text-green-600">
              Succeeded: {batchResult.succeeded}/{batchResult.processed}
            </p>
            {batchResult.failed > 0 && (
              <p className="text-red-600">Failed: {batchResult.failed}</p>
            )}
            <div className="mt-2 text-xs text-gray-600">
              {batchResult.results.map((r) => (
                <div key={r.leadId}>
                  {r.success ? (
                    <span className="text-green-600">✓ Score: {r.score}/10</span>
                  ) : (
                    <span className="text-red-600">✗ {r.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Batch Draft Results */}
        {batchDraftResult && (
          <div className="mt-3 text-sm">
            <p className="font-medium text-gray-700">Draft Results:</p>
            <p className="text-green-600">
              Succeeded: {batchDraftResult.succeeded}/{batchDraftResult.processed}
            </p>
            {batchDraftResult.failed > 0 && (
              <p className="text-red-600">Failed: {batchDraftResult.failed}</p>
            )}
            <div className="mt-2 text-xs text-gray-600">
              {batchDraftResult.results.map((r) => (
                <div key={r.leadId}>
                  {r.success ? (
                    <span className="text-green-600">✓ Draft generated</span>
                  ) : (
                    <span className="text-red-600">✗ {r.error}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Leads Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-2 text-center w-10">
                <input
                  type="checkbox"
                  checked={selectedIds.size > 0 && selectedIds.size === leads.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(new Set(leads.map((l) => l.id)));
                    } else {
                      setSelectedIds(new Set());
                    }
                  }}
                  className="w-4 h-4"
                />
              </th>
              <th className="border px-4 py-2 text-left">Name</th>
              <th className="border px-4 py-2 text-left">Website</th>
              <th className="border px-4 py-2 text-left">City</th>
              <th className="border px-4 py-2 text-left">Status</th>
              <th className="border px-4 py-2 text-left">Score</th>
              <th className="border px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td colSpan={7} className="border px-4 py-8 text-center text-gray-500">
                  No leads yet. Add one above or import a CSV.
                </td>
              </tr>
            ) : (
              leads.map((lead) => (
                <tr
                  key={lead.id}
                  className={`hover:bg-gray-50 ${selectedIds.has(lead.id) ? "bg-indigo-50" : ""}`}
                >
                  <td className="border px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(lead.id)}
                      onChange={() => toggleSelection(lead.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="border px-4 py-2">
                    <div>
                      <span className="font-medium">{lead.name}</span>
                      {/* Contact dates */}
                      {(lead.lastContactedAt || lead.nextFollowUpAt) && (
                        <div className="text-xs text-gray-500 mt-0.5 space-y-0.5">
                          {lead.lastContactedAt && (
                            <div>
                              📅 Sent {new Date(lead.lastContactedAt).toLocaleDateString()}
                              {lead.contactMethod && (
                                <span className="text-gray-400"> via {CONTACT_METHOD_LABELS[lead.contactMethod]}</span>
                              )}
                            </div>
                          )}
                          {lead.nextFollowUpAt && (
                            <div className={
                              new Date(lead.nextFollowUpAt) <= new Date()
                                ? "text-orange-600 font-medium"
                                : ""
                            }>
                              ⏰ Follow-up {new Date(lead.nextFollowUpAt).toLocaleDateString()}
                              {new Date(lead.nextFollowUpAt) <= new Date() && " (overdue)"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="border px-4 py-2">
                    <a
                      href={lead.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline text-sm"
                    >
                      {lead.websiteUrl.replace("https://", "")}
                    </a>
                  </td>
                  <td className="border px-4 py-2">{lead.city || "-"}</td>
                  <td className="border px-4 py-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${statusColors[lead.status] || ""}`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="border px-4 py-2">
                    <div className="flex flex-col gap-1.5">
                      {/* Design Audit Score */}
                      {(lead.designAudit || lead.audit) && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-purple-600">🎨</span>
                          <span className={`font-medium text-sm ${
                            (lead.designAudit?.score || (lead.audit?.score || 0) * 10) >= 70 
                              ? "text-green-600" 
                              : (lead.designAudit?.score || (lead.audit?.score || 0) * 10) >= 50 
                              ? "text-yellow-600" 
                              : "text-red-600"
                          }`}>
                            {lead.designAudit?.score || (lead.audit?.score || 0) * 10}
                          </span>
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="text-xs text-blue-500 hover:underline"
                          >
                            Details
                          </button>
                        </div>
                      )}
                      {/* SEO Audit Score */}
                      {lead.seoAudit && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-blue-600">🔍</span>
                          <span className={`font-medium text-sm ${
                            lead.seoAudit.score >= 70 
                              ? "text-green-600" 
                              : lead.seoAudit.score >= 50 
                              ? "text-yellow-600" 
                              : "text-red-600"
                          }`}>
                            {lead.seoAudit.score}
                          </span>
                        </div>
                      )}
                      {/* No audits yet */}
                      {!lead.designAudit && !lead.seoAudit && !lead.audit && (
                        <span className="text-gray-400 text-sm">No audits</span>
                      )}
                    </div>
                  </td>
                  <td className="border px-4 py-2">
                    <div className="flex flex-wrap gap-1">
                      {/* Audit Buttons */}
                      {!lead.designAudit && !lead.audit && (
                        <button
                          onClick={() => runDesignAudit(lead.id)}
                          disabled={actionLoading[`design-${lead.id}`]}
                          className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 disabled:opacity-50"
                          title="Run design & UX audit"
                        >
                          {actionLoading[`design-${lead.id}`] ? "..." : "🎨 Design"}
                        </button>
                      )}
                      {!lead.seoAudit && (
                        <button
                          onClick={() => runSeoAudit(lead.id)}
                          disabled={actionLoading[`seo-${lead.id}`]}
                          className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                          title="Run SEO audit"
                        >
                          {actionLoading[`seo-${lead.id}`] ? "..." : "🔍 SEO"}
                        </button>
                      )}
                      {/* Legacy audit fallback */}
                      {!lead.audit && !lead.designAudit && !lead.seoAudit && (
                        <button
                          onClick={() => runAudit(lead.id)}
                          disabled={actionLoading[`audit-${lead.id}`]}
                          className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
                          title="Run legacy audit"
                        >
                          {actionLoading[`audit-${lead.id}`] ? "..." : "Quick Audit"}
                        </button>
                      )}
                      {/* Report Generation */}
                      {(lead.designAudit || lead.audit) && (
                        <button
                          onClick={() => generateReport(lead.id, "design")}
                          disabled={actionLoading[`report-${lead.id}`]}
                          className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700 disabled:opacity-50"
                          title="Generate shareable design report"
                        >
                          {actionLoading[`report-${lead.id}`] ? "..." : "📄 Report"}
                        </button>
                      )}
                      {/* Generate Draft - show if audited but no draft */}
                      {(lead.audit || lead.designAudit) && !lead.outreachDraft && (
                        <button
                          onClick={() => generateDraft(lead.id)}
                          disabled={actionLoading[`draft-${lead.id}`]}
                          className="text-xs bg-indigo-500 text-white px-2 py-1 rounded hover:bg-indigo-600 disabled:opacity-50"
                        >
                          {actionLoading[`draft-${lead.id}`] ? "..." : "✍️ Draft"}
                        </button>
                      )}
                      {lead.outreachDraft && (
                        <div className="flex flex-wrap gap-1">
                          <button
                            onClick={() => openEditModal(lead)}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                            title="Edit recipient name before copying"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => copyEmail(lead, "email1")}
                            className="text-xs bg-gray-600 text-white px-2 py-1 rounded hover:bg-gray-700"
                          >
                            Copy Email 1
                          </button>
                          <button
                            onClick={() => copyEmail(lead, "followUp1")}
                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                          >
                            Copy Follow-up 1
                          </button>
                          <button
                            onClick={() => copyEmail(lead, "followUp2")}
                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                          >
                            Copy Follow-up 2
                          </button>
                          <button
                            onClick={() => copyAll(lead)}
                            className="text-xs bg-purple-600 text-white px-2 py-1 rounded hover:bg-purple-700"
                          >
                            Copy All
                          </button>
                        </div>
                      )}
                      {lead.status === "DRAFTED" && (
                        <button
                          onClick={() => openSendDrawer(lead)}
                          className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600"
                        >
                          📤 Mark Sent
                        </button>
                      )}
                      {lead.status === "SENT" && (
                        <>
                          <button
                            onClick={() => markFollowUp1Sent(lead.id)}
                            disabled={actionLoading[`fu1-${lead.id}`]}
                            className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 disabled:opacity-50"
                            title="Mark Follow-up 1 as sent (schedules follow-up 2 in 3 days)"
                          >
                            {actionLoading[`fu1-${lead.id}`] ? "..." : "Sent F/U 1"}
                          </button>
                          <button
                            onClick={() => markFollowUp2Sent(lead.id)}
                            disabled={actionLoading[`fu2-${lead.id}`]}
                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600 disabled:opacity-50"
                            title="Mark Follow-up 2 as sent (no more follow-ups)"
                          >
                            {actionLoading[`fu2-${lead.id}`] ? "..." : "Sent F/U 2"}
                          </button>
                          <button
                            onClick={() => updateStatus(lead.id, "REPLIED")}
                            disabled={actionLoading[lead.id]}
                            className="text-xs bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600 disabled:opacity-50"
                          >
                            Mark Replied
                          </button>
                        </>
                      )}
                      {(lead.status === "SENT" || lead.status === "REPLIED") && (
                        <>
                          <button
                            onClick={() => updateStatus(lead.id, "WON")}
                            disabled={actionLoading[lead.id]}
                            className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 disabled:opacity-50"
                          >
                            Mark Won
                          </button>
                          <button
                            onClick={() => updateStatus(lead.id, "LOST")}
                            disabled={actionLoading[lead.id]}
                            className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 disabled:opacity-50"
                          >
                            Mark Lost
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-gray-500">Total leads: {leads.length}</p>
        <a
          href="/api/export"
          download
          className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 text-sm"
        >
          Export CSV
        </a>
      </div>

      {/* Audit Details Modal */}
      {selectedLead?.audit && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedLead(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">{selectedLead.name}</h2>
                <p className="text-sm text-gray-500">{selectedLead.websiteUrl}</p>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="mb-4">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-2xl font-bold">Score: {selectedLead.audit.score}/10</span>
                {selectedLead.audit.error && (
                  <span className="text-red-600 text-sm bg-red-50 px-2 py-1 rounded">
                    Error: {selectedLead.audit.error}
                  </span>
                )}
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Findings</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {JSON.parse(selectedLead.audit.findingsJson || "[]").map(
                  (finding: string, i: number) => (
                    <li key={i} className="text-gray-700">
                      {finding}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Extracted Data</h3>
              <div className="bg-gray-50 rounded p-3 text-xs font-mono overflow-x-auto">
                <pre>
                  {JSON.stringify(
                    JSON.parse(selectedLead.audit.extractedJson || "{}"),
                    null,
                    2
                  )}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Checklist Drawer */}
      {sendDrawerLead && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50"
          onClick={closeSendDrawer}
        >
          <div
            className="bg-white rounded-t-xl sm:rounded-xl p-6 w-full sm:max-w-md mx-0 sm:mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Send Checklist</h2>
                <p className="text-sm text-gray-500">{sendDrawerLead.name}</p>
              </div>
              <button
                onClick={closeSendDrawer}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Previous contact info */}
            {sendDrawerLead.lastContactedAt && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
                <p className="text-gray-600">
                  <span className="font-medium">Last contacted:</span>{" "}
                  {new Date(sendDrawerLead.lastContactedAt).toLocaleDateString()}
                  {sendDrawerLead.contactMethod && ` via ${CONTACT_METHOD_LABELS[sendDrawerLead.contactMethod]}`}
                </p>
                {sendDrawerLead.nextFollowUpAt && (
                  <p className="text-gray-600 mt-1">
                    <span className="font-medium">Follow-up scheduled:</span>{" "}
                    {new Date(sendDrawerLead.nextFollowUpAt).toLocaleDateString()}
                  </p>
                )}
                {sendDrawerLead.notes && (
                  <p className="text-gray-500 mt-1">
                    <span className="font-medium">Notes:</span> {sendDrawerLead.notes}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-4">
              {/* Contact Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How did you contact them? *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["EMAIL", "CONTACT_FORM", "IG_DM", "PHONE", "OTHER"] as ContactMethod[]).map((method) => (
                    <button
                      key={method}
                      onClick={() => setSendContactMethod(method)}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        sendContactMethod === method
                          ? "bg-yellow-500 text-white border-yellow-500"
                          : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {method === "EMAIL" && "📧 "}
                      {method === "CONTACT_FORM" && "📝 "}
                      {method === "IG_DM" && "📱 "}
                      {method === "PHONE" && "📞 "}
                      {method === "OTHER" && "💬 "}
                      {CONTACT_METHOD_LABELS[method]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Next Follow-up */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Schedule follow-up
                </label>
                <input
                  type="date"
                  value={sendNextFollowUp}
                  onChange={(e) => setSendNextFollowUp(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-gray-500 mt-1">
                  When should you follow up if no response?
                </p>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={sendNotes}
                  onChange={(e) => setSendNotes(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                  placeholder="e.g., Spoke with front desk, left voicemail, sent via their contact form..."
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t flex gap-3">
              <button
                onClick={closeSendDrawer}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submitSendChecklist}
                disabled={sendingChecklist}
                className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-50 font-medium"
              >
                {sendingChecklist ? "Saving..." : "✓ Mark as Sent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal for customizing placeholders */}
      {editModalLead && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeEditModal}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold">Customize Email</h2>
                <p className="text-sm text-gray-500">Edit names before copying</p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Practice Name
                </label>
                <input
                  type="text"
                  value={editPracticeName}
                  onChange={(e) => setEditPracticeName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="Practice name"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Replaces {"{{PracticeName}}"} in emails
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Name <span className="text-gray-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={editRecipientName}
                  onChange={(e) => setEditRecipientName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="e.g., Dr. Smith, Sarah"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Replaces {"{{Name}}"} in emails. If blank, uses &quot;there&quot;
                </p>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <button
                  onClick={saveRecipientName}
                  disabled={savingRecipient}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {savingRecipient ? "Saving..." : "💾 Save recipient for later"}
                </button>
                {editModalLead.recipientName && (
                  <span className="text-xs text-gray-500">
                    Saved: {editModalLead.recipientName}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-3">Copy with these names:</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => copyEmail(editModalLead, "email1")}
                  className="text-sm bg-gray-600 text-white px-3 py-2 rounded hover:bg-gray-700"
                >
                  📧 Email 1
                </button>
                <button
                  onClick={() => copyEmail(editModalLead, "followUp1")}
                  className="text-sm bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
                >
                  Follow-up 1
                </button>
                <button
                  onClick={() => copyEmail(editModalLead, "followUp2")}
                  className="text-sm bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
                >
                  Follow-up 2
                </button>
                <button
                  onClick={() => copyEmail(editModalLead, "dm")}
                  className="text-sm bg-gray-500 text-white px-3 py-2 rounded hover:bg-gray-600"
                >
                  DM
                </button>
                <button
                  onClick={() => copyAll(editModalLead)}
                  className="text-sm bg-purple-600 text-white px-3 py-2 rounded hover:bg-purple-700"
                >
                  Copy All
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Audience: {selectedAudience === "owner" ? "👔 Owner" : "🖥️ Front Desk"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <span className="text-green-400">✓</span>
            <span>{toast}</span>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}

