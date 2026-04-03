import { EntryRow } from '@/components/entry/entry-row';
import { ScannedEntry, storage } from '@/lib/storage';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import * as Crypto from 'expo-crypto';
import { useFocusEffect, useRouter } from 'expo-router';
import { ChevronLeft, ScanLine, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScannedEntries() {
  const [entries, setEntries] = useState<ScannedEntry[]>([]);
  const [isSavingId, setIsSavingId] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const loadEntries = useCallback(async () => {
    const scannedEntries = await storage.getAllScannedEntries();
    setEntries(scannedEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

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

  const handleSave = useCallback(
    async (entry: ScannedEntry) => {
      try {
        setIsSavingId(entry.id);
        await storage.saveEntry({
          ...entry,
          id: Crypto.randomUUID(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        Alert.alert('Saved', 'This card has been added to your own list.');
      } catch (error) {
        console.error('Error saving scanned entry:', error);
        Alert.alert('Save failed', 'This scan could not be added to your cards.');
      } finally {
        setIsSavingId(null);
      }
    },
    []
  );

  const renderItem = useCallback(
    ({ item }: { item: ScannedEntry }) => (
      <View style={styles.cardRow}>
        <EntryRow entry={item} onPress={() => handlePress(item)} onLongPress={() => handleSave(item)} />
        <TouchableOpacity
          style={[styles.saveButton, isSavingId === item.id && styles.saveButtonDisabled]}
          onPress={() => handleSave(item)}
          disabled={isSavingId === item.id}
          activeOpacity={0.85}
        >
          <Text style={styles.saveButtonText}>{isSavingId === item.id ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>
    ),
    [handlePress, handleSave, isSavingId]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.sheet, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
            <ChevronLeft color={BlurbColors.text} size={18} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.headerCopy}>
            <View style={styles.eyebrow}>
              <ScanLine color={BlurbColors.textSecondary} size={15} />
              <Text style={styles.eyebrowText}>Scanned people</Text>
            </View>
            <Text style={styles.title}>Recent scans</Text>
            <Text style={styles.copy}>Open a scan to preview it, or save it into your own card stack.</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.52)',
    justifyContent: 'flex-end',
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
  backButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
    fontWeight: '500',
  },
  headerCopy: {
    gap: 8,
    paddingHorizontal: 6,
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyebrowText: {
    ...BlurbTypography.small,
    color: BlurbColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
  },
  title: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '700',
    color: BlurbColors.text,
    fontFamily: 'Manrope',
  },
  copy: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
    maxWidth: 300,
  },
  listContent: {
    paddingBottom: 24,
    gap: 14,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  cardRow: {
    position: 'relative',
  },
  saveButton: {
    position: 'absolute',
    right: 16,
    bottom: 18,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...BlurbTypography.small,
    color: BlurbColors.text,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
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
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
    textAlign: 'center',
  },
});
