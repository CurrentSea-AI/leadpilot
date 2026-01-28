"use client";

import Script from "next/script";
import { ADS_CONFIG } from "@/lib/ads-config";

// This component loads all necessary ad network scripts
export function AdScripts() {
  return (
    <>
      {/* Google AdSense */}
      {ADS_CONFIG.googleAdsense.enabled && (
        <Script
          id="google-adsense"
          async
          src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADS_CONFIG.googleAdsense.clientId}`}
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      )}

      {/* Google Ad Manager */}
      {ADS_CONFIG.googleAdManager.enabled && (
        <Script
          id="google-ad-manager"
          async
          src="https://securepubads.g.doubleclick.net/tag/js/gpt.js"
          strategy="afterInteractive"
        />
      )}

      {/* EthicalAds */}
      {ADS_CONFIG.ethicalAds.enabled && (
        <Script
          id="ethical-ads"
          async
          src="https://media.ethicalads.io/media/client/ethicalads.min.js"
          strategy="afterInteractive"
        />
      )}

      {/* Media.net */}
      {ADS_CONFIG.mediaNet.enabled && (
        <Script
          id="media-net"
          async
          src={`https://contextual.media.net/dmedianet.js?cid=${ADS_CONFIG.mediaNet.customerId}`}
          strategy="afterInteractive"
        />
      )}

      {/* BuySellAds */}
      {ADS_CONFIG.buySellAds.enabled && (
        <Script
          id="buysellads"
          async
          src="https://cdn.carbonads.com/carbon.js"
          strategy="afterInteractive"
        />
      )}

      {/* Ezoic */}
      {ADS_CONFIG.ezoic.enabled && (
        <>
          <Script
            id="ezoic-privacy"
            src={`https://the.gatekeeperconsent.com/cmp.min.js`}
            data-siteid={ADS_CONFIG.ezoic.id}
            strategy="beforeInteractive"
          />
          <Script
            id="ezoic-ad"
            src="https://www.ezojs.com/ezoic/sa.min.js"
            strategy="afterInteractive"
          />
        </>
      )}

      {/* AdThrive/Raptive */}
      {ADS_CONFIG.adThrive.enabled && (
        <Script
          id="adthrive"
          async
          src={`https://ads.adthrive.com/sites/${ADS_CONFIG.adThrive.siteId}/ads.min.js`}
          strategy="afterInteractive"
        />
      )}

      {/* Monumetric */}
      {ADS_CONFIG.monumetric.enabled && (
        <Script
          id="monumetric"
          async
          src={`https://monu.script.com/${ADS_CONFIG.monumetric.siteId}/script.js`}
          strategy="afterInteractive"
        />
      )}
    </>
  );
}

