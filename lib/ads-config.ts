// Ad Network Configuration
// Add your ad network IDs here to enable monetization

export const ADS_CONFIG = {
  // Google AdSense - Most popular, easy approval
  // Get your ID at: https://www.google.com/adsense
  googleAdsense: {
    enabled: !!process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID,
    clientId: process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
    slots: {
      header: process.env.NEXT_PUBLIC_ADSENSE_SLOT_HEADER || "",
      sidebar: process.env.NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR || "",
      inContent: process.env.NEXT_PUBLIC_ADSENSE_SLOT_CONTENT || "",
      footer: process.env.NEXT_PUBLIC_ADSENSE_SLOT_FOOTER || "",
    },
  },

  // Google Ad Manager (formerly DFP) - Advanced ad management
  // For high-traffic sites with multiple ad sources
  googleAdManager: {
    enabled: !!process.env.NEXT_PUBLIC_GAM_NETWORK_ID,
    networkId: process.env.NEXT_PUBLIC_GAM_NETWORK_ID || "",
  },

  // Carbon Ads - Premium tech/developer audience
  // Apply at: https://www.carbonads.net/
  carbonAds: {
    enabled: !!process.env.NEXT_PUBLIC_CARBON_SERVE,
    serve: process.env.NEXT_PUBLIC_CARBON_SERVE || "",
    placement: process.env.NEXT_PUBLIC_CARBON_PLACEMENT || "",
  },

  // EthicalAds - Privacy-focused, no tracking
  // Apply at: https://www.ethicalads.io/
  ethicalAds: {
    enabled: !!process.env.NEXT_PUBLIC_ETHICAL_ADS_PUBLISHER,
    publisher: process.env.NEXT_PUBLIC_ETHICAL_ADS_PUBLISHER || "",
  },

  // Media.net - Yahoo/Bing network (good AdSense alternative)
  // Apply at: https://www.media.net/
  mediaNet: {
    enabled: !!process.env.NEXT_PUBLIC_MEDIANET_CUSTOMER_ID,
    customerId: process.env.NEXT_PUBLIC_MEDIANET_CUSTOMER_ID || "",
    widgetId: process.env.NEXT_PUBLIC_MEDIANET_WIDGET_ID || "",
  },

  // BuySellAds - Direct ad marketplace
  // Sign up at: https://www.buysellads.com/
  buySellAds: {
    enabled: !!process.env.NEXT_PUBLIC_BSA_ZONE_ID,
    zoneId: process.env.NEXT_PUBLIC_BSA_ZONE_ID || "",
  },

  // Amazon Associates - Affiliate program
  // Join at: https://affiliate-program.amazon.com/
  amazonAssociates: {
    enabled: !!process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG,
    tag: process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG || "",
  },

  // Ezoic - AI-powered ad optimization
  // Apply at: https://www.ezoic.com/
  ezoic: {
    enabled: !!process.env.NEXT_PUBLIC_EZOIC_ID,
    id: process.env.NEXT_PUBLIC_EZOIC_ID || "",
  },

  // AdThrive/Raptive - Premium publisher network (requires 100k+ pageviews)
  // Apply at: https://raptive.com/
  adThrive: {
    enabled: !!process.env.NEXT_PUBLIC_ADTHRIVE_SITE_ID,
    siteId: process.env.NEXT_PUBLIC_ADTHRIVE_SITE_ID || "",
  },

  // Monumetric - Mid-tier publisher network (10k+ pageviews)
  // Apply at: https://www.monumetric.com/
  monumetric: {
    enabled: !!process.env.NEXT_PUBLIC_MONUMETRIC_SITE_ID,
    siteId: process.env.NEXT_PUBLIC_MONUMETRIC_SITE_ID || "",
  },
};

// Check if any ad network is enabled
export function hasAdsEnabled(): boolean {
  return Object.values(ADS_CONFIG).some(
    (config) => typeof config === "object" && "enabled" in config && config.enabled
  );
}

// Get the primary enabled ad network
export function getPrimaryAdNetwork(): string | null {
  if (ADS_CONFIG.googleAdsense.enabled) return "adsense";
  if (ADS_CONFIG.carbonAds.enabled) return "carbon";
  if (ADS_CONFIG.ethicalAds.enabled) return "ethical";
  if (ADS_CONFIG.mediaNet.enabled) return "medianet";
  if (ADS_CONFIG.ezoic.enabled) return "ezoic";
  if (ADS_CONFIG.adThrive.enabled) return "adthrive";
  if (ADS_CONFIG.monumetric.enabled) return "monumetric";
  return null;
}

