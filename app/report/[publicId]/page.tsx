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
    .slice(0, 4);

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

      {/* Single Page Report - Compact for one page */}
      <div ref={reportRef} className="bg-white" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <div style={{ maxWidth: "7.5in", margin: "0 auto", padding: "0.3in 0.4in" }}>
          
          {/* Header */}
          <div style={{ borderBottom: "2px solid #1e293b", paddingBottom: "12px", marginBottom: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "2px" }}>
                  Website Audit Report
                </div>
                <h1 style={{ fontSize: "24px", fontWeight: "bold", color: "#1e293b", margin: 0 }}>
                  {lead.name}
                </h1>
                <div style={{ fontSize: "12px", color: "#6366f1", marginTop: "2px" }}>
                  {lead.websiteUrl.replace(/^https?:\/\//, "")}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ 
                  fontSize: "42px", 
                  fontWeight: "900", 
                  color: getScoreColor(overallScore),
                  lineHeight: 1
                }}>
                  {overallScore}
                </div>
                <div style={{ fontSize: "10px", color: "#64748b", textTransform: "uppercase" }}>
                  Overall Score
                </div>
              </div>
            </div>
          </div>

          {/* Score Breakdown */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
            {data.designAudit && (
              <div style={{ 
                flex: 1, 
                backgroundColor: "#faf5ff", 
                border: "1px solid #e9d5ff",
                borderRadius: "6px", 
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#7c3aed" }}>
                  {data.designAudit.score}
                </div>
                <div style={{ fontSize: "9px", color: "#7c3aed", fontWeight: "500" }}>
                  DESIGN
                </div>
              </div>
            )}
            {data.seoAudit && (
              <div style={{ 
                flex: 1, 
                backgroundColor: "#eff6ff", 
                border: "1px solid #bfdbfe",
                borderRadius: "6px", 
                padding: "8px",
                textAlign: "center"
              }}>
                <div style={{ fontSize: "20px", fontWeight: "bold", color: "#2563eb" }}>
                  {data.seoAudit.score}
                </div>
                <div style={{ fontSize: "9px", color: "#2563eb", fontWeight: "500" }}>
                  SEO
                </div>
              </div>
            )}
            <div style={{ 
              flex: 1, 
              backgroundColor: "#fef3c7", 
              border: "1px solid #fcd34d",
              borderRadius: "6px", 
              padding: "8px",
              textAlign: "center"
            }}>
              <div style={{ fontSize: "20px", fontWeight: "bold", color: "#d97706" }}>
                {allFindings.length}
              </div>
              <div style={{ fontSize: "9px", color: "#d97706", fontWeight: "500" }}>
                ISSUES
              </div>
            </div>
          </div>

          {/* Key Issues */}
          <div style={{ marginBottom: "14px" }}>
            <h2 style={{ fontSize: "13px", fontWeight: "bold", color: "#1e293b", marginBottom: "8px" }}>
              🚨 Priority Issues
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
              {topIssues.map((issue, i) => (
                <div key={i} style={{ 
                  backgroundColor: issue.impact === "critical" ? "#fef2f2" : "#fff7ed",
                  borderLeft: `3px solid ${issue.impact === "critical" ? "#dc2626" : "#f97316"}`,
                  padding: "6px 10px",
                  borderRadius: "0 4px 4px 0"
                }}>
                  <div style={{ fontSize: "11px", fontWeight: "600", color: "#1e293b" }}>
                    {issue.issue}
                  </div>
                  <div style={{ fontSize: "9px", color: "#64748b" }}>
                    {issue.impact === "critical" ? "🔴 Critical" : "🟠 Major"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary + Next Steps Combined */}
          <div style={{ display: "flex", gap: "12px", marginBottom: "14px" }}>
            <div style={{ 
              flex: 1,
              backgroundColor: "#f8fafc", 
              borderRadius: "6px", 
              padding: "12px"
            }}>
              <h2 style={{ fontSize: "12px", fontWeight: "bold", color: "#1e293b", marginBottom: "6px" }}>
                📋 Summary
              </h2>
              <p style={{ fontSize: "11px", color: "#475569", lineHeight: "1.4", margin: 0 }}>
                We identified <strong>{allFindings.length} issues</strong> on {lead.name}&apos;s website. 
                {overallScore < 60 
                  ? " Significant issues are impacting conversions. A redesign is recommended."
                  : overallScore < 75
                  ? " There are opportunities to improve user experience and search rankings."
                  : " Minor optimizations available."}
              </p>
            </div>
            <div style={{ 
              flex: 1,
              backgroundColor: "#f0fdf4", 
              border: "1px solid #86efac",
              borderRadius: "6px", 
              padding: "12px"
            }}>
              <h2 style={{ fontSize: "12px", fontWeight: "bold", color: "#166534", marginBottom: "6px" }}>
                ✅ Next Steps
              </h2>
              <div style={{ fontSize: "10px", color: "#166534", lineHeight: "1.5" }}>
                <div><strong>1.</strong> Fix critical issues above</div>
                <div><strong>2.</strong> Consider a professional redesign</div>
                <div><strong>3.</strong> Schedule a free consultation</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ 
            borderTop: "1px solid #e2e8f0", 
            paddingTop: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>
              Prepared for <strong style={{ color: "#64748b" }}>{lead.name}</strong> • {new Date(createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>
              Score: <strong style={{ color: getScoreColor(overallScore) }}>{overallScore}/100</strong>
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
