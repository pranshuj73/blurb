import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { deriveMutedAccent, normalizeAccentColor, rgbToHsl } from './color';

function isUsefulPixel(r: number, g: number, b: number, a: number) {
  if (a < 200) return false;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  if (luma < 20 || luma > 235) return false;
  return true;
}

function rgbToLab(r: number, g: number, b: number) {
  const srgb = [r, g, b].map((value) => {
    const v = value / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  let [x, y, z] = srgb;
  x = x * 0.4124 + y * 0.3576 + z * 0.1805;
  y = x * 0.2126 + y * 0.7152 + z * 0.0722;
  z = x * 0.0193 + y * 0.1192 + z * 0.9505;

  const refX = 0.95047;
  const refY = 1.0;
  const refZ = 1.08883;

  const fx = x / refX;
  const fy = y / refY;
  const fz = z / refZ;

  const f = (t: number) => (t > 0.008856 ? Math.pow(t, 1 / 3) : (7.787 * t) + 16 / 116);

  const l = 116 * f(fy) - 16;
  const a = 500 * (f(fx) - f(fy));
  const bVal = 200 * (f(fy) - f(fz));
  return { l, a, b: bVal };
}

function kmeansLab(pixels: Array<{ r: number; g: number; b: number; l: number; a: number; bLab: number }>, k: number) {
  const centers = [];
  for (let i = 0; i < k; i += 1) {
    centers.push({ ...pixels[Math.floor(Math.random() * pixels.length)] });
  }

  for (let iter = 0; iter < 6; iter += 1) {
    const clusters = Array.from({ length: k }, () => ({
      l: 0,
      a: 0,
      b: 0,
      r: 0,
      g: 0,
      bRgb: 0,
      count: 0,
    }));

    for (const p of pixels) {
      let best = 0;
      let bestDist = Infinity;
      for (let i = 0; i < k; i += 1) {
        const c = centers[i];
        const dl = p.l - c.l;
        const da = p.a - c.a;
        const db = p.bLab - c.bLab;
        const dist = dl * dl + da * da + db * db;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      }
      const cluster = clusters[best];
      cluster.l += p.l;
      cluster.a += p.a;
      cluster.b += p.bLab;
      cluster.r += p.r;
      cluster.g += p.g;
      cluster.bRgb += p.b;
      cluster.count += 1;
    }

    for (let i = 0; i < k; i += 1) {
      const cluster = clusters[i];
      if (cluster.count === 0) continue;
      centers[i] = {
        r: cluster.r / cluster.count,
        g: cluster.g / cluster.count,
        b: cluster.bRgb / cluster.count,
        l: cluster.l / cluster.count,
        a: cluster.a / cluster.count,
        bLab: cluster.b / cluster.count,
      };
    }
  }

  return centers;
}

async function getDominantColorWeb(iconUrl: string) {
  return new Promise<string | null>((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const size = 32;
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
        const pixels: Array<{ r: number; g: number; b: number; l: number; a: number; bLab: number }> = [];

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];
          if (!isUsefulPixel(r, g, b, a)) continue;
          const lab = rgbToLab(r, g, b);
          pixels.push({ r, g, b, l: lab.l, a: lab.a, bLab: lab.b });
        }

        if (pixels.length === 0) {
          resolve(null);
          return;
        }

        const clusters = kmeansLab(pixels, 6);
        let best: { r: number; g: number; b: number; score: number } | null = null;
        const counts = new Map<number, number>();

        for (const p of pixels) {
          let bestIdx = 0;
          let bestDist = Infinity;
          for (let i = 0; i < clusters.length; i += 1) {
            const c = clusters[i];
            const dl = p.l - c.l;
            const da = p.a - c.a;
            const db = p.bLab - c.bLab;
            const dist = dl * dl + da * da + db * db;
            if (dist < bestDist) {
              bestDist = dist;
              bestIdx = i;
            }
          }
          counts.set(bestIdx, (counts.get(bestIdx) || 0) + 1);
        }

        clusters.forEach((c, idx) => {
          const count = counts.get(idx) || 0;
          const fraction = count / pixels.length;
          if (fraction < 0.02) return;
          const { s, l } = rgbToHsl(c.r, c.g, c.b);
          if (s < 0.2 || l < 0.2 || l > 0.85) return;
          const score = s * Math.sqrt(fraction);
          if (!best || score > best.score) {
            best = { r: c.r, g: c.g, b: c.b, score };
          }
        });

        if (!best) {
          const dominantIdx = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0];
          const dominant = dominantIdx !== undefined ? clusters[dominantIdx] : clusters[0];
          best = { r: dominant.r, g: dominant.g, b: dominant.b, score: 0 };
        }

        resolve(
          `#${[best.r, best.g, best.b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`
        );
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
  if (Platform.OS !== 'web') {
    try {
      const nativeModule = requireOptionalNativeModule('ImageColors') as
        | { getColors?: (uri: string, config?: Record<string, any>) => Promise<any> }
        | null;
      if (!nativeModule?.getColors) return fallback;

      const result = await nativeModule.getColors(iconUrl, {
        fallback,
        cache: true,
        key: iconUrl,
        quality: 'low',
        pixelSpacing: 6,
      });
      if (result.platform === 'ios') {
        const preferred = result.primary || result.detail || result.secondary || result.background;
        return preferred ? normalizeAccentColor(preferred) : fallback;
      }
      const preferred = result.vibrant || result.dominant || result.lightVibrant || result.darkVibrant;
      return preferred ? normalizeAccentColor(preferred) : fallback;
    } catch {
      return fallback;
    }
  }

  const dominant = await getDominantColorWeb(iconUrl);
  if (!dominant) return fallback;
  return normalizeAccentColor(dominant);
}
