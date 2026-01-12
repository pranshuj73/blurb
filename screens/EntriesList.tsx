import React, { useCallback, useState, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Entry, storage } from '@/lib/storage';
import { EntryRow } from '@/components/entry/entry-row';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

export function EntriesList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

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

  const handleAddEntry = useCallback(() => {
    try {
      router.push('/add-entry');
    } catch (error) {
      console.error('Error navigating to add-entry:', error);
    }
  }, [router]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      handleAddEntry();
    } finally {
      // Small delay to show the refresh animation
      setTimeout(() => {
        setIsRefreshing(false);
      }, 500);
    }
  }, [handleAddEntry]);

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
        Pull down to add your first entry
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={entries}
        renderItem={renderEntry}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={entries.length === 0 ? styles.emptyList : undefined}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={BlurbColors.text}
            colors={[BlurbColors.text]}
            progressViewOffset={20}
          />
        }
      />
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
