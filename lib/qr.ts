// QR code generation utilities
// This module provides helpers for QR code generation and sizing

import { Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export const QR_CONFIG = {
  // QR code size should be ~80% of screen width, but max 400px
  getSize(): number {
    const maxSize = Math.min(SCREEN_WIDTH * 0.8, 400);
    return Math.floor(maxSize);
  },

  // Fullscreen QR should use most of the screen
  getFullscreenSize(): number {
    const minDimension = Math.min(SCREEN_WIDTH, SCREEN_HEIGHT);
    return Math.floor(minDimension * 0.7);
  },

  // Error correction level for better scanner reliability
  errorCorrectionLevel: 'M' as const, // Medium error correction (15% recovery)
};
