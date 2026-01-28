"use client";

import { useState, useRef, useEffect } from "react";

type AddedLead = {
  id: string;
  name: string;
  websiteUrl: string;
  status: "pending" | "success" | "error" | "duplicate";
  message?: string;
};

type ParsedLine = {
  id: string;
  name: string;
  websiteUrl: string;
  city: string;
  valid: boolean;
  error?: string;
};

function inferNameFromDomain(url: string): string {
  try {
    const hostname = new URL(url).hostname;
    // Remove www. and TLD
    const parts = hostname.replace(/^www\./, "").split(".");
    if (parts.length > 1) {
      parts.pop(); // Remove TLD
    }
    // Capitalize and join
    return parts
      .join(" ")
      .split(/[-_]/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  } catch {
    return "";
  }
}

function normalizeUrl(input: string): string {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url.toLowerCase().replace(/\/+$/, "");
}

function parseBulkLines(text: string, defaultCity: string): ParsedLine[] {
  const lines = text.split("\n").filter((line) => line.trim());
  const results: ParsedLine[] = [];

  for (const line of lines) {
    const id = Math.random().toString(36).substring(7);
    const trimmed = line.trim();

    // Try to parse as "Name | URL | City" or "Name | URL" or just "URL"
    const parts = trimmed.split("|").map((p) => p.trim());

    let name = "";
    let websiteUrl = "";
    let city = defaultCity;

    if (parts.length >= 3) {
      // Name | URL | City
      name = parts[0];
      websiteUrl = parts[1];
      city = parts[2] || defaultCity;
    } else if (parts.length === 2) {
      // Name | URL
      name = parts[0];
      websiteUrl = parts[1];
    } else if (parts.length === 1) {
      // Just URL (or maybe name)
      const value = parts[0];
      if (value.includes(".") && (value.includes("http") || !value.includes(" "))) {
        // Looks like a URL
        websiteUrl = value;
        name = inferNameFromDomain(normalizeUrl(value));
      } else {
        // Doesn't look like a URL
        results.push({
          id,
          name: value,
          websiteUrl: "",
          city,
          valid: false,
          error: "Missing website URL",
        });
        continue;
      }
    }

    // Normalize the URL
    if (websiteUrl) {
      websiteUrl = normalizeUrl(websiteUrl);
    }

    // Validate
    if (!websiteUrl) {
      results.push({ id, name, websiteUrl, city, valid: false, error: "Missing URL" });
      continue;
    }

    try {
      new URL(websiteUrl);
    } catch {
      results.push({ id, name, websiteUrl, city, valid: false, error: "Invalid URL" });
      continue;
    }

    if (!name) {
      name = inferNameFromDomain(websiteUrl);
    }

    if (!name) {
      results.push({ id, name, websiteUrl, city, valid: false, error: "Could not infer name" });
      continue;
    }

    results.push({ id, name, websiteUrl, city, valid: true });
  }

  return results;
}

export default function FinderPage() {
  // Search config
  const [city, setCity] = useState("");
  const [queryTerms, setQueryTerms] = useState("medical office, clinic, family medicine");
  const [targetCount, setTargetCount] = useState(20);
  const [searchStarted, setSearchStarted] = useState(false);

  // Quick-add form
  const [name, setName] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [adding, setAdding] = useState(false);
  const [addedLeads, setAddedLeads] = useState<AddedLead[]>([]);

  // Bulk add state
  const [bulkText, setBulkText] = useState("");
  const [parsedLines, setParsedLines] = useState<ParsedLine[]>([]);
  const [showBulkPreview, setShowBulkPreview] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

  // URLs-only mode state
  const [bulkMode, setBulkMode] = useState<"structured" | "urls-only">("urls-only");
  const [urlsOnlyText, setUrlsOnlyText] = useState("");
  const [urlsOnlyAdding, setUrlsOnlyAdding] = useState(false);
  const [urlsOnlyResult, setUrlsOnlyResult] = useState<{
    inserted: number;
    skipped: number;
    errors: number;
  } | null>(null);

  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus name input after adding
  useEffect(() => {
    if (!adding && searchStarted && nameInputRef.current) {
      nameInputRef.current.focus();
    }
  }, [adding, searchStarted]);

  const googleMapsUrl = city
    ? `https://www.google.com/maps/search/${encodeURIComponent(
        queryTerms + " " + city
      )}`
    : "";

  const handleStartSearch = () => {
    if (!city.trim()) {
      alert("Please enter a city");
      return;
    }
    setSearchStarted(true);
    // Open Google Maps in new tab
    window.open(googleMapsUrl, "_blank");
  };

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !websiteUrl.trim()) return;

    const leadId = Date.now().toString();
    setAddedLeads((prev) => [
      { id: leadId, name: name.trim(), websiteUrl: websiteUrl.trim(), status: "pending" },
      ...prev,
    ]);

    setAdding(true);

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          websiteUrl: websiteUrl.trim(),
          city: city.trim() || undefined,
          source: "manual_map",
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setAddedLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, status: "success", message: "Added!" } : l
          )
        );
        // Clear inputs for next entry
        setName("");
        setWebsiteUrl("");
      } else if (res.status === 409) {
        setAddedLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, status: "duplicate", message: "Already exists" }
              : l
          )
        );
        // Still clear for next entry
        setName("");
        setWebsiteUrl("");
      } else {
        setAddedLeads((prev) =>
          prev.map((l) =>
            l.id === leadId
              ? { ...l, status: "error", message: data.error || "Failed" }
              : l
          )
        );
      }
    } catch {
      setAddedLeads((prev) =>
        prev.map((l) =>
          l.id === leadId ? { ...l, status: "error", message: "Network error" } : l
        )
      );
    } finally {
      setAdding(false);
    }
  };

  const handleParseBulk = () => {
    const parsed = parseBulkLines(bulkText, city);
    setParsedLines(parsed);
    setShowBulkPreview(true);
  };

  const handleBulkSubmit = async () => {
    const validLines = parsedLines.filter((l) => l.valid);
    if (validLines.length === 0) return;

    setBulkAdding(true);
    setBulkProgress({ current: 0, total: validLines.length });

    for (let i = 0; i < validLines.length; i++) {
      const line = validLines[i];
      setBulkProgress({ current: i + 1, total: validLines.length });

      const leadId = line.id;
      setAddedLeads((prev) => [
        { id: leadId, name: line.name, websiteUrl: line.websiteUrl, status: "pending" },
        ...prev,
      ]);

      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: line.name,
            websiteUrl: line.websiteUrl,
            city: line.city || undefined,
            source: "manual_map",
          }),
        });

        if (res.ok) {
          setAddedLeads((prev) =>
            prev.map((l) =>
              l.id === leadId ? { ...l, status: "success", message: "Added!" } : l
            )
          );
        } else if (res.status === 409) {
          setAddedLeads((prev) =>
            prev.map((l) =>
              l.id === leadId ? { ...l, status: "duplicate", message: "Already exists" } : l
            )
          );
        } else {
          const data = await res.json();
          setAddedLeads((prev) =>
            prev.map((l) =>
              l.id === leadId ? { ...l, status: "error", message: data.error || "Failed" } : l
            )
          );
        }
      } catch {
        setAddedLeads((prev) =>
          prev.map((l) =>
            l.id === leadId ? { ...l, status: "error", message: "Network error" } : l
          )
        );
      }
    }

    setBulkAdding(false);
    setBulkText("");
    setParsedLines([]);
    setShowBulkPreview(false);
  };

  const handleUrlsOnlySubmit = async () => {
    if (!city.trim()) {
      alert("Please enter a city first");
      return;
    }

    const urls = urlsOnlyText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (urls.length === 0) {
      alert("No URLs to import");
      return;
    }

    setUrlsOnlyAdding(true);
    setUrlsOnlyResult(null);

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const rawUrl of urls) {
      const websiteUrl = normalizeUrl(rawUrl);
      const name = inferNameFromDomain(websiteUrl);

      if (!name) {
        errors++;
        continue;
      }

      try {
        const res = await fetch("/api/leads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            websiteUrl,
            city: city.trim(),
            source: "manual_map",
          }),
        });

        if (res.ok) {
          inserted++;
          setAddedLeads((prev) => [
            { id: Math.random().toString(36), name, websiteUrl, status: "success" },
            ...prev,
          ]);
        } else if (res.status === 409) {
          skipped++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    setUrlsOnlyResult({ inserted, skipped, errors });
    setUrlsOnlyAdding(false);
    if (inserted > 0) {
      setUrlsOnlyText("");
    }
  };

  const successCount = addedLeads.filter((l) => l.status === "success").length;
  const progress = targetCount > 0 ? Math.round((successCount / targetCount) * 100) : 0;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Lead Finder</h1>
      <p className="text-gray-600 mb-6">
        Manual prospecting workflow — find leads on Google Maps and quickly add them here.
      </p>

      {/* Search Config */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-3">1. Configure Search</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">City *</label>
            <input
              type="text"
              placeholder="e.g., Austin, TX"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={searchStarted}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Query Terms</label>
            <input
              type="text"
              value={queryTerms}
              onChange={(e) => setQueryTerms(e.target.value)}
              className="border rounded px-3 py-2 w-full"
              disabled={searchStarted}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Target Count</label>
            <input
              type="number"
              value={targetCount}
              onChange={(e) => setTargetCount(Number(e.target.value))}
              className="border rounded px-3 py-2 w-full"
              min={1}
              max={100}
              disabled={searchStarted}
            />
          </div>
        </div>

        {!searchStarted ? (
          <button
            onClick={handleStartSearch}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Open Google Maps & Start
          </button>
        ) : (
          <div className="flex items-center gap-4">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              ↗ Reopen Google Maps search
            </a>
            <button
              onClick={() => {
                setSearchStarted(false);
                setAddedLeads([]);
              }}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {searchStarted && (
        <>
          {/* Workflow Instructions */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">2. Workflow Checklist</h2>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                <strong>Scroll the map</strong> — load all results in your target area
              </li>
              <li>
                <strong>Click each listing</strong> — check for a website link
              </li>
              <li>
                <strong>Skip chains</strong> — CVS, Walgreens, big hospital systems (unless relevant)
              </li>
              <li>
                <strong>Copy the business name</strong> → paste in Name field below
              </li>
              <li>
                <strong>Copy the website URL</strong> → paste in Website field below
              </li>
              <li>
                <strong>Hit Enter</strong> — lead auto-saves, form clears, repeat!
              </li>
            </ol>
            <p className="mt-3 text-sm text-blue-700">
              💡 Tip: Keep Google Maps in one window, this page in another. Keyboard shortcuts make this fast!
            </p>
          </div>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span>
                Progress: {successCount} / {targetCount} leads
              </span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* Quick Add Form */}
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">3. Quick Add Lead</h2>
            <form onSubmit={handleQuickAdd} className="flex gap-3">
              <input
                ref={nameInputRef}
                type="text"
                placeholder="Business name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border rounded px-3 py-2 flex-1"
                disabled={adding}
                autoFocus
              />
              <input
                type="text"
                placeholder="Website URL"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="border rounded px-3 py-2 flex-1"
                disabled={adding}
              />
              <button
                type="submit"
                disabled={adding || !name.trim() || !websiteUrl.trim()}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50 min-w-[80px]"
              >
                {adding ? "..." : "Add"}
              </button>
            </form>
            <p className="mt-2 text-xs text-gray-500">
              City: <strong>{city || "(not set)"}</strong> • Source: <strong>manual_map</strong>
            </p>
          </div>

          {/* Bulk Add Panel */}
          <div className="mb-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <h2 className="text-lg font-semibold mb-3">4. Bulk Add (Paste Multiple)</h2>

            {/* Mode Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setBulkMode("urls-only")}
                className={`px-3 py-1 rounded text-sm ${
                  bulkMode === "urls-only"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-purple-600 border border-purple-300"
                }`}
              >
                URLs Only (Fast)
              </button>
              <button
                onClick={() => setBulkMode("structured")}
                className={`px-3 py-1 rounded text-sm ${
                  bulkMode === "structured"
                    ? "bg-purple-600 text-white"
                    : "bg-white text-purple-600 border border-purple-300"
                }`}
              >
                Structured (Name | URL | City)
              </button>
            </div>

            {/* URLs Only Mode */}
            {bulkMode === "urls-only" && (
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Paste website URLs (one per line). Names auto-derived from domains.
                </p>
                {!city.trim() && (
                  <p className="text-sm text-red-500 mb-2">
                    ⚠ Enter a city above first — it will be used for all leads.
                  </p>
                )}
                <textarea
                  value={urlsOnlyText}
                  onChange={(e) => setUrlsOnlyText(e.target.value)}
                  placeholder={`https://drsmithmd.com\nhttps://abcmedical.org\nhttps://familyhealthaustin.com\nwww.texasmedicalclinic.com`}
                  className="w-full border rounded px-3 py-2 h-32 font-mono text-sm"
                  disabled={urlsOnlyAdding}
                />
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={handleUrlsOnlySubmit}
                    disabled={!urlsOnlyText.trim() || !city.trim() || urlsOnlyAdding}
                    className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                  >
                    {urlsOnlyAdding ? "Importing..." : "Import URLs"}
                  </button>
                  <span className="text-xs text-gray-500">
                    City: <strong>{city || "(required)"}</strong>
                  </span>
                  {urlsOnlyResult && (
                    <span className="text-sm">
                      <span className="text-green-600">{urlsOnlyResult.inserted} added</span>
                      {urlsOnlyResult.skipped > 0 && (
                        <span className="text-yellow-600 ml-2">{urlsOnlyResult.skipped} skipped</span>
                      )}
                      {urlsOnlyResult.errors > 0 && (
                        <span className="text-red-600 ml-2">{urlsOnlyResult.errors} errors</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Structured Mode */}
            {bulkMode === "structured" && (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Paste lines in format: <code>Name | URL | City</code> (city optional)
                </p>
                {!showBulkPreview ? (
                  <>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder={`Dr. Smith Family Practice | https://drsmithmd.com | Austin\nABC Medical Clinic | https://abcmedical.org\nhttps://healthfirst.com`}
                      className="w-full border rounded px-3 py-2 h-32 font-mono text-sm"
                      disabled={bulkAdding}
                    />
                    <button
                      onClick={handleParseBulk}
                      disabled={!bulkText.trim() || bulkAdding}
                      className="mt-2 bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                    >
                      Preview & Validate
                    </button>
                  </>
                ) : (
                  <>
                    <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto mb-3">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-100 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left">Status</th>
                            <th className="px-3 py-2 text-left">Name</th>
                            <th className="px-3 py-2 text-left">Website</th>
                            <th className="px-3 py-2 text-left">City</th>
                          </tr>
                        </thead>
                        <tbody>
                          {parsedLines.map((line) => (
                            <tr key={line.id} className={`border-t ${!line.valid ? "bg-red-50" : ""}`}>
                              <td className="px-3 py-2">
                                {line.valid ? (
                                  <span className="text-green-600">✓ OK</span>
                                ) : (
                                  <span className="text-red-600">✗ {line.error}</span>
                                )}
                              </td>
                              <td className="px-3 py-2">{line.name || "-"}</td>
                              <td className="px-3 py-2 text-blue-600 truncate max-w-[200px]">
                                {line.websiteUrl?.replace(/^https?:\/\//, "") || "-"}
                              </td>
                              <td className="px-3 py-2">{line.city || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {parsedLines.filter((l) => l.valid).length} valid,{" "}
                        {parsedLines.filter((l) => !l.valid).length} invalid
                      </span>

                      {bulkAdding && (
                        <span className="text-sm text-purple-600">
                          Adding {bulkProgress.current}/{bulkProgress.total}...
                        </span>
                      )}

                  <div className="flex-1" />

                  <button
                    onClick={() => {
                      setShowBulkPreview(false);
                      setParsedLines([]);
                    }}
                    disabled={bulkAdding}
                    className="text-gray-500 hover:text-gray-700 text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBulkSubmit}
                    disabled={bulkAdding || parsedLines.filter((l) => l.valid).length === 0}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    {bulkAdding ? "Adding..." : `Add ${parsedLines.filter((l) => l.valid).length} Leads`}
                  </button>
                </div>
              </>
            )}
              </>
            )}
          </div>

          {/* Added Leads Log */}
          {addedLeads.length > 0 && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-3">Added This Session</h2>
              <div className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Name</th>
                      <th className="px-3 py-2 text-left">Website</th>
                      <th className="px-3 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {addedLeads.map((lead) => (
                      <tr key={lead.id} className="border-t">
                        <td className="px-3 py-2">{lead.name}</td>
                        <td className="px-3 py-2 text-blue-600 truncate max-w-[200px]">
                          {lead.websiteUrl.replace(/^https?:\/\//, "")}
                        </td>
                        <td className="px-3 py-2">
                          {lead.status === "pending" && (
                            <span className="text-gray-400">Saving...</span>
                          )}
                          {lead.status === "success" && (
                            <span className="text-green-600">✓ Added</span>
                          )}
                          {lead.status === "duplicate" && (
                            <span className="text-yellow-600">⚠ Duplicate</span>
                          )}
                          {lead.status === "error" && (
                            <span className="text-red-600">✗ {lead.message}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Done */}
          {successCount >= targetCount && (
            <div className="p-4 bg-green-100 border border-green-300 rounded-lg text-center">
              <p className="text-lg font-semibold text-green-800">
                🎉 Target reached! {successCount} leads added.
              </p>
              <a
                href="/leads"
                className="text-green-700 hover:underline text-sm mt-2 inline-block"
              >
                → Go to Lead Dashboard to audit them
              </a>
            </div>
          )}
        </>
      )}
    </div>
  );
}

