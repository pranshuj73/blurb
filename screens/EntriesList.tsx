import React, { useCallback, useState, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  Alert,
  Dimensions,
  Platform,
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

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PULL_THRESHOLD = 180;
const TOP_PADDING_PERCENT = 0.25;

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
      // Smooth transition
      setTimeout(() => {
        router.push(`/fullscreen-qr?id=${entry.id}`);
      }, 50);
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
            onPress: () => {
              setTimeout(() => {
                router.push(`/add-entry?id=${entry.id}`);
              }, 50);
            },
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
    .activeOffsetY(25)
    .failOffsetX([-10, 10])
    .minDistance(20)
    .maxPointers(1)
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
        // Threshold crossed - navigate smoothly
        pullDistance.value = withSpring(0, {
          damping: 25,
          stiffness: 200,
        });
        runOnJS(handleAddEntry)();
      } else {
        // Below threshold - spring back elegantly
        pullDistance.value = withSpring(0, {
          damping: 20,
          stiffness: 180,
        });
      }
      isPulling.value = false;
    })
    .onFinalize(() => {
      pullDistance.value = withSpring(0, {
        damping: 20,
        stiffness: 180,
      });
      isPulling.value = false;
    });

  const indicatorOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      pullDistance.value,
      [0, 30, PULL_THRESHOLD],
      [0, 0.3, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const indicatorTranslateY = useAnimatedStyle(() => {
    const translateY = interpolate(
      pullDistance.value,
      [0, PULL_THRESHOLD],
      [-60, 40],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  const textOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      pullDistance.value,
      [60, PULL_THRESHOLD],
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
          ListHeaderComponent={
            <View style={[styles.header, { paddingTop: insets.top + SCREEN_HEIGHT * TOP_PADDING_PERCENT }]}>
              <Text style={styles.brandText}>blurb.</Text>
            </View>
          }
          contentContainerStyle={[
            entries.length === 0 ? styles.emptyList : undefined,
            { paddingBottom: 24 },
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
    paddingTop: 80,
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
  header: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '300',
    color: BlurbColors.text,
    letterSpacing: -0.5,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-light',
      default: 'system-ui',
    }),
  },
});
