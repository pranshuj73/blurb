import React, { useCallback, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Alert,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { useRouter, useFocusEffect } from 'expo-router';
import { Entry, storage } from '@/lib/storage';
import { EntryRow } from '@/components/entry/entry-row';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

export function EntriesList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const router = useRouter();

  const loadEntries = useCallback(async () => {
    const loaded = await storage.getAllEntries();
    setEntries(loaded);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const handleEntryPress = useCallback(
    (entry: Entry) => {
      router.push(`/fullscreen-qr?id=${entry.id}`);
    },
    [router]
  );

  const handleEntryLongPress = useCallback(
    (entry: Entry) => {
      Alert.alert(
        entry.title,
        undefined,
        [
          {
            text: 'Edit',
            onPress: () => router.push(`/add-entry?id=${entry.id}`),
          },
          {
            text: 'Share QR',
            onPress: () => {
              // TODO: Implement share QR
              Alert.alert('Share QR', 'Feature coming soon');
            },
          },
          {
            text: 'Share Link',
            onPress: () => {
              // TODO: Implement share link
              Alert.alert('Share Link', entry.link);
            },
          },
          {
            text: 'Duplicate',
            onPress: async () => {
              await storage.duplicateEntry(entry.id);
              loadEntries();
            },
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => {
              Alert.alert(
                'Delete Entry',
                `Are you sure you want to delete "${entry.title}"?`,
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                      await storage.deleteEntry(entry.id);
                      loadEntries();
                    },
                  },
                ]
              );
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ],
        { cancelable: true }
      );
    },
    [router, loadEntries]
  );

  const swipeGesture = Gesture.Pan()
    .minDistance(100)
    .activeOffsetX(100)
    .onEnd((event) => {
      if (event.translationX > 100) {
        router.push('/add-entry');
      }
    });

  const renderEntry = useCallback(
    ({ item }: { item: Entry }) => (
      <EntryRow
        entry={item}
        onPress={() => handleEntryPress(item)}
        onLongPress={() => handleEntryLongPress(item)}
      />
    ),
    [handleEntryPress, handleEntryLongPress]
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>No entries yet</Text>
      <Text style={styles.emptySubtitle}>
        Swipe right to add your first entry
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <GestureDetector gesture={swipeGesture}>
        <FlatList
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={entries.length === 0 ? styles.emptyList : undefined}
        />
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    ...BlurbTypography.subtitle,
    color: BlurbColors.textSecondary,
    textAlign: 'center',
  },
});
