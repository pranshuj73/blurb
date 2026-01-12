import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        {entry.iconUri && (
          <Image
            source={{ uri: entry.iconUri }}
            style={styles.icon}
            contentFit="cover"
            transition={200}
          />
        )}
        {!entry.iconUri && <View style={[styles.icon, styles.iconPlaceholder]} />}
        
        <View style={styles.textContainer}>
          <View style={styles.titleRow}>
            {entry.locked && <View style={styles.lockIndicator} />}
            <View style={styles.titleText}>
              <Text style={styles.title}>{entry.title}</Text>
            </View>
          </View>
          {entry.subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {entry.subtitle}
            </Text>
          )}
        </View>
      </View>
      
      {entry.accentColor && (
        <View style={[styles.accent, { backgroundColor: entry.accentColor }]} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: BlurbColors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BlurbColors.border,
    minHeight: 72,
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: BlurbColors.backgroundElevated,
  },
  iconPlaceholder: {
    backgroundColor: BlurbColors.pressable,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  lockIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: BlurbColors.textSecondary,
    marginRight: 6,
  },
  titleText: {
    flex: 1,
  },
  title: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.text,
  },
  subtitle: {
    ...BlurbTypography.subtitle,
    color: BlurbColors.textSecondary,
  },
  accent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
});
