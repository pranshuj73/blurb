import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';

interface ThemedIconProps {
  uri: string;
  size: number;
  borderRadius?: number;
  style?: any;
}

/**
 * ThemedIcon - Icon display component
 * 
 * Features:
 * - Proper containment without cropping
 * - Consistent sizing
 */
export function ThemedIcon({ uri, size, borderRadius, style }: ThemedIconProps) {
  const iconSize = size * 0.80;
  const padding = (size - iconSize) / 2;
  // Always make icons circular
  const finalBorderRadius = size / 2;

  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: finalBorderRadius }, style]}>
      <View style={[styles.imageWrapper, { padding }]}>
        <Image
          source={{ uri }}
          style={[styles.image, { width: iconSize, height: iconSize }]}
          contentFit="contain"
          transition={200}
          cachePolicy="memory-disk"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    // Image styling handled by contentFit="contain"
  },
});
