import { EntryRow } from '@/components/entry/entry-row';
import { EntryRowSkeleton } from '@/components/skeleton-loader';
import { Entry, storage } from '@/lib/storage';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { useFocusEffect, useRouter } from 'expo-router';
import { Camera, ScanLine } from 'lucide-react-native';
import React, { useCallback, useRef, useState } from 'react';
import { Dimensions, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const [scrollOffset, setScrollOffset] = useState(0);
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  const pullDistance = useSharedValue(0);
  const isPulling = useSharedValue(false);
  const isOpeningScanned = useSharedValue(false);

  const loadEntries = useCallback(async () => {
    setIsLoading(true);
    const loadedEntries = await storage.getAllEntries();
    setEntries(loadedEntries);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
      pullDistance.value = 0;
      isPulling.value = false;
      isOpeningScanned.value = false;
      setScrollOffset(0);
    }, [isOpeningScanned, isPulling, loadEntries, pullDistance])
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
    router.push('/add-entry');
  }, [router]);

  const handleOpenScanner = useCallback(() => {
    router.push('/scan');
  }, [router]);

  const handleOpenScanned = useCallback(() => {
    router.push('/scanned');
  }, [router]);

  const pullGesture = Gesture.Pan()
    .activeOffsetY(30)
    .failOffsetX([-15, 15])
    .minDistance(25)
    .maxPointers(1)
    .onStart(() => {
      if (scrollOffset <= 0) {
        isPulling.value = true;
      }
    })
    .onChange((event) => {
      if (scrollOffset <= 0 && event.translationY > 0) {
        pullDistance.value = Math.min(event.translationY, PULL_THRESHOLD * 1.5);
      } else {
        pullDistance.value = 0;
        isPulling.value = false;
      }
    })
    .onEnd((event) => {
      if (scrollOffset <= 0 && event.translationY > PULL_THRESHOLD) {
        pullDistance.value = withSpring(0, { damping: 25, stiffness: 200 });
        runOnJS(handleAddEntry)();
      } else {
        pullDistance.value = withSpring(0, { damping: 20, stiffness: 180 });
      }
      isPulling.value = false;
    })
    .onFinalize(() => {
      pullDistance.value = withSpring(0, { damping: 20, stiffness: 180 });
      isPulling.value = false;
    });

  const scannedGesture = Gesture.Pan()
    .activeOffsetX([-24, 24])
    .failOffsetY([-20, 20])
    .onEnd((event) => {
      if (isOpeningScanned.value) return;
      if (event.translationX < -72 || event.velocityX < -780) {
        isOpeningScanned.value = true;
        runOnJS(handleOpenScanned)();
      }
    });

  const composedGesture = Gesture.Simultaneous(pullGesture, scannedGesture);

  const indicatorOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(pullDistance.value, [0, 30, PULL_THRESHOLD], [0, 0.3, 1], Extrapolation.CLAMP),
  }));

  const indicatorTranslateY = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: interpolate(pullDistance.value, [0, PULL_THRESHOLD], [-60, 40], Extrapolation.CLAMP),
      },
    ],
  }));

  const textOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(pullDistance.value, [60, PULL_THRESHOLD], [0, 1], Extrapolation.CLAMP),
  }));

  const renderEntry = useCallback(
    ({ item }: { item: Entry }) => (
      <EntryRow
        entry={item}
        onPress={() => handleEntryPress(item)}
        onLongPress={() => handleEntryLongPress(item)}
      />
    ),
    [handleEntryLongPress, handleEntryPress]
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
        <Text style={styles.emptySubtitle}>Pull down to add your first entry</Text>
      </View>
    );
  }, [isLoading]);

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents="none"
        style={[styles.pullIndicator, { paddingTop: insets.top + 8 }, indicatorOpacity, indicatorTranslateY]}
      >
        <View style={styles.indicatorLine} />
        <Animated.View style={[styles.indicatorText, textOpacity]}>
          <Text style={styles.indicatorTextContent}>+ A D D E N T R Y</Text>
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <View style={styles.mainSurface}>
          <FlatList
            ref={flatListRef}
            data={entries}
            renderItem={renderEntry}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmpty}
            ListHeaderComponent={
              <View style={[styles.header, { paddingTop: insets.top + SCREEN_HEIGHT * TOP_PADDING_PERCENT }]}>
                <View style={styles.brandRow}>
                  <Text style={styles.brandText}>blurb</Text>
                  <Text style={styles.brandDot}>.</Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleOpenScanned}
                  style={[styles.scannedShortcut, { top: insets.top + SCREEN_HEIGHT * TOP_PADDING_PERCENT }]}
                >
                  <ScanLine color={BlurbColors.textSecondary} size={15} />
                  <Text style={styles.scannedShortcutText}>Recent scans</Text>
                </TouchableOpacity>
                <View style={styles.headerDivider} />
              </View>
            }
            contentContainerStyle={[
              styles.listContent,
              entries.length === 0 ? styles.emptyList : undefined,
              { paddingBottom: 136 },
            ]}
            ListFooterComponent={<View style={styles.listFooter} />}
            onScroll={(event) => setScrollOffset(event.nativeEvent.contentOffset.y)}
            scrollEventThrottle={16}
            bounces
          />

          <View style={[styles.fabWrap, { bottom: insets.bottom + 28 }]}>
            <TouchableOpacity style={styles.fabButton} onPress={handleOpenScanner} activeOpacity={0.9}>
              <Camera color={BlurbColors.background} size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
  },
  mainSurface: {
    flex: 1,
  },
  listContent: {
    flexGrow: 1,
  },
  emptyList: {
    flexGrow: 1,
  },
  listFooter: {
    height: 80,
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
    paddingHorizontal: 24,
    paddingBottom: 16,
    position: 'relative',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  brandText: {
    fontSize: 34,
    fontWeight: '700',
    color: BlurbColors.text,
    letterSpacing: -0.8,
    fontFamily: 'Manrope',
  },
  brandDot: {
    fontSize: 34,
    fontWeight: '700',
    color: BlurbColors.textSecondary,
    marginLeft: 2,
    lineHeight: 38,
    fontFamily: 'Manrope',
  },
  scannedShortcut: {
    position: 'absolute',
    right: 24,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(28, 28, 30, 0.92)',
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  scannedShortcutText: {
    ...BlurbTypography.small,
    color: BlurbColors.textSecondary,
    letterSpacing: 0.5,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BlurbColors.border,
    marginTop: 16,
  },
  fabWrap: {
    position: 'absolute',
    right: 22,
    zIndex: 20,
  },
  fabButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: '#F4F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
});
