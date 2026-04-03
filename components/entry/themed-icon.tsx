import { Image } from 'expo-image';
import * as LucideIcons from 'lucide-react-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface ThemedIconProps {
  uri: string;
  iconType?: 'image' | 'lucide';
  size: number;
  borderRadius?: number;
  style?: any;
  iconSize?: number;
}

/**
 * ThemedIcon - Icon display component
 * 
 * Features:
 * - Proper containment without cropping
 * - Consistent sizing
 */
export function ThemedIcon({ uri, iconType = 'image', size, borderRadius, style, iconSize = 32 }: ThemedIconProps) {
  const resolvedIconSize = iconType === 'lucide' && iconSize === 32 ? Math.round(size * 0.52) : iconSize;
  // Match the placeholder inner size (32px)
  const padding = (size - resolvedIconSize) / 2;
  // Always make icons circular
  const finalBorderRadius = size / 2;

  // If it's a Lucide icon, render the icon component
  if (iconType === 'lucide') {
    const IconComponent = (LucideIcons as any)[uri];
    if (!IconComponent) {
      // Fallback to default icon if not found
      const FallbackIcon = LucideIcons.Link;
      return (
        <View style={[styles.container, { width: size, height: size, borderRadius: finalBorderRadius }, style]}>
          <FallbackIcon size={resolvedIconSize} color="#000000" />
        </View>
      );
    }
    return (
      <View style={[styles.container, { width: size, height: size, borderRadius: finalBorderRadius }, style]}>
        <IconComponent size={resolvedIconSize} color="#000000" />
      </View>
    );
  }

  // Otherwise render image
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: finalBorderRadius }, style]}>
      <View style={[styles.imageWrapper, { padding }]}>
        <Image
          source={{ uri }}
          style={[styles.image, { width: resolvedIconSize, height: resolvedIconSize }]}
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
