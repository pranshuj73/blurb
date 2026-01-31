import 'react-native-url-polyfill/auto';
import { normalizeUrl } from './utils/url';

export interface ScrapedMetadata {
  title: string;
  subtitle?: string;
  iconUrl?: string;
}

// Multiple favicon API fallbacks for reliability
const FAVICON_APIS = [
  (domain: string) => `https://www.google.com/s2/favicons?domain=${domain}&sz=128`,
  (domain: string) => `https://icons.duckduckgo.com/ip3/${domain}.ico`,
  (domain: string) => `https://favicon.im/${domain}?larger=true`,
];

export async function scrapeMetadata(url: string): Promise<ScrapedMetadata> {
  // Extract domain for title and get favicon
  try {
    const urlObj = new URL(normalizeUrl(url));
    const domain = urlObj.hostname.replace('www.', '');
    const parts = domain.split('.');
    const siteName = parts.length >= 2
      ? parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1)
      : domain;

    // Use first favicon API (Google) as primary, others as fallbacks
    const iconUrl = FAVICON_APIS[0](domain);

    return {
      title: siteName,
      subtitle: undefined,
      iconUrl,
    };
  } catch {
    return {
      title: 'Website',
      subtitle: undefined,
      iconUrl: undefined,
    };
  }
}
