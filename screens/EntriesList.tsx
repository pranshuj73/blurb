import { EntryRow } from '@/components/entry/entry-row';
import { EntryRowSkeleton } from '@/components/skeleton-loader';
import { Entry, storage } from '@/lib/storage';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const PULL_THRESHOLD = 180;
const TOP_PADDING_PERCENT = 0.25;

export function EntriesList() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const insets = useSafeAreaInsets();

  // Animation values
  const pullDistance = useSharedValue(0);
  const isPulling = useSharedValue(false);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    const loaded = await storage.getAllEntries();
    setEntries(loaded);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      // Reset gesture state when screen comes into focus
      pullDistance.value = 0;
      isPulling.value = false;
      setScrollOffset(0);
    }, [loadEntries, pullDistance, isPulling])
  );

  const handleEntryPress = useCallback(
    (entry: Entry) => {
      router.push(`/fullscreen-qr?id=${entry.id}`);
    },
    [router]
  );

  const handleEntryLongPress = useCallback(
    (entry: Entry) => {
      router.push(`/add-entry?id=${entry.id}`);
    },
    [router]
  );

  const handleAddEntry = useCallback(() => {
    try {
      router.push('/add-entry');
    } catch (error) {
      console.error('Error navigating to add-entry:', error);
    }
  }, [router]);


  const pullGesture = Gesture.Pan()
    .activeOffsetY(30)
    .failOffsetX([-15, 15])
    .minDistance(25)
    .maxPointers(1)
    .onStart(() => {
      if (scrollOffset <= 0) {
        isPulling.value = true;
      } else {
        // Fail the gesture immediately if not at top
        return;
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

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return (
        <>
          <EntryRowSkeleton />
          <EntryRowSkeleton />
          <EntryRowSkeleton />
        </>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No entries yet</Text>
        <Text style={styles.emptySubtitle}>
          Pull down to add your first entry
        </Text>
      </View>
    );
  }, [isLoading]);

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
            entries.length > 0 ? (
              <View style={[styles.header, { paddingTop: insets.top + SCREEN_HEIGHT * TOP_PADDING_PERCENT }]}>
                <Text style={styles.brandText}>blurb.</Text>
              </View>
            ) : null
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
          bounces={true}
          bouncesZoom={false}
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
    paddingBottom: 8,
  },
  brandText: {
    fontSize: 24,
    fontWeight: '600',
    color: BlurbColors.text,
    letterSpacing: -0.5,
    fontFamily: 'Manrope',
  },
});
