import 'react-native-url-polyfill/auto';

export interface ScrapedMetadata {
  title: string;
  subtitle?: string;
  iconUrl?: string;
}

const FAVICON_API = 'https://www.google.com/s2/favicons?domain=';
const CACHE_KEY_PREFIX = '@blurb:metadata:';

// Simple cache for scraped metadata
const metadataCache = new Map<string, ScrapedMetadata>();

export async function scrapeMetadata(url: string): Promise<ScrapedMetadata> {
  // Check cache first
  if (metadataCache.has(url)) {
    return metadataCache.get(url)!;
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    // Extract basic info from URL
    let title = domain;
    let subtitle: string | undefined;
    let iconUrl: string | undefined;

    // Try to get favicon
    iconUrl = `${FAVICON_API}${domain}&sz=128`;

    // Parse common platforms
    if (domain.includes('linkedin.com')) {
      title = 'LinkedIn';
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0 && pathParts[0] !== 'in') {
        subtitle = pathParts[0];
      }
    } else if (domain.includes('github.com')) {
      title = 'GitHub';
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        subtitle = pathParts[0];
      }
    } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      title = 'YouTube';
      const params = new URLSearchParams(urlObj.search);
      const videoId = params.get('v') || urlObj.pathname.split('/').pop();
      if (videoId) {
        subtitle = `Video: ${videoId}`;
      }
    } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
      title = 'Twitter / X';
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        subtitle = `@${pathParts[0]}`;
      }
    } else if (domain.includes('instagram.com')) {
      title = 'Instagram';
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) {
        subtitle = `@${pathParts[0]}`;
      }
    } else {
      // Try to extract a meaningful title from domain
      const parts = domain.split('.');
      if (parts.length >= 2) {
        title = parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
      }
    }

    const metadata: ScrapedMetadata = {
      title,
      subtitle,
      iconUrl,
    };

    // Cache the result
    metadataCache.set(url, metadata);

    return metadata;
  } catch (error) {
    console.error('Error scraping metadata:', error);
    // Return fallback
    return {
      title: 'Website',
      subtitle: undefined,
      iconUrl: undefined,
    };
  }
}
