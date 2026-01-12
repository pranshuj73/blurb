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

// Helper to extract text from HTML
function extractTextFromHtml(html: string, tag: string): string | null {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = html.match(regex);
  if (match && match[1]) {
    return match[1]
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
  }
  return null;
}

// Helper to extract meta tag content
function extractMetaContent(html: string, property: string): string | null {
  const regex = new RegExp(`<meta[^>]*(?:property|name)=["']${property}["'][^>]*content=["']([^"']*)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

// Helper to extract favicon
function extractFavicon(html: string, baseUrl: string): string | null {
  // Try various favicon link patterns
  const patterns = [
    /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
    /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
    /<link[^>]*rel=["']apple-touch-icon["'][^>]*href=["']([^"']+)["']/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match && match[1]) {
      let faviconUrl = match[1];
      // Handle relative URLs
      if (faviconUrl.startsWith('//')) {
        faviconUrl = `https:${faviconUrl}`;
      } else if (faviconUrl.startsWith('/')) {
        const urlObj = new URL(baseUrl);
        faviconUrl = `${urlObj.protocol}//${urlObj.host}${faviconUrl}`;
      } else if (!faviconUrl.startsWith('http')) {
        const urlObj = new URL(baseUrl);
        faviconUrl = `${urlObj.protocol}//${urlObj.host}/${faviconUrl}`;
      }
      return faviconUrl;
    }
  }
  return null;
}

export async function scrapeMetadata(url: string): Promise<ScrapedMetadata> {
  // Check cache first
  if (metadataCache.has(url)) {
    return metadataCache.get(url)!;
  }

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');

    // Default values from URL parsing
    let title = domain;
    let subtitle: string | undefined;
    let iconUrl: string | undefined;

    // Try to fetch the actual page
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 second timeout

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
        },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const html = await response.text();
        
        // Extract title
        const pageTitle = extractTextFromHtml(html, 'title');
        if (pageTitle) {
          title = pageTitle;
        }

        // Extract subtitle from meta description or og:description
        subtitle = extractMetaContent(html, 'og:description') || 
                   extractMetaContent(html, 'description') ||
                   extractMetaContent(html, 'twitter:description');

        // Extract favicon
        const favicon = extractFavicon(html, url);
        if (favicon) {
          iconUrl = favicon;
        }
      }
    } catch (fetchError) {
      console.log('Fetch failed, using fallback:', fetchError);
      // Continue with URL-based parsing
    }

    // Fallback: Use Google favicon API if we don't have an icon
    if (!iconUrl) {
      iconUrl = `${FAVICON_API}${domain}&sz=128`;
    }

    // Fallback: Parse common platforms if we didn't get title from HTML
    if (title === domain) {
      if (domain.includes('linkedin.com')) {
        title = 'LinkedIn';
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0 && pathParts[0] !== 'in') {
          subtitle = subtitle || pathParts[0];
        }
      } else if (domain.includes('github.com')) {
        title = 'GitHub';
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          subtitle = subtitle || pathParts[0];
        }
      } else if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
        title = 'YouTube';
        const params = new URLSearchParams(urlObj.search);
        const videoId = params.get('v') || urlObj.pathname.split('/').pop();
        if (videoId) {
          subtitle = subtitle || `Video: ${videoId}`;
        }
      } else if (domain.includes('twitter.com') || domain.includes('x.com')) {
        title = 'Twitter / X';
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          subtitle = subtitle || `@${pathParts[0]}`;
        }
      } else if (domain.includes('instagram.com')) {
        title = 'Instagram';
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          subtitle = subtitle || `@${pathParts[0]}`;
        }
      } else {
        // Try to extract a meaningful title from domain
        const parts = domain.split('.');
        if (parts.length >= 2) {
          title = parts[parts.length - 2].charAt(0).toUpperCase() + parts[parts.length - 2].slice(1);
        }
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
    // Return fallback with at least favicon
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    return {
      title: 'Website',
      subtitle: undefined,
      iconUrl: `${FAVICON_API}${domain}&sz=128`,
    };
  }
}
