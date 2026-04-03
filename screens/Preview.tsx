import { ThemedIcon } from '@/components/entry/themed-icon';
import { useAppAlert } from '@/components/ui/app-alert-provider';
import { Heading } from '@/components/ui/heading';
import { Label } from '@/components/ui/label';
import { Subheading } from '@/components/ui/subheading';
import { QR_CONFIG } from '@/lib/qr';
import { Entry, ScannedEntry, storage } from '@/lib/storage';
import { getAccentColorFromFavicon } from '@/lib/utils/favicon-color';
import { BlurbColors } from '@/theme/colors';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ExternalLink, Pencil } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function Preview() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const params = useLocalSearchParams<{ entry: string; isNew: string; editableTitle?: string }>();
  const insets = useSafeAreaInsets();

  const screenOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.95);

  const initialEntry: Entry | ScannedEntry | null = useMemo(() => {
    try {
      return JSON.parse(params.entry || '{}');
    } catch {
      return null;
    }
  }, [params.entry]);
  const [entry, setEntry] = useState<Entry | ScannedEntry | null>(initialEntry);

  const isNew = params.isNew === 'true';
  const isTitleEditable = params.editableTitle === 'true';
  const isScannedEntry = Boolean(entry && 'scannedAt' in entry);
  const [editableTitle, setEditableTitle] = useState('');

  useEffect(() => {
    setEntry(initialEntry);
  }, [initialEntry]);

  useEffect(() => {
    setEditableTitle(entry?.title ?? '');
  }, [entry?.title]);

  useFocusEffect(
    React.useCallback(() => {
      if (isNew || !initialEntry) return;

      const syncEntry = async () => {
        if ('scannedAt' in initialEntry) {
          const scannedEntries = await storage.getAllScannedEntries();
          const latest = scannedEntries.find((item) => item.link === initialEntry.link) ?? null;
          setEntry(latest);
          return;
        }

        const latest = await storage.getEntry(initialEntry.id);
        setEntry(latest);
      };

      void syncEntry();
    }, [initialEntry, isNew])
  );

  useEffect(() => {
    screenOpacity.value = withSpring(1, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(1, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
  }, [screenOpacity, screenScale]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ scale: screenScale.value }],
  }));

  const animateAndRun = (callback: () => void) => {
    screenOpacity.value = withSpring(
      0,
      {
        damping: 30,
        stiffness: 300,
        mass: 0.7,
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(callback)();
        }
      }
    );
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
  };

  const handleBack = () => {
    animateAndRun(() => router.back());
  };

  if (!entry || !entry.link) {
    return (
      <Animated.View style={[styles.container, screenStyle]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerSide}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ChevronLeft color={BlurbColors.text} size={20} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Error</Text>
          </View>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            <View style={styles.headerSidePlaceholder} />
          </View>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid entry data</Text>
        </View>
      </Animated.View>
    );
  }

  const handleSave = async () => {
    const resolvedTitle = (isTitleEditable ? editableTitle : entry.title).trim() || entry.title;
    const domainSeed = (() => {
      try {
        return new URL(entry.link).hostname.replace(/^www\./, '');
      } catch {
        return entry.link;
      }
    })();

    const resolvedAccent =
      entry.iconType === 'image'
        ? await getAccentColorFromFavicon(entry.iconUri, domainSeed)
        : await getAccentColorFromFavicon(undefined, domainSeed);

    animateAndRun(async () => {
      await storage.saveEntry({
        ...entry,
        title: resolvedTitle,
        accentColor: resolvedAccent || entry.accentColor,
      });
      router.replace('/');
    });
  };

  const handleVisit = async () => {
    try {
      await Linking.openURL(entry.link);
    } catch (error) {
      console.error('Error opening link:', error);
      await showAlert({
        title: 'Open failed',
        message: 'This link could not be opened.',
      });
    }
  };

  const handleEdit = () => {
    router.push({
      pathname: isScannedEntry ? '/edit-scanned-blurb' : '/edit-entry-blurb',
      params: {
        entry: JSON.stringify(entry),
      },
    });
  };

  const qrSize = QR_CONFIG.getSize();

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <View style={styles.headerSide}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
              <ChevronLeft color={BlurbColors.text} size={20} />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Preview</Text>
          </View>
          <View style={[styles.headerSide, styles.headerSideRight]}>
            {!isNew ? (
              <TouchableOpacity onPress={handleEdit} style={styles.editButton} activeOpacity={0.85}>
                <Pencil color={BlurbColors.text} size={18} />
              </TouchableOpacity>
            ) : (
              <View style={styles.headerSidePlaceholder} />
            )}
          </View>
        </View>

        <View style={styles.preview}>
          <View style={styles.previewHeader}>
            {entry.iconUri ? (
              <ThemedIcon uri={entry.iconUri} iconType={entry.iconType} size={52} />
            ) : (
              <ThemedIcon uri="Link" iconType="lucide" size={52} />
            )}
            <View style={styles.titleSection}>
              {isTitleEditable ? (
                <TextInput
                  value={editableTitle}
                  onChangeText={setEditableTitle}
                  placeholder="Name"
                  placeholderTextColor={BlurbColors.textSecondary}
                  style={styles.titleInput}
                  maxLength={100}
                />
              ) : (
                <Heading size="md" weight="300">
                  {entry.title}
                </Heading>
              )}
              {entry.subtitle ? <Subheading size="md">{entry.subtitle}</Subheading> : null}
            </View>
          </View>

          <View style={styles.qrSpacer} />

          <View style={styles.qrWrapper}>
            <View style={styles.qrContainer}>
              <QRCode
                value={entry.link}
                size={qrSize}
                color={BlurbColors.qrForeground}
                backgroundColor={BlurbColors.qrBackground}
              />
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.metadata}>
            <Label size="xs">Link</Label>
            <View style={styles.linkRow}>
              <Text style={styles.metadataValue} selectable numberOfLines={2}>
                {entry.link}
              </Text>
              <TouchableOpacity style={styles.visitButton} onPress={handleVisit} activeOpacity={0.85}>
                <ExternalLink color={BlurbColors.text} size={16} />
                <Text style={styles.visitButtonText}>Visit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {isNew ? (
          <View style={styles.actions}>
            <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
              <Text style={styles.saveButtonText}>Save Entry</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BlurbColors.border,
  },
  headerSide: {
    width: 96,
    justifyContent: 'center',
  },
  headerLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerSideRight: {
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(12, 12, 14, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  editButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  headerSidePlaceholder: {
    width: 42,
    height: 42,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.4,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  preview: {
    padding: 32,
    backgroundColor: BlurbColors.backgroundElevated,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  qrSpacer: {
    height: 32,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 16,
  },
  titleSection: {
    flex: 1,
    alignItems: 'flex-start',
    paddingTop: 6,
  },
  titleInput: {
    width: '100%',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '300',
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-light',
      default: 'system-ui',
    }),
    borderBottomWidth: 1,
    borderBottomColor: BlurbColors.border,
    paddingBottom: 8,
    marginBottom: 6,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: BlurbColors.qrBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BlurbColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  divider: {
    height: 1,
    backgroundColor: BlurbColors.divider,
    marginBottom: 24,
  },
  metadata: {
    gap: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metadataValue: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  visitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  visitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
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
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: BlurbColors.textSecondary,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
});
