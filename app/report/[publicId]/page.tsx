"use client";

import { useState, useEffect, use, useRef } from "react";

type Finding = {
  category: string;
  issue: string;
  impact: "critical" | "major" | "moderate" | "minor";
  recommendation: string;
};

type AuditData = {
  score: number;
  findings: Finding[] | string[];
  createdAt: string;
};

type ReportData = {
  id: string;
  publicId: string;
  type: "design" | "seo" | "full";
  createdAt: string;
  lead: {
    name: string;
    websiteUrl: string;
    city: string | null;
  };
  data: {
    generatedAt: string;
    designAudit: AuditData | null;
    seoAudit: AuditData | null;
  };
};

export default function ReportPage({ params }: { params: Promise<{ publicId: string }> }) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!reportRef.current || !report) return;
    
    setDownloading(true);
    try {
      const html2pdf = (await import("html2pdf.js")).default;
      
      const element = reportRef.current.cloneNode(true) as HTMLElement;
      element.querySelectorAll('.no-print').forEach(el => el.remove());
      element.querySelectorAll('button').forEach(el => el.remove());
      
      const opt = {
        margin: [0.4, 0.5, 0.4, 0.5] as [number, number, number, number],
        filename: `${report.lead.name.replace(/\s+/g, "_")}_Audit.pdf`,
        image: { type: "jpeg" as const, quality: 0.95 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
        },
        jsPDF: { unit: "in" as const, format: "letter" as const, orientation: "portrait" as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      window.print();
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch(`/api/report/${resolvedParams.publicId}`);
        if (!res.ok) {
          setError(res.status === 404 ? "Report not found" : "Failed to load report");
          return;
        }
        setReport(await res.json());
      } catch {
        setError("Failed to load report");
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [resolvedParams.publicId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-center">
        <div>
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-xl font-bold text-gray-900">Report Not Found</h1>
        </div>
      </div>
    );
  }

  const { lead, data, createdAt } = report;
  const overallScore = Math.round(
    ((data.designAudit?.score || 0) + (data.seoAudit?.score || 0)) /
      (data.designAudit && data.seoAudit ? 2 : 1)
  );

  // Get top issues (critical and major only, max 6)
  const allFindings: Finding[] = [
    ...(data.designAudit?.findings || []),
    ...(data.seoAudit?.findings || []),
  ].map((f) =>
    typeof f === "string"
      ? { category: "General", issue: f, impact: "major" as const, recommendation: "" }
      : f
  );

  const topIssues = allFindings
    .filter((f) => f.impact === "critical" || f.impact === "major")
    .slice(0, 6);

  const getScoreColor = (s: number) => {
    if (s >= 70) return "#22c55e";
    if (s >= 50) return "#f59e0b";
    return "#ef4444";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 70) return "Good";
    if (s >= 50) return "Needs Improvement";
    return "Needs Attention";
  };

  return (
    <>
      {/* Download Button - Fixed at top, hidden in PDF */}
      <div className="no-print fixed top-20 right-4 z-50">
        <button
          onClick={downloadPDF}
          disabled={downloading}
          className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold shadow-xl flex items-center gap-2"
        >
          {downloading ? "⏳ Generating..." : "⬇️ Download PDF"}
        </button>
      </div>

      {/* Single Page Report */}
      <div ref={reportRef} className="bg-white min-h-screen" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ maxWidth: "8in", margin: "0 auto", padding: "0.5in" }}>
          
          {/* Header */}
          <div style={{ borderBottom: "3px solid #1e293b", paddingBottom: "16px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "4px" }}>
                  Website Audit Report
                </div>
                <h1 style={{ fontSize: "28px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>
                  {lead.name}
                </h1>
                <div style={{ fontSize: "13px", color: "#6366f1", marginTop: "4px" }}>
                  {lead.websiteUrl.replace(/^https?:\/\//, "")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ 
                  fontSize: "48px", 
                  fontWeight: "900", 
                  color: getScoreColor(overallScore),
                  lineHeight: 1
                }}>
                  {overallScore}
                </div>
                <div style={{ fontSize: "11px", color: "#64748b", textTransform: "uppercase" }}>
                  Overall Score
                </div>
                <div style={{ fontSize: "12px", fontWeight: "600", color: getScoreColor(overallScore) }}>
                  {getScoreLabel(overallScore)}
                </div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px" }}>
            {data.designAudit && (
              <div style={{ 
                flex: 1, 
                backgroundColor: "#faf5ff", 
                border: "1px solid #e9d5ff",
                borderRadius: "8px", 
                padding: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#7c3aed" }}>
                  {data.designAudit.score}
                </div>
                <div style={{ fontSize: "11px", color: "#7c3aed", fontWeight: "500" }}>
                  Design Score
                </div>
              </div>
            )}
            {data.seoAudit && (
              <div style={{ 
                flex: 1, 
                backgroundColor: "#eff6ff", 
                border: "1px solid #bfdbfe",
                borderRadius: "8px", 
                padding: "12px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "24px", fontWeight: "bold", color: "#2563eb" }}>
                  {data.seoAudit.score}
                </div>
                <div style={{ fontSize: "11px", color: "#2563eb", fontWeight: "500" }}>
                  SEO Score
                </div>
              </div>
            )}
            <div style={{ 
              flex: 1, 
              backgroundColor: "#fef3c7", 
              border: "1px solid #fcd34d",
              borderRadius: "8px", 
              padding: "12px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "24px", fontWeight: "bold", color: "#d97706" }}>
                {allFindings.length}
              </div>
              <div style={{ fontSize: "11px", color: "#d97706", fontWeight: "500" }}>
                Issues Found
              </div>
            </div>
          </div>

          {/* Key Issues */}
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: "bold", color: "#1e293b", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span>🚨</span> Priority Issues to Address
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {topIssues.map((issue, i) => (
                <div key={i} style={{ 
                  backgroundColor: issue.impact === "critical" ? "#fef2f2" : "#fff7ed",
                  borderLeft: `3px solid ${issue.impact === "critical" ? "#dc2626" : "#f97316"}`,
                  padding: "10px 12px",
                  borderRadius: "0 6px 6px 0"
                }}>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: "#1e293b", marginBottom: "2px" }}>
                    {issue.issue}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {issue.category} • {issue.impact === "critical" ? "🔴 Critical" : "🟠 Major"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div style={{ 
            backgroundColor: "#f8fafc", 
            borderRadius: "8px", 
            padding: "16px",
            marginBottom: "24px"
          }}>
            <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px" }}>
              📋 Summary
            </h2>
            <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: 0 }}>
              Our analysis of <strong>{lead.name}</strong>&apos;s website identified {allFindings.length} areas for improvement. 
              {overallScore < 60 
                ? " The current website has significant issues that are likely impacting user experience and search visibility. A professional redesign would help convert more visitors into patients."
                : overallScore < 75
                ? " While the site is functional, there are opportunities to improve user experience and search rankings that could increase conversions."
                : " The website is performing reasonably well, with some minor optimizations available."}
            </p>
          </div>

          {/* Next Steps */}
          <div style={{ 
            backgroundColor: "#f0fdf4", 
            border: "2px solid #86efac",
            borderRadius: "8px", 
            padding: "16px",
            marginBottom: "24px"
          }}>
            <h2 style={{ fontSize: "14px", fontWeight: "bold", color: "#166534", marginBottom: "10px" }}>
              ✅ Recommended Next Steps
            </h2>
            <div style={{ fontSize: "12px", color: "#166534" }}>
              <div style={{ marginBottom: "6px" }}>
                <strong>1.</strong> Address the critical and major issues listed above
              </div>
              <div style={{ marginBottom: "6px" }}>
                <strong>2.</strong> Consider a professional website redesign for maximum impact
              </div>
              <div>
                <strong>3.</strong> Schedule a free consultation to discuss your options
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            borderTop: "1px solid #e2e8f0", 
            paddingTop: "12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ fontSize: "11px", color: "#94a3b8" }}>
              <strong style={{ color: "#64748b" }}>Website Audit Report</strong>
              <br />
              Prepared for {lead.name} • {new Date(createdAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "28px", fontWeight: "900", color: getScoreColor(overallScore) }}>
                {overallScore}/100
              </div>
            </div>
          </div>

        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          button { display: none !important; }
        }
      `}</style>
    </>
  );
}
