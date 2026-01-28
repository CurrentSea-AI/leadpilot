/**
 * Normalize a website URL for consistent duplicate detection.
 * - Forces https://
 * - Removes www.
 * - Strips trailing slashes
 * - Removes query params and fragments
 * - Lowercases the hostname
 */
export function normalizeWebsiteUrl(url: string): string {
  let normalized = url.trim();

  // Ensure protocol
  if (!normalized.startsWith("http://") && !normalized.startsWith("https://")) {
    normalized = "https://" + normalized;
  }

  // Convert http to https
  if (normalized.startsWith("http://")) {
    normalized = normalized.replace("http://", "https://");
  }

  try {
    const parsed = new URL(normalized);

    // Lowercase hostname and remove www.
    let hostname = parsed.hostname.toLowerCase();
    if (hostname.startsWith("www.")) {
      hostname = hostname.slice(4);
    }

    // Keep only the path (no query or hash)
    let pathname = parsed.pathname;

    // Remove trailing slashes
    pathname = pathname.replace(/\/+$/, "");

    // Reconstruct clean URL
    return `https://${hostname}${pathname}`;
  } catch {
    // If URL parsing fails, do basic normalization
    normalized = normalized.toLowerCase();
    normalized = normalized.replace(/^https?:\/\//, "https://");
    normalized = normalized.replace(/^https:\/\/www\./, "https://");
    normalized = normalized.replace(/[?#].*$/, ""); // Remove query/fragment
    normalized = normalized.replace(/\/+$/, ""); // Remove trailing slashes
    return normalized;
  }
}

/**
 * Normalize a phone number for duplicate detection.
 * Strips all non-digit characters and optionally removes leading 1 (US country code).
 */
export function normalizePhone(phone: string): string {
  // Remove all non-digits
  let digits = phone.replace(/\D/g, "");

  // Remove leading 1 if it's an 11-digit US number
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }

  return digits;
}

/**
 * Check if a phone number is valid (10 digits for US)
 */
export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return normalized.length === 10;
}

