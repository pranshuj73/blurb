import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import * as Brightness from 'expo-brightness';
import { Entry, storage } from '@/lib/storage';
import { QR_CONFIG } from '@/lib/qr';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
        await Brightness.setBrightnessAsync(1.0);
        setMaxBrightness(true);
      } else {
        // Restore original brightness
        if (originalBrightness !== null) {
          await Brightness.setBrightnessAsync(originalBrightness);
        }
        setMaxBrightness(false);
        setOriginalBrightness(null);
      }
    } catch (error) {
      console.error('Error toggling brightness:', error);
    }
  }, [maxBrightness, originalBrightness]);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    // For now, just show an alert
    if (entry) {
      // Share the QR code or link
      console.log('Share:', entry.link);
    }
  }, [entry]);

  const handleClose = useCallback(() => {
    // Animate out
    screenOpacity.value = withSpring(0, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    
    if (maxBrightness && originalBrightness !== null) {
      Brightness.setBrightnessAsync(originalBrightness);
    }
    
    setTimeout(() => {
      router.back();
    }, 200);
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

  const qrSize = QR_CONFIG.getFullscreenSize();

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <TouchableWithoutFeedback onPress={handleToggleControls}>
        <View style={styles.innerContainer}>
          <StatusBar hidden={!showControls} />
        
        {showControls && (
          <View style={[styles.controls, { paddingTop: insets.top + 16 }]}>
            <TouchableOpacity style={styles.controlButton} onPress={handleClose}>
              <Text style={styles.controlButtonText}>Close</Text>
            </TouchableOpacity>
            
            <View style={styles.controlButtons}>
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
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
            {entry.iconUri && (
              <Image
                source={{ uri: entry.iconUri }}
                style={styles.icon}
                contentFit="cover"
              />
            )}
            <View style={styles.titleSection}>
              <Text style={styles.title}>{entry.title}</Text>
              {entry.subtitle && (
                <Text style={styles.subtitle}>{entry.subtitle}</Text>
              )}
            </View>
          </View>

          <View style={styles.qrSpacer} />

          <View style={styles.qrWrapper}>
            <View style={styles.qrContainer}>
              <QRCode
                value={entry.link}
                size={qrSize}
                color={BlurbColors.qrForeground}
                backgroundColor={BlurbColors.qrBackground}
                errorCorrectionLevel={QR_CONFIG.errorCorrectionLevel}
                logo={entry.iconUri ? { uri: entry.iconUri } : undefined}
                logoSize={qrSize * 0.15}
                logoBackgroundColor={BlurbColors.qrBackground}
                logoMargin={4}
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
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: BlurbColors.background,
    zIndex: 10,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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
    alignItems: 'flex-start',
    marginBottom: 48,
    width: '100%',
    paddingHorizontal: 32,
  },
  qrSpacer: {
    height: 48,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    marginRight: 16,
  },
  titleSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    lineHeight: 44,
    letterSpacing: -1.2,
    color: BlurbColors.text,
    textAlign: 'left',
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  subtitle: {
    fontSize: 19,
    fontWeight: '400',
    lineHeight: 26,
    letterSpacing: -0.4,
    color: BlurbColors.textSecondary,
    textAlign: 'left',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
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
