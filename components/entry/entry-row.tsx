import { Entry } from '@/lib/storage';
import { BlurbColors } from '@/theme/colors';
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedIcon } from './themed-icon';
import { LinearGradient } from 'expo-linear-gradient';
import { withAlpha } from '@/lib/utils/color';

interface EntryRowProps {
  entry: Entry;
  onPress: () => void;
  onLongPress: () => void;
  transparentContainer?: boolean;
  compactPadding?: boolean;
}

export function EntryRow({
  entry,
  onPress,
  onLongPress,
  transparentContainer = false,
  compactPadding = false,
}: EntryRowProps) {
  const host = useMemo(() => {
    try {
      return new URL(entry.link).hostname.replace(/^www\./, '');
    } catch {
      return entry.link.replace(/^https?:\/\//, '').split('/')[0];
    }
  }, [entry.link]);
  const accent = entry.accentColor || '#1F1F22';
  const gradientStart = withAlpha(accent, 0.3);
  const gradientMid = withAlpha(accent, 0.12);
  const gradientEnd = withAlpha(accent, 0.02);

  return (
    <TouchableOpacity
      style={[
        styles.container,
        transparentContainer && styles.containerTransparent,
        compactPadding && styles.containerCompact,
      ]}
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      delayPressIn={0}
    >
      <View style={styles.row}>
        <LinearGradient
          colors={[gradientStart, gradientMid, gradientEnd]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        />
        <View style={styles.iconContainer}>
          {entry.iconUri ? (
            <View style={styles.iconBadge}>
              <ThemedIcon uri={entry.iconUri} iconType={entry.iconType} size={40} />
            </View>
          ) : (
            <View style={styles.iconBadge}>
              <ThemedIcon uri="Link" iconType="lucide" size={40} />
            </View>
          )}
        </View>
        
        <View style={styles.textContainer}>
          <Text style={styles.title} numberOfLines={1}>
            {entry.title}
          </Text>
          {entry.subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {entry.subtitle}
            </Text>
          ) : (
            <Text style={styles.subtitle} numberOfLines={1}>
              {host}
            </Text>
          )}
        </View>
        <View style={styles.accentDotWrapper} />
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
  containerTransparent: {
    backgroundColor: 'transparent',
  },
  containerCompact: {
    paddingHorizontal: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 18,
    minHeight: 88,
    borderWidth: 1,
    borderColor: BlurbColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
  },
  iconContainer: {
    marginRight: 16,
  },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: BlurbColors.backgroundElevated,
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  iconPlaceholder: {
    backgroundColor: BlurbColors.backgroundElevated,
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
    marginRight: 12,
  },
  accentDotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
    color: BlurbColors.text,
    marginBottom: 4,
    letterSpacing: -0.3,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 19,
    color: BlurbColors.textSecondary,
    letterSpacing: -0.1,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
});
