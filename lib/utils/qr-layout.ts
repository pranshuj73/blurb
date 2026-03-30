export interface QRSizing {
  shellSize: number;
  shellPadding: number;
  qrSize: number;
  heroIconSize: number;
  heroBadgeSize: number;
  qrLogoSize: number;
  qrLogoContainerSize: number;
  outerPadding: number;
  outerRadius: number;
  shellRadius: number;
  innerRadius: number;
}

const MIN_SHELL = 320;
const MAX_SHELL = 520;

export function getQRLayout(minDimension: number): QRSizing {
  const baseSize = Math.min(MAX_SHELL, Math.max(MIN_SHELL, Math.round(minDimension * 0.75)));
  const shellScale = 0.78;
  const shellSize = Math.round(baseSize * shellScale);
  const outerPadding = Math.max(Math.round(baseSize * 0.1), 20);
  const outerRadius = Math.max(Math.round(shellSize * 0.2), 28);
  const shellPadding = Math.max(Math.round(shellSize * 0.1), 20);
  const shellRadius = Math.max(outerRadius - outerPadding, 0) * 1.75;
  const innerRadius = Math.max(shellRadius - shellPadding, 0) * 1.75;
  const qrSize = Math.max(shellSize - shellPadding * 2, 200);
  const heroIconSize = Math.round(shellSize * 0.16);
  const heroBadgeSize = heroIconSize + 32;
  const qrLogoSize = Math.max(Math.round(qrSize * 0.22), 36);
  const qrLogoContainerSize = qrLogoSize + 22;
  return {
    shellSize,
    shellPadding,
    qrSize,
    heroIconSize,
    heroBadgeSize,
    qrLogoSize,
    qrLogoContainerSize,
    outerPadding,
    outerRadius,
    shellRadius,
    innerRadius,
  };
}
