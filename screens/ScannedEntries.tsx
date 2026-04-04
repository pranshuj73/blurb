import { EntryRow } from '@/components/entry/entry-row';
import { ScannedEntry, storage } from '@/lib/storage';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { useFocusEffect, useRouter } from 'expo-router';
import { Camera, ChevronLeft, Users } from 'lucide-react-native';
import React, { useCallback, useState } from 'react';
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
const DISMISS_THRESHOLD = 180;

export function ScannedEntries() {
  const [entries, setEntries] = useState<ScannedEntry[]>([]);
  const [scrollOffset, setScrollOffset] = useState(0);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const drawerOffset = useSharedValue(SCREEN_HEIGHT);
  const pullDistance = useSharedValue(0);
  const isPulling = useSharedValue(false);

  const loadEntries = useCallback(async () => {
    const scannedEntries = await storage.getAllScannedEntries();
    setEntries(scannedEntries);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadEntries();
      drawerOffset.value = withSpring(0, {
        damping: 28,
        stiffness: 300,
        mass: 0.7,
      });
    }, [drawerOffset, loadEntries])
  );

  const closeDrawer = useCallback(() => {
    drawerOffset.value = withSpring(
      SCREEN_HEIGHT,
      {
        damping: 30,
        stiffness: 300,
        mass: 0.7,
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(router.back)();
        }
      }
    );
  }, [drawerOffset, router]);

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

  const pullDownGesture = Gesture.Pan()
    .activeOffsetY(10)
    .failOffsetX([-30, 30])
    .onStart(() => {
      if (scrollOffset <= 0) {
        isPulling.value = true;
      }
    })
    .onChange((event) => {
      if (scrollOffset <= 0 && event.translationY > 0) {
        pullDistance.value = event.translationY;
        drawerOffset.value = event.translationY;
      } else {
        pullDistance.value = 0;
        isPulling.value = false;
      }
    })
    .onEnd((event) => {
      if (scrollOffset <= 0 && event.translationY > DISMISS_THRESHOLD) {
        drawerOffset.value = withSpring(
          SCREEN_HEIGHT,
          {
            damping: 30,
            stiffness: 300,
            mass: 0.7,
          },
          (finished) => {
            'worklet';
            if (finished) {
              runOnJS(router.back)();
            }
          }
        );
        pullDistance.value = withSpring(0, { damping: 25, stiffness: 200 });
      } else {
        drawerOffset.value = withSpring(0, {
          damping: 28,
          stiffness: 300,
          mass: 0.7,
        });
        pullDistance.value = withSpring(0, { damping: 20, stiffness: 180 });
      }
      isPulling.value = false;
    });

  const drawerStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      drawerOffset.value,
      [0, SCREEN_HEIGHT],
      [1, 0],
      Extrapolation.CLAMP
    );
    const scale = interpolate(
      drawerOffset.value,
      [0, SCREEN_HEIGHT],
      [1, 0.95],
      Extrapolation.CLAMP
    );
    return {
      transform: [{ translateY: drawerOffset.value }, { scale }],
      opacity,
    };
  });

  return (
    <Animated.View style={[styles.container, drawerStyle]}>
      <GestureDetector gesture={pullDownGesture}>
        <View style={[styles.sheet, { paddingTop: 20, paddingBottom: insets.bottom + 24 }]}>
          <View style={styles.header}>
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.backButton} onPress={closeDrawer} activeOpacity={0.85}>
                <ChevronLeft color={BlurbColors.text} size={18} />
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanButton} onPress={handleOpenScanner} activeOpacity={0.85}>
                <Camera color={BlurbColors.textSecondary} size={18} />
              </TouchableOpacity>
            </View>

            <View style={styles.headerCopy}>
              <Text style={styles.title}>Saved blurbs</Text>
              <Text style={styles.subtitle}>Scan a blurb and they&apos;ll appear here.</Text>
            </View>
          </View>

          <FlatList
            data={entries}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.link}-${item.scannedAt}`}
            onScroll={(event) => {
              setScrollOffset(event.nativeEvent.contentOffset.y);
            }}
            scrollEventThrottle={16}
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
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'transparent',
    borderTopLeftRadius: 34,
    borderTopRightRadius: 34,
    overflow: 'hidden',
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
    paddingTop: 5,
    paddingBottom: 18,
    gap: 16,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 30,
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
