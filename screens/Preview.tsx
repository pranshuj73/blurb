import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Image } from 'expo-image';
import { Entry, storage } from '@/lib/storage';
import { QR_CONFIG } from '@/lib/qr';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

export function Preview() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entry: string; isNew: string }>();
  
  const entry: Entry = useMemo(() => {
    try {
      return JSON.parse(params.entry || '{}');
    } catch {
      return null;
    }
  }, [params.entry]);

  const isNew = params.isNew === 'true';

  if (!entry || !entry.link) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid entry data</Text>
        </View>
      </View>
    );
  }

  const handleSave = async () => {
    await storage.saveEntry(entry);
    router.replace('/');
  };

  const handleViewFullscreen = async () => {
    if (!isNew) {
      router.push(`/fullscreen-qr?id=${entry.id}`);
    } else {
      // Save first, then view
      await storage.saveEntry(entry);
      router.push(`/fullscreen-qr?id=${entry.id}`);
    }
  };

  const qrSize = QR_CONFIG.getSize();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Preview</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          {entry.iconUri && (
            <Image
              source={{ uri: entry.iconUri }}
              style={styles.icon}
              contentFit="cover"
            />
          )}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{entry.title}</Text>
            {entry.subtitle && (
              <Text style={styles.subtitle}>{entry.subtitle}</Text>
            )}
          </View>
        </View>

        <View style={styles.qrContainer}>
          <QRCode
            value={entry.link}
            size={qrSize}
            color={BlurbColors.qrForeground}
            backgroundColor={BlurbColors.qrBackground}
            errorCorrectionLevel={QR_CONFIG.errorCorrectionLevel}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.metadata}>
          <Text style={styles.metadataLabel}>Link</Text>
          <Text style={styles.metadataValue} selectable>
            {entry.link}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {isNew && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.fullscreenButton, !isNew && styles.fullscreenButtonOnly]}
          onPress={handleViewFullscreen}
        >
          <Text style={styles.fullscreenButtonText}>View Fullscreen</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BlurbColors.border,
  },
  backButton: {
    minWidth: 60,
  },
  backButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
  },
  headerTitle: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
  },
  preview: {
    padding: 24,
    backgroundColor: BlurbColors.backgroundElevated,
    margin: 16,
    borderRadius: 12,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
  },
  title: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
    marginBottom: 4,
  },
  subtitle: {
    ...BlurbTypography.subtitle,
    color: BlurbColors.textSecondary,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    backgroundColor: BlurbColors.qrBackground,
    borderRadius: 8,
    marginBottom: 24,
  },
  divider: {
    height: 1,
    backgroundColor: BlurbColors.divider,
    marginBottom: 24,
  },
  metadata: {
    gap: 8,
  },
  metadataLabel: {
    ...BlurbTypography.small,
    color: BlurbColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  metadataValue: {
    ...BlurbTypography.mono,
    color: BlurbColors.textSecondary,
  },
  actions: {
    paddingHorizontal: 16,
    gap: 12,
  },
  saveButton: {
    backgroundColor: BlurbColors.backgroundElevated,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  saveButtonText: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.text,
  },
  fullscreenButton: {
    backgroundColor: BlurbColors.text,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  fullscreenButtonOnly: {
    marginTop: 0,
  },
  fullscreenButtonText: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
    textAlign: 'center',
  },
});
