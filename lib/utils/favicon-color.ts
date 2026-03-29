import { Platform } from 'react-native';
import { deriveMutedAccent, mixColors } from './color';

function isUsefulPixel(r: number, g: number, b: number, a: number) {
  if (a < 200) return false;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luma < 20 || luma > 235) return false;
  return true;
}

async function getDominantColorWeb(iconUrl: string) {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const size = 24;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(image, 0, 0, size, size);
        const { data } = ctx.getImageData(0, 0, size, size);
        const buckets = new Map<string, number>();

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (!isUsefulPixel(r, g, b, a)) continue;
          const key = `${r >> 3},${g >> 3},${b >> 3}`;
          buckets.set(key, (buckets.get(key) || 0) + 1);
        }

        let bestKey: string | null = null;
        let bestCount = 0;
        buckets.forEach((count, key) => {
          if (count > bestCount) {
            bestCount = count;
            bestKey = key;
          }
        });

        if (!bestKey) {
          resolve(null);
          return;
        }

        const [r, g, b] = bestKey.split(',').map((value) => (parseInt(value, 10) << 3) + 4);
        resolve(`#${[r, g, b].map((value) => value.toString(16).padStart(2, '0')).join('')}`);
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = iconUrl;
  });
}

export async function getAccentColorFromFavicon(iconUrl: string | undefined, seed: string) {
  const fallback = deriveMutedAccent(seed);
  if (!iconUrl) return fallback;
  if (Platform.OS !== 'web') return fallback;

  const dominant = await getDominantColorWeb(iconUrl);
  if (!dominant) return fallback;
  return mixColors(dominant, '#0D0D10', 0.6);
}
