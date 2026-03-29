import { Heading } from '@/components/ui/heading';
import { Subheading } from '@/components/ui/subheading';
import { Entry, storage } from '@/lib/storage';
import { normalizeUrl } from '@/lib/utils/url';
import { BlurbColors } from '@/theme/colors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Brightness from 'expo-brightness';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Platform,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BRIGHTNESS_BACKUP_KEY = '@blurb:brightness_backup';

export function FullscreenQR() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [maxBrightness, setMaxBrightness] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);
  
  // Animation for smooth fade in/out
  const screenOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.95);

  useEffect(() => {
    loadEntry();
    // Animate in
    screenOpacity.value = withSpring(1, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(1, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
  }, [params.id]);

  const screenStyle = useAnimatedStyle(() => {
    return {
      opacity: screenOpacity.value,
      transform: [{ scale: screenScale.value }],
    };
  });

  useEffect(() => {
    // Restore brightness when leaving screen
    return () => {
      if (maxBrightness && originalBrightness !== null) {
        Brightness.setBrightnessAsync(originalBrightness);
      }
    };
  }, [maxBrightness, originalBrightness]);

  const loadEntry = async () => {
    if (params.id) {
      const loaded = await storage.getEntry(params.id);
      setEntry(loaded);
    }
  };

  const handleToggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const handleToggleBrightness = useCallback(async () => {
    try {
      if (!maxBrightness) {
        // Save current brightness and set to max
        const current = await Brightness.getBrightnessAsync();
        setOriginalBrightness(current);
        // Backup to AsyncStorage in case of crash
        await AsyncStorage.setItem(BRIGHTNESS_BACKUP_KEY, current.toString());
        await Brightness.setBrightnessAsync(1.0);
        setMaxBrightness(true);
      } else {
        // Restore original brightness
        if (originalBrightness !== null) {
          await Brightness.setBrightnessAsync(originalBrightness);
        }
        // Clear backup
        await AsyncStorage.removeItem(BRIGHTNESS_BACKUP_KEY);
        setMaxBrightness(false);
        setOriginalBrightness(null);
      }
    } catch (error) {
      console.error('Error toggling brightness:', error);
    }
  }, [maxBrightness, originalBrightness]);

  const handleShare = useCallback(async () => {
    if (!entry?.link) return;

    const normalizedLink = normalizeUrl(entry.link);

    try {
      const result = await Share.share({
        message: normalizedLink,
        url: normalizedLink,
      });
      
      if (result.action === Share.sharedAction) {
        // User shared successfully
        console.log('Shared successfully');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sharing:', message);
    }
  }, [entry]);

  const handleClose = useCallback(async () => {
    // Restore brightness before closing
    if (maxBrightness && originalBrightness !== null) {
      await Brightness.setBrightnessAsync(originalBrightness);
      // Clear backup
      await AsyncStorage.removeItem(BRIGHTNESS_BACKUP_KEY);
    }

    // Animate out
    screenOpacity.value = withSpring(
      0,
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
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
  }, [router, maxBrightness, originalBrightness, screenOpacity, screenScale]);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
        <TouchableOpacity style={styles.backButtonFallback} onPress={() => router.back()}>
          <Text style={styles.controlButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!entry.link) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Invalid entry</Text>
        <TouchableOpacity style={styles.backButtonFallback} onPress={() => router.back()}>
          <Text style={styles.controlButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Calculate QR size to match header content width
  const screenWidth = Dimensions.get('window').width;
  const headerPadding = 32 * 2; // left + right padding (matches header)
  const qrContainerPadding = 40 * 2; // left + right padding inside qrContainer
  const qrSize = screenWidth - headerPadding - qrContainerPadding;

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <TouchableWithoutFeedback onPress={handleToggleControls}>
        <View style={styles.innerContainer}>
          <StatusBar hidden={!showControls} />
        
        {showControls && (
          <>
            <View style={[styles.topControls, { paddingTop: insets.top + 16 }]}>
              <TouchableOpacity style={styles.controlButton} onPress={handleClose}>
                <Text style={styles.controlButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            
            <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleShare}
              >
                <Text style={styles.controlButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleToggleBrightness}
              >
                <Text style={styles.controlButtonText}>
                  {maxBrightness ? 'Normal' : 'Max'} Brightness
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.titleSection}>
              <Heading size="2xl" weight="600" style={styles.headingText}>{entry.title}</Heading>
              {entry.subtitle && (
                <Subheading size="md" weight="600">{entry.subtitle}</Subheading>
              )}
            </View>
          </View>

          <View style={styles.qrWrapper}>
            <View style={styles.qrContainer}>
              <QRCode
                value={entry.link}
                size={qrSize}
                color={BlurbColors.qrForeground}
                backgroundColor={BlurbColors.qrBackground}
              />
            </View>
          </View>
        </View>
        </View>
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  topControls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: BlurbColors.background,
    zIndex: 10,
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: BlurbColors.background,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 22,
    letterSpacing: -0.2,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  titleSection: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 6,
  },
  headingText: {
    lineHeight: 40,
    letterSpacing: 4,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    width: '100%',
  },
  qrContainer: {
    backgroundColor: BlurbColors.qrBackground,
    padding: 40,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: BlurbColors.textSecondary,
    marginBottom: 16,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  backButtonFallback: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 8,
  },
});
