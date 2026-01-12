import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Image } from 'expo-image';

interface IconImageProps {
  uri: string;
  size: number;
  style?: any;
}

export function IconImage({ uri, size, style }: IconImageProps) {
  return (
    <View style={[styles.container, { width: size, height: size, borderRadius: size / 2 }, style]}>
      <Image
        source={{ uri }}
        style={[styles.image, { width: size * 0.85, height: size * 0.85 }]}
        contentFit="contain"
        transition={200}
        cachePolicy="memory-disk"
      />
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
  image: {
    // Apply grayscale and high contrast using tintColor
    // This will make the image black/white
    tintColor: '#000000',
    // Use blend mode for better contrast
    ...(Platform.OS === 'ios' && {
      // iOS specific filters
    }),
  },
});
