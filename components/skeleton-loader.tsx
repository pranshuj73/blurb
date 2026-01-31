import { BlurbColors } from '@/theme/colors';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

interface SkeletonProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 4, style }: SkeletonProps) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.7, { duration: 800 }),
        withTiming(0.3, { duration: 800 })
      ),
      -1,
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.skeleton,
        { width, height, borderRadius },
        animatedStyle,
        style,
      ]}
    />
  );
}

export function EntryRowSkeleton() {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Skeleton width={56} height={56} borderRadius={28} style={styles.icon} />
        <View style={styles.textContainer}>
          <Skeleton width="70%" height={20} borderRadius={4} style={styles.title} />
          <Skeleton width="50%" height={16} borderRadius={4} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: BlurbColors.border,
  },
  container: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: BlurbColors.background,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 20,
    padding: 20,
    minHeight: 88,
  },
  icon: {
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 8,
  },
});
