import React, { useCallback, useState, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Alert,
  Dimensions,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Entry, storage } from '@/lib/storage';
import { EntryRow } from '@/components/entry/entry-row';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

const PULL_THRESHOLD = 120;

export function EntriesList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const insets = useSafeAreaInsets();
  
  // Animation values
  const pullDistance = useSharedValue(0);
  const isPulling = useSharedValue(false);

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


  const pullGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-30, 30])
    .onStart(() => {
      if (scrollOffset <= 0) {
        isPulling.value = true;
      }
    })
    .onChange((event) => {
      if (scrollOffset <= 0 && event.translationY > 0) {
        const distance = Math.min(event.translationY, PULL_THRESHOLD * 1.5);
        pullDistance.value = distance;
      } else {
        pullDistance.value = 0;
        isPulling.value = false;
      }
    })
    .onEnd((event) => {
      if (scrollOffset <= 0 && event.translationY > PULL_THRESHOLD) {
        // Threshold crossed - navigate
        pullDistance.value = withSpring(0, {
          damping: 20,
          stiffness: 100,
        });
        runOnJS(handleAddEntry)();
      } else {
        // Below threshold - spring back
        pullDistance.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
      }
      isPulling.value = false;
    });

  const indicatorOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      pullDistance.value,
      [0, 20, PULL_THRESHOLD],
      [0, 0.3, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const indicatorTranslateY = useAnimatedStyle(() => {
    const translateY = interpolate(
      pullDistance.value,
      [0, PULL_THRESHOLD],
      [-40, 20],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  const textOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      pullDistance.value,
      [40, PULL_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
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
        Pull down to add your first entry
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.pullIndicator,
          { paddingTop: insets.top + 8 },
          indicatorOpacity,
          indicatorTranslateY,
        ]}
        pointerEvents="none"
      >
        <View style={styles.indicatorLine} />
        <Animated.View style={[styles.indicatorText, textOpacity]}>
          <Text style={styles.indicatorTextContent}>+ A D D  E N T R Y</Text>
        </Animated.View>
      </Animated.View>
      <GestureDetector gesture={pullGesture}>
        <FlatList
          ref={flatListRef}
          data={entries}
          renderItem={renderEntry}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            entries.length === 0 ? styles.emptyList : undefined,
            { paddingTop: insets.top },
          ]}
          scrollEnabled={true}
          onScroll={(event) => {
            setScrollOffset(event.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={16}
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
  pullIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 1000,
  },
  indicatorLine: {
    width: 40,
    height: 4,
    backgroundColor: BlurbColors.text,
    borderRadius: 2,
    marginBottom: 12,
  },
  indicatorText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorTextContent: {
    ...BlurbTypography.small,
    color: BlurbColors.text,
    letterSpacing: 2,
    fontWeight: '500',
  },
});
