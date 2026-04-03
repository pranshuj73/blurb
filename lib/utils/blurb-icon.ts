import * as ImagePicker from 'expo-image-picker';

import { scrapeMetadata } from '@/lib/scraping';
import { cacheFavicon } from '@/lib/utils/favicon-cache';
import { getAccentColorFromFavicon } from '@/lib/utils/favicon-color';
import { normalizeUrl } from '@/lib/utils/url';

export function getDomainSeed(rawUrl: string) {
  try {
    return new URL(normalizeUrl(rawUrl)).hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}

export async function syncFaviconForLink(rawUrl: string) {
  const normalizedUrl = normalizeUrl(rawUrl.trim());
  const metadata = await scrapeMetadata(normalizedUrl);
  const cachedIconUri = metadata.iconUrl ? await cacheFavicon(metadata.iconUrl) : undefined;
  const accentColor =
    cachedIconUri || metadata.iconUrl
      ? await getAccentColorFromFavicon(cachedIconUri ?? metadata.iconUrl, getDomainSeed(normalizedUrl))
      : await getAccentColorFromFavicon(undefined, getDomainSeed(normalizedUrl));

  return {
    iconUri: cachedIconUri,
    iconType: cachedIconUri ? ('image' as const) : ('lucide' as const),
    accentColor,
  };
}

export async function pickBlurbImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return {
    iconUri: result.assets[0].uri,
    iconType: 'image' as const,
  };
}
