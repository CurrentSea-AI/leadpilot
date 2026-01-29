import { Suspense } from "react";
import BillingClient from "./BillingClient";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

function LoadingFallback() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BillingClient />
    </Suspense>
  );
}
