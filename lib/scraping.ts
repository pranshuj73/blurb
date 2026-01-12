import LinkPreview from '@lowkey/react-native-link-preview';
import 'react-native-url-polyfill/auto';

export interface ScrapedMetadata {
  title: string;
  subtitle?: string;
  iconUrl?: string;
}

const FAVICON_API = 'https://www.google.com/s2/favicons?domain=';

// Helper to normalize URL - add https:// if missing
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export async function scrapeMetadata(url: string): Promise<ScrapedMetadata> {
  try {
    const metadata = await LinkPreview.generate(normalizeUrl(url));
    
    return {
      title: metadata.title || 'Website',
      subtitle: metadata.description,
      iconUrl: metadata.imageURL,
    };
  } catch (error) {
    console.error('Error scraping metadata:', error);
    
    // Fallback: extract domain for title and get favicon
    try {
      const urlObj = new URL(normalizeUrl(url));
      const domain = urlObj.hostname.replace('www.', '');
      const parts = domain.split('.');
      const siteName = parts.length >= 2 
        ? parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1)
        : domain;
      
      return {
        title: siteName,
        subtitle: undefined,
        iconUrl: `${FAVICON_API}${domain}&sz=128`,
      };
    } catch {
      return {
        title: 'Website',
        subtitle: undefined,
        iconUrl: undefined,
      };
    }
  }
}
