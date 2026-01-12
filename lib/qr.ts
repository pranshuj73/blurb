// QR code generation utilities
// This module provides helpers for QR code generation and sizing

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const QR_CONFIG = {
  // QR code size should be ~60% of screen width, but max 280px
  getSize(): number {
    const maxSize = Math.min(SCREEN_WIDTH * 0.6, 280);
    return Math.floor(maxSize);
  },

  // Fullscreen QR should use ~60% of the screen
  getFullscreenSize(): number {
    const minDimension = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
    return Math.floor(minDimension * 0.6);
  },

  // Error correction level for better scanner reliability
  errorCorrectionLevel: 'M' as const, // Medium error correction (15% recovery)
};
