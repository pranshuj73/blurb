/**
 * URL utility functions for normalizing and validating URLs
 */

/**
 * Normalizes a URL by adding https:// protocol if missing
 * @param url - The URL to normalize
 * @returns The normalized URL with protocol
 */
export function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

/**
 * Validates if a string is a valid URL
 * @param url - The URL to validate
 * @returns True if the URL is valid
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(normalizeUrl(url));
    return true;
  } catch {
    return false;
  }
}

/**
 * Checks if a URL uses a suspicious protocol that could be dangerous
 * @param url - The URL to check
 * @returns True if the URL uses a suspicious protocol
 */
export function isSuspiciousUrl(url: string): boolean {
  const suspiciousProtocols = ['javascript:', 'data:', 'file:', 'vbscript:'];
  const lower = url.toLowerCase().trim();
  return suspiciousProtocols.some(proto => lower.startsWith(proto));
}
