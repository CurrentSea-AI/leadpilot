"use client";

import { useState, useEffect, use, useRef } from "react";
import dynamic from "next/dynamic";

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
  critical: "bg-red-100 text-red-800 border-red-200",
  major: "bg-orange-100 text-orange-800 border-orange-200",
  moderate: "bg-yellow-100 text-yellow-800 border-yellow-200",
  minor: "bg-blue-100 text-blue-800 border-blue-200",
};

const impactLabels = {
  critical: "Critical",
  major: "Major",
  moderate: "Moderate",
  minor: "Minor",
};

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-600";
    if (s >= 60) return "text-yellow-600";
    if (s >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    if (s >= 40) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="text-center">
      <div className="relative w-32 h-32 mx-auto mb-3">
        <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="12"
          />
          <circle
            cx="60"
            cy="60"
            r="50"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeDasharray={`${score * 3.14} 314`}
            strokeLinecap="round"
            className={getScoreColor(score)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${getScoreColor(score)}`}>
            {score}
          </span>
        </div>
      </div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
        <div
          className={`h-2 rounded-full transition-all ${getScoreBg(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function FindingCard({ finding, index }: { finding: Finding; index: number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
            {finding.category}
          </span>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded border font-medium ${
            impactColors[finding.impact]
          }`}
        >
          {impactLabels[finding.impact]}
        </span>
      </div>
      <h4 className="font-semibold text-gray-900 mb-2">{finding.issue}</h4>
      {finding.recommendation && (
        <p className="text-sm text-gray-600 leading-relaxed">
          <span className="font-medium text-gray-700">Recommendation:</span>{" "}
          {finding.recommendation}
        </p>
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
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{icon}</span>
        <div>
          <h2 className={`text-2xl font-bold ${color}`}>{title}</h2>
          <p className="text-sm text-gray-500">
            {criticalCount > 0 && (
              <span className="text-red-600 font-medium">{criticalCount} critical</span>
            )}
            {criticalCount > 0 && majorCount > 0 && " · "}
            {majorCount > 0 && (
              <span className="text-orange-600 font-medium">{majorCount} major</span>
            )}
            {(criticalCount > 0 || majorCount > 0) && " · "}
            {findings.length} total issues found
          </p>
        </div>
        <div className="ml-auto">
          <ScoreGauge score={audit.score} label="Score" />
        </div>
      </div>

      <div className="grid gap-4">
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
      
      const element = reportRef.current;
      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${report.lead.name.replace(/\s+/g, "_")}_Website_Audit.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true,
          logging: false,
        },
        jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
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
    <div ref={reportRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center gap-2 text-slate-400 text-sm mb-4">
            <span>🏥</span>
            <span>Website Audit Report</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-2">{lead.name}</h1>
          <a
            href={lead.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            {lead.websiteUrl.replace(/^https?:\/\//, "")} ↗
          </a>
          <div className="mt-6 flex flex-wrap items-center gap-6">
            <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3">
              <div className="text-3xl font-bold">{overallScore}</div>
              <div className="text-xs text-slate-300">Overall Score</div>
            </div>
            {data.designAudit && (
              <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">{data.designAudit.score}</div>
                <div className="text-xs text-slate-300">Design Score</div>
              </div>
            )}
            {data.seoAudit && (
              <div className="bg-white/10 backdrop-blur rounded-lg px-4 py-3">
                <div className="text-2xl font-bold">{data.seoAudit.score}</div>
                <div className="text-xs text-slate-300">SEO Score</div>
              </div>
            )}
            <div className="ml-auto flex items-center gap-3 no-print">
              <button
                onClick={downloadPDF}
                disabled={downloading}
                className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {downloading ? "⏳ Generating..." : "📄 Download PDF"}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied!");
                }}
                className="bg-white/20 hover:bg-white/30 backdrop-blur px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                🔗 Copy Link
              </button>
            </div>
          </div>
          <div className="text-xs text-slate-400 mt-4">
            Generated {new Date(createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-12 shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Executive Summary</h2>
          <p className="text-gray-600 leading-relaxed">
            We analyzed <strong>{lead.name}</strong>&apos;s website and identified{" "}
            <strong>
              {(data.designAudit?.findings.length || 0) + (data.seoAudit?.findings.length || 0)}
            </strong>{" "}
            opportunities for improvement. The overall score of <strong>{overallScore}/100</strong>{" "}
            indicates{" "}
            {overallScore >= 80
              ? "a well-optimized website with minor improvements possible."
              : overallScore >= 60
              ? "a functional website with several areas that need attention."
              : overallScore >= 40
              ? "significant issues that are likely affecting patient acquisition."
              : "critical problems that require immediate attention."}
          </p>
          {overallScore < 70 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-amber-800 text-sm">
                <strong>💡 Key Insight:</strong> Websites scoring below 70 typically see 30-50% fewer
                conversions than optimized competitors. Addressing the critical and major issues
                below could significantly improve your patient acquisition.
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
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-3">Ready to Fix These Issues?</h2>
          <p className="text-blue-100 mb-6 max-w-lg mx-auto">
            We specialize in helping medical practices like yours improve their online presence.
            Let&apos;s discuss how we can help you convert more website visitors into booked patients.
          </p>
          <a
            href="mailto:hello@example.com?subject=Website%20Audit%20Follow-up"
            className="inline-block bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Schedule a Free Consultation
          </a>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500 print:mt-8">
          <p>This report was generated automatically. Results are for informational purposes only.</p>
          <p className="mt-1">
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

