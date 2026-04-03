import { EntryRow } from '@/components/entry/entry-row';
import { ScannedEntry, storage } from '@/lib/storage';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { useFocusEffect, useRouter } from 'expo-router';
import { Camera, ChevronLeft, Users } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const EXIT_DURATION_MS = 180;

export function ScannedEntries() {
  const [entries, setEntries] = useState<ScannedEntry[]>([]);
  const [isClosing, setIsClosing] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadEntries = useCallback(async () => {
    const scannedEntries = await storage.getAllScannedEntries();
    setEntries(scannedEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      setIsClosing(false);

      return () => {
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
      };
    }, [loadEntries])
  );

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    closeTimeoutRef.current = setTimeout(() => {
      router.back();
    }, EXIT_DURATION_MS);
  }, [isClosing, router]);

  const handleOpenScanner = useCallback(() => {
    router.push('/scan');
  }, [router]);

  const handlePress = useCallback(
    (entry: ScannedEntry) => {
      router.push({
        pathname: '/preview',
        params: {
          entry: JSON.stringify(entry),
          isNew: 'false',
        },
      });
    },
    [router]
  );

  const renderItem = useCallback(
    ({ item }: { item: ScannedEntry }) => (
      <EntryRow
        entry={item}
        onPress={() => handlePress(item)}
        onLongPress={() => handlePress(item)}
        transparentContainer
        compactPadding
      />
    ),
    [handlePress]
  );

  return (
    <View style={styles.container}>
      {!isClosing && (
        <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.backdrop} />
      )}
      {!isClosing && (
        <Animated.View
          entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(EXIT_DURATION_MS).easing(Easing.in(Easing.cubic))}
          style={[styles.sheet, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
        >
          <View style={styles.header}>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.backButton} onPress={handleClose} activeOpacity={0.85}>
                <ChevronLeft color={BlurbColors.text} size={18} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanButton} onPress={handleOpenScanner} activeOpacity={0.85}>
                <Camera color={BlurbColors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerCopy}>
              <Text style={styles.title}>Scanned blurbs</Text>
              <Text style={styles.subtitle}>Scan a blurb and they&apos;ll appear here.</Text>
            </View>
          </View>

          <FlatList
            data={entries}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.link}-${item.scannedAt}`}
            contentContainerStyle={entries.length === 0 ? styles.emptyList : styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Users color={BlurbColors.textSecondary} size={24} />
                </View>
                <Text style={styles.emptyTitle}>No scans yet</Text>
                <Text style={styles.emptyCopy}>
                  Scan someone&apos;s QR from the home screen and they&apos;ll appear here.
                </Text>
              </View>
            }
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
  },
  sheet: {
    minHeight: '78%',
    maxHeight: '92%',
    backgroundColor: '#0C0C0E',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
  },
  header: {
    paddingBottom: 18,
    gap: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  scanButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
    fontWeight: '500',
  },
  headerCopy: {
    paddingHorizontal: 0,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    color: BlurbColors.text,
    fontFamily: 'Manrope',
  },
  subtitle: {
    ...BlurbTypography.small,
    color: 'rgba(255,255,255,0.58)',
    marginTop: 6,
  },
  listContent: {
    paddingBottom: 24,
    gap: 14,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    marginTop: -88,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 18,
  },
  emptyTitle: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyCopy: {
    ...BlurbTypography.small,
    color: 'rgba(255,255,255,0.58)',
    textAlign: 'center',
    maxWidth: 220,
    lineHeight: 20,
  },
});
