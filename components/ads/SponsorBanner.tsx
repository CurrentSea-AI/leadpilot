"use client";

import Link from "next/link";

// A custom sponsor/affiliate banner you can sell directly
// This doesn't require any ad network - you control it entirely

interface Sponsor {
  id: string;
  name: string;
  tagline: string;
  logoUrl?: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
}

// Add your sponsors here or fetch from database
const SPONSORS: Sponsor[] = [
  // Example sponsor - replace with real sponsors
  // {
  //   id: "example",
  //   name: "Acme Web Design",
  //   tagline: "Beautiful websites for small businesses",
  //   url: "https://example.com?ref=leadpilot",
  //   backgroundColor: "#4F46E5",
  //   textColor: "#FFFFFF",
  // },
];

export function SponsorBanner() {
  // Randomly select a sponsor if multiple
  const sponsor = SPONSORS[Math.floor(Math.random() * SPONSORS.length)];
  
  if (!sponsor) return null;

  return (
    <Link
      href={sponsor.url}
      target="_blank"
      rel="sponsored noopener"
      className="block w-full py-2 px-4 text-center text-sm transition-opacity hover:opacity-90"
      style={{
        backgroundColor: sponsor.backgroundColor || "#4F46E5",
        color: sponsor.textColor || "#FFFFFF",
      }}
    >
      <span className="font-medium">{sponsor.name}</span>
      <span className="mx-2">—</span>
      <span>{sponsor.tagline}</span>
      <span className="ml-2 opacity-60">Sponsored</span>
    </Link>
  );
}

// A sticky bottom banner for mobile
export function StickyMobileAd() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-[#0f0f23] border-t border-white/10 p-2">
      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
        <span>Your ad here</span>
        <Link href="/advertise" className="text-indigo-400 hover:underline">
          Advertise with us →
        </Link>
      </div>
    </div>
  );
}

