"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    // Load saved API key on mount
    const savedKey = localStorage.getItem("openai_api_key");
    if (savedKey) {
      setApiKey(savedKey);
      setHasKey(true);
    }
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem("openai_api_key", apiKey.trim());
      setHasKey(true);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleRemove = () => {
    localStorage.removeItem("openai_api_key");
    setApiKey("");
    setHasKey(false);
  };

  const maskKey = (key: string) => {
    if (key.length < 10) return key;
    return key.slice(0, 7) + "..." + key.slice(-4);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-slate-400 mb-8">Configure your LeadPilot experience</p>

        {/* OpenAI API Key Section */}
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white mb-1">OpenAI API Key</h2>
              <p className="text-slate-400 text-sm">
                Enter your own OpenAI API key to power the AI audits. Your key is stored locally in your browser and never sent to our servers.
              </p>
            </div>
          </div>

          {hasKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div className="flex-1">
                  <div className="text-green-400 font-medium">API Key Connected</div>
                  <div className="text-slate-500 text-sm font-mono">{maskKey(apiKey)}</div>
                </div>
                <button
                  onClick={handleRemove}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  API Key
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-4 py-3 bg-[#0d0d1a] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <button
                onClick={handleSave}
                disabled={!apiKey.trim()}
                className="btn-primary px-6 py-3 disabled:opacity-50"
              >
                Save API Key
              </button>
            </div>
          )}

          {saved && (
            <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              API key saved successfully!
            </div>
          )}

          {/* Instructions */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-slate-300 mb-3">How to get your API key:</h3>
            <ol className="text-sm text-slate-400 space-y-2">
              <li className="flex gap-2">
                <span className="text-indigo-400">1.</span>
                Go to <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">platform.openai.com/api-keys</a>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400">2.</span>
                Click "Create new secret key"
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400">3.</span>
                Copy and paste the key above
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-400">4.</span>
                Add billing at <a href="https://platform.openai.com/settings/organization/billing/overview" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">OpenAI Billing</a> (pay-as-you-go)
              </li>
            </ol>
            <p className="mt-4 text-xs text-slate-500">
              Cost: ~$0.05-0.10 per website audit using GPT-4o
            </p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="card p-6 bg-indigo-500/5 border-indigo-500/20">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <div>
              <h3 className="text-white font-medium mb-1">Your key stays private</h3>
              <p className="text-slate-400 text-sm">
                Your API key is stored only in your browser&apos;s local storage. It&apos;s sent directly to OpenAI when you run audits - we never see or store it on our servers.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

