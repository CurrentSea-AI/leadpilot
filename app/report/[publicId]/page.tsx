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

const impactColors = {
  critical: "bg-red-600 text-white",
  major: "bg-orange-500 text-white",
  moderate: "bg-yellow-500 text-black",
  minor: "bg-blue-500 text-white",
};

const impactLabels = {
  critical: "🚨 Critical",
  major: "⚠️ Major",
  moderate: "📌 Moderate",
  minor: "💡 Minor",
};

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "#22c55e"; // green
    if (s >= 60) return "#eab308"; // yellow
    if (s >= 40) return "#f97316"; // orange
    return "#ef4444"; // red
  };

  const getScoreLabel = (s: number) => {
    if (s >= 80) return "Excellent";
    if (s >= 60) return "Good";
    if (s >= 40) return "Needs Work";
    return "Poor";
  };

  return (
    <div className="text-center">
      <div className="relative w-24 h-24 mx-auto mb-2">
        <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={getScoreColor(score)}
            strokeWidth="8"
            strokeDasharray={`${score * 2.51} 251`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color: getScoreColor(score) }}>
            {score}
          </span>
          <span className="text-[10px] text-gray-500">/100</span>
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-700">{label}</div>
      <div className="text-xs" style={{ color: getScoreColor(score) }}>{getScoreLabel(score)}</div>
    </div>
  );
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  return (
    <div className="border-l-4 bg-white p-4 mb-3" style={{ 
      borderLeftColor: finding.impact === "critical" ? "#dc2626" : 
                       finding.impact === "major" ? "#f97316" : 
                       finding.impact === "moderate" ? "#eab308" : "#3b82f6",
      boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
    }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className={`text-xs px-2 py-1 rounded font-bold ${impactColors[finding.impact]}`}>
          {impactLabels[finding.impact]}
        </span>
        <span className="text-xs text-gray-400 uppercase tracking-wide">
          {finding.category}
        </span>
      </div>
      <h4 className="font-bold text-gray-900 text-base mb-2">{finding.issue}</h4>
      {finding.recommendation && (
        <div className="bg-gray-50 p-3 rounded">
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-green-700">✓ Fix:</span>{" "}
            {finding.recommendation}
          </p>
        </div>
      )}
    </div>
  );
}

