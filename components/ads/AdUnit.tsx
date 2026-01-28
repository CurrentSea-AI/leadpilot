"use client";

import { useEffect, useRef } from "react";
import { ADS_CONFIG } from "@/lib/ads-config";

type AdPlacement = "header" | "sidebar" | "inContent" | "footer";
type AdSize = "responsive" | "banner" | "rectangle" | "leaderboard" | "skyscraper";

interface AdUnitProps {
  placement: AdPlacement;
  size?: AdSize;
  className?: string;
  fallback?: React.ReactNode;
}

// Size mappings
const AD_SIZES = {
  responsive: { width: "100%", height: "auto" },
  banner: { width: "468px", height: "60px" },
  rectangle: { width: "300px", height: "250px" },
  leaderboard: { width: "728px", height: "90px" },
  skyscraper: { width: "160px", height: "600px" },
};

export function AdUnit({ placement, size = "responsive", className = "", fallback }: AdUnitProps) {
  const adRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initialize Google AdSense
    if (ADS_CONFIG.googleAdsense.enabled && adRef.current) {
      try {
        // @ts-expect-error - adsbygoogle is added by the script
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, []);

  // If no ads are enabled, show fallback or nothing
  if (!ADS_CONFIG.googleAdsense.enabled && 
      !ADS_CONFIG.carbonAds.enabled && 
      !ADS_CONFIG.ethicalAds.enabled &&
      !ADS_CONFIG.mediaNet.enabled) {
    return fallback ? <>{fallback}</> : null;
  }

  const sizeStyle = AD_SIZES[size];
  const slotId = ADS_CONFIG.googleAdsense.slots[placement];

  return (
    <div 
      ref={adRef}
      className={`ad-unit ad-${placement} ${className}`}
      style={{ 
        minHeight: size === "responsive" ? "90px" : sizeStyle.height,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      {/* Google AdSense */}
      {ADS_CONFIG.googleAdsense.enabled && slotId && (
        <ins
          className="adsbygoogle"
          style={{ 
            display: "block",
            width: sizeStyle.width,
            height: size === "responsive" ? "auto" : sizeStyle.height,
          }}
          data-ad-client={ADS_CONFIG.googleAdsense.clientId}
          data-ad-slot={slotId}
          data-ad-format={size === "responsive" ? "auto" : "fixed"}
          data-full-width-responsive={size === "responsive" ? "true" : "false"}
        />
      )}

      {/* Carbon Ads - for sidebar/inContent only */}
      {ADS_CONFIG.carbonAds.enabled && (placement === "sidebar" || placement === "inContent") && (
        <div id="carbonads-container">
          <script
            async
            type="text/javascript"
            src={`//cdn.carbonads.com/carbon.js?serve=${ADS_CONFIG.carbonAds.serve}&placement=${ADS_CONFIG.carbonAds.placement}`}
            id="_carbonads_js"
          />
        </div>
      )}

      {/* EthicalAds */}
      {ADS_CONFIG.ethicalAds.enabled && (
        <div 
          className="ethical-ads"
          data-ea-publisher={ADS_CONFIG.ethicalAds.publisher}
          data-ea-type={size === "responsive" ? "text" : "image"}
        />
      )}

      {/* Media.net */}
      {ADS_CONFIG.mediaNet.enabled && (
        <div
          id={`medianet-${placement}`}
          data-customer-id={ADS_CONFIG.mediaNet.customerId}
          data-widget-id={ADS_CONFIG.mediaNet.widgetId}
        />
      )}
    </div>
  );
}

// Specialized ad components for common placements
export function HeaderAd({ className }: { className?: string }) {
  return <AdUnit placement="header" size="leaderboard" className={className} />;
}

export function SidebarAd({ className }: { className?: string }) {
  return <AdUnit placement="sidebar" size="rectangle" className={className} />;
}

export function InContentAd({ className }: { className?: string }) {
  return <AdUnit placement="inContent" size="responsive" className={className} />;
}

export function FooterAd({ className }: { className?: string }) {
  return <AdUnit placement="footer" size="leaderboard" className={className} />;
}

