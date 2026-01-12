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
  // Try LinkPreview if available - wrap everything in try-catch to be safe
  try {
    // Dynamic import to avoid errors if module isn't available
    const LinkPreviewModule = await import('@lowkey/react-native-link-preview');
    const LinkPreview = LinkPreviewModule.default || LinkPreviewModule;
    
    if (LinkPreview && LinkPreview.generate && typeof LinkPreview.generate === 'function') {
      const metadata = await LinkPreview.generate(normalizeUrl(url));
      
      return {
        title: metadata.title || 'Website',
        subtitle: metadata.description,
        iconUrl: metadata.imageURL,
      };
    }
  } catch (error) {
    // LinkPreview not available or failed - use fallback
    // This is expected in Expo Go
  }
  
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