function AuditSection({
  title,
  icon,
  audit,
  color,
}: {
  title: string;
  icon: string;
  audit: AuditData;
  color: string;
}) {
  // Normalize findings - handle both new format (objects) and legacy format (strings)
  const findings: Finding[] = audit.findings.map((f) =>
    typeof f === "string"
      ? { category: "General", issue: f, impact: "major" as const, recommendation: "" }
      : f
  );

  const criticalCount = findings.filter((f) => f.impact === "critical").length;
  const majorCount = findings.filter((f) => f.impact === "major").length;

  return (
    <div className="mb-10">
      {/* Section Header */}
      <div style={{ backgroundColor: "#f1f5f9" }} className="p-4 rounded-t-lg border-b-2 border-gray-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <div>
              <h2 className={`text-xl font-bold ${color}`}>{title}</h2>
              <p className="text-xs text-gray-600 mt-1">
                {criticalCount > 0 && (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded mr-2 font-medium">
                    {criticalCount} critical
                  </span>
                )}
                {majorCount > 0 && (
                  <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded mr-2 font-medium">
                    {majorCount} major
                  </span>
                )}
                <span className="text-gray-500">{findings.length} total issues</span>
              </p>
            </div>
          </div>
          <ScoreGauge score={audit.score} label="Score" />
        </div>
      </div>

      {/* Findings List */}
      <div className="border border-t-0 border-gray-200 rounded-b-lg p-4 bg-white">
        {findings.map((finding, i) => (
          <FindingCard key={i} finding={finding} index={i} />
        ))}
      </div>
    </div>
  );
}

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
      // Dynamically import html2pdf to avoid SSR issues
      const html2pdf = (await import("html2pdf.js")).default;
      
      // Clone the element and remove buttons/no-print elements
      const element = reportRef.current.cloneNode(true) as HTMLElement;
      
      // Remove all elements with no-print class
      element.querySelectorAll('.no-print').forEach(el => el.remove());
      // Remove all buttons
      element.querySelectorAll('button').forEach(el => el.remove());
      
      const opt = {
        margin: [0.3, 0.3, 0.3, 0.3] as [number, number, number, number],
        filename: `${report.lead.name.replace(/\s+/g, "_")}_Website_Audit.pdf`,
        image: { type: "jpeg" as const, quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
        },
        jsPDF: { unit: "in" as const, format: "letter" as const, orientation: "portrait" as const },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] as const },
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("PDF generation failed:", err);
      // Fallback to print
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
          if (res.status === 404) {
            setError("Report not found");
          } else {
            setError("Failed to load report");
          }
          return;
        }
        const data = await res.json();
        setReport(data);
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
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Report Not Found</h1>
          <p className="text-gray-600">{error || "This report may have been removed or the link is invalid."}</p>
        </div>
      </div>
    );
  }

  const { lead, data, type, createdAt } = report;
  const overallScore = Math.round(
    ((data.designAudit?.score || 0) + (data.seoAudit?.score || 0)) /
      (data.designAudit && data.seoAudit ? 2 : 1)
  );

  return (
    <div ref={reportRef} className="min-h-screen bg-white">
      {/* Header - Using solid colors for better PDF rendering */}
      <div style={{ backgroundColor: "#1e293b" }} className="text-white py-10 px-6">
        <div className="max-w-4xl mx-auto">
          {/* Branding */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <span className="text-2xl">📊</span>
              <span className="text-lg font-bold">Website Audit Report</span>
            </div>
            <div className="text-xs text-slate-400">
              Generated {new Date(createdAt).toLocaleDateString()}
            </div>
          </div>
          
          {/* Business Name */}
          <h1 className="text-3xl md:text-4xl font-bold mb-1">{lead.name}</h1>
          <p className="text-blue-300 text-sm mb-6">
            {lead.websiteUrl.replace(/^https?:\/\//, "")}
          </p>
          
          {/* Scores Row */}
          <div className="flex flex-wrap items-center gap-4">
            <div style={{ backgroundColor: "#334155" }} className="rounded-lg px-5 py-3 text-center">
              <div className="text-4xl font-bold">{overallScore}</div>
              <div className="text-xs text-slate-300 uppercase tracking-wide">Overall</div>
            </div>
            {data.designAudit && (
              <div style={{ backgroundColor: "#334155" }} className="rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold">{data.designAudit.score}</div>
                <div className="text-xs text-slate-300">Design</div>
              </div>
            )}
            {data.seoAudit && (
              <div style={{ backgroundColor: "#334155" }} className="rounded-lg px-4 py-3 text-center">
                <div className="text-2xl font-bold">{data.seoAudit.score}</div>
                <div className="text-xs text-slate-300">SEO</div>
              </div>
            )}
            
            {/* Action Buttons - Hidden in PDF */}
            <div className="ml-auto flex items-center gap-3 no-print">
              <button
                onClick={downloadPDF}
                disabled={downloading}
                style={{ backgroundColor: "#4f46e5" }}
                className="hover:opacity-90 px-4 py-2 rounded-lg text-sm font-medium transition-opacity flex items-center gap-2 disabled:opacity-50"
              >
                {downloading ? "⏳ Generating..." : "📄 Download PDF"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }}
                style={{ backgroundColor: "#475569" }}
                className="hover:opacity-90 px-4 py-2 rounded-lg text-sm font-medium transition-opacity flex items-center gap-2"
              >
                🔗 Copy Link
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Summary */}
        <div style={{ backgroundColor: "#f8fafc", borderLeft: "4px solid #4f46e5" }} className="p-6 mb-10">
          <h2 className="text-xl font-bold text-gray-900 mb-3">📋 Executive Summary</h2>
          <p className="text-gray-700 leading-relaxed text-base">
            We analyzed <strong>{lead.name}</strong>&apos;s website and identified{" "}
            <strong className="text-indigo-700">
              {(data.designAudit?.findings.length || 0) + (data.seoAudit?.findings.length || 0)} issues
            </strong>{" "}
            that could be improved. Your overall score of <strong className="text-indigo-700">{overallScore}/100</strong>{" "}
            {overallScore >= 80
              ? "shows a well-optimized website with minor improvements possible."
              : overallScore >= 60
              ? "indicates a functional website with several areas that need attention."
              : overallScore >= 40
              ? "reveals significant issues that are likely affecting your business."
              : "highlights critical problems that require immediate attention."}
          </p>
          {overallScore < 70 && (
            <div style={{ backgroundColor: "#fef3c7", borderLeft: "4px solid #f59e0b" }} className="mt-4 p-4">
              <p className="text-amber-900 text-sm">
                <strong>💡 Key Insight:</strong> Websites scoring below 70 typically see 30-50% fewer
                conversions than optimized competitors. Addressing the issues below
                could significantly improve your results.
              </p>
            </div>
          )}
        </div>

        {/* Design Audit */}
        {data.designAudit && (type === "design" || type === "full") && (
          <AuditSection
            title="Design & User Experience"
            icon="🎨"
            audit={data.designAudit}
            color="text-purple-700"
          />
        )}

        {/* SEO Audit */}
        {data.seoAudit && (type === "seo" || type === "full") && (
          <AuditSection
            title="Search Engine Optimization"
            icon="🔍"
            audit={data.seoAudit}
            color="text-blue-700"
          />
        )}

        {/* CTA */}
        <div style={{ backgroundColor: "#4f46e5" }} className="rounded-lg p-8 text-white text-center mt-10">
          <h2 className="text-2xl font-bold mb-3">🚀 Ready to Fix These Issues?</h2>
          <p className="text-indigo-100 mb-6 max-w-lg mx-auto">
            We specialize in helping businesses like yours improve their online presence.
            Let&apos;s discuss how we can help you convert more visitors into customers.
          </p>
          <div style={{ backgroundColor: "white", color: "#4f46e5" }} className="inline-block font-bold px-6 py-3 rounded-lg">
            📞 Contact Us for a Free Consultation
          </div>
        </div>

        {/* Footer */}
        <div className="mt-10 pt-6 border-t-2 border-gray-200 text-center text-sm text-gray-500">
          <p className="font-medium text-gray-600">This audit report was prepared specifically for {lead.name}</p>
          <p className="mt-1 text-xs">
            Report ID: {report.publicId} · Generated {new Date(createdAt).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print {
            display: none !important;
          }
          button {
            display: none !important;
          }
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  );
}


