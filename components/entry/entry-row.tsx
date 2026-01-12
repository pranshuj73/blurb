import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { Image } from 'expo-image';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { Entry } from '@/lib/storage';

interface EntryRowProps {
  entry: Entry;
  onPress: () => void;
  onLongPress: () => void;
}

export function EntryRow({ entry, onPress, onLongPress }: EntryRowProps) {
  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      delayPressIn={0}
    >
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          {entry.iconUri ? (
            <Image
              source={{ uri: entry.iconUri }}
              style={styles.icon}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View style={styles.iconPlaceholder}>
              <View style={styles.iconPlaceholderInner} />
            </View>
          )}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
          {entry.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {entry.subtitle}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: BlurbColors.background,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 20,
    padding: 20,
    minHeight: 88,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    marginRight: 20,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  iconPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholderInner: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: BlurbColors.pressable,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '600',
    lineHeight: 26,
    color: BlurbColors.text,
    marginBottom: 6,
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  subtitle: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    color: BlurbColors.textSecondary,
    letterSpacing: -0.2,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
});
