import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Website Audit Report | LeadPilot",
  description: "Professional website audit report with design and SEO analysis.",
};

export default function ReportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // This layout intentionally excludes the main NavBar
  // so reports look clean and professional for clients
  return <>{children}</>;
}

