import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

const CACHE_DIR = new Directory(Paths.cache, 'favicons');

function getExtension(url: string) {
  const match = url.split('?')[0].match(/\.(png|jpg|jpeg|ico|webp)$/i);
  return match ? `.${match[1].toLowerCase()}` : '.png';
}

export async function cacheFavicon(iconUrl: string) {
  if (!iconUrl) return iconUrl;
  if (Platform.OS === 'web') return iconUrl;

  try {
    if (!CACHE_DIR.exists) {
      CACHE_DIR.create({ intermediates: true });
    }

    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, iconUrl);
    const ext = getExtension(iconUrl);
    const target = new File(CACHE_DIR, `${hash}${ext}`);
    if (target.exists) return target.uri;

    const downloaded = await File.downloadFileAsync(iconUrl, target, { idempotent: true });
    return downloaded.uri;
  } catch {
    return iconUrl;
  }
}
