import { Entry, storage } from '@/lib/storage';
import { normalizeUrl } from '@/lib/utils/url';
import { getQRLayout, QRSizing } from '@/lib/utils/qr-layout';
import { BlurbColors } from '@/theme/colors';
import { ThemedIcon } from '@/components/entry/themed-icon';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Brightness from 'expo-brightness';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const BRIGHTNESS_BACKUP_KEY = '@blurb:brightness_backup';

function getHostFromUrl(link?: string) {
  if (!link) return '';
  try {
    return new URL(link).hostname.replace(/^www\./, '');
  } catch {
    return link.replace(/^https?:\/\//, '').split('/')[0];
  }
}

function hexToRgba(hex: string, alpha: number) {
  const sanitized = hex.replace('#', '');
  const normalized = sanitized.length === 3 ? sanitized.split('').map((char) => char + char).join('') : sanitized;
  if (normalized.length !== 6) return `rgba(255, 255, 255, ${alpha})`;
  const intValue = parseInt(normalized, 16);
  const r = (intValue >> 16) & 255;
  const g = (intValue >> 8) & 255;
  const b = intValue & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function applyAlpha(color: string | undefined, alpha: number) {
  if (!color) return `rgba(255, 255, 255, ${alpha})`;
  if (color.startsWith('#')) return hexToRgba(color, alpha);
  return `rgba(255, 255, 255, ${alpha})`;
}

export function FullscreenQR() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [maxBrightness, setMaxBrightness] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);

  const screenOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.95);

  useEffect(() => {
    loadEntry();
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

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ scale: screenScale.value }],
  }));

  useEffect(() => {
    return () => {
      if (maxBrightness && originalBrightness !== null) {
        Brightness.setBrightnessAsync(originalBrightness);
      }
    };
  }, [maxBrightness, originalBrightness]);

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const layout = useMemo<QRSizing>(() => getQRLayout(Math.min(screenWidth, screenHeight)), [screenWidth, screenHeight]);

  const displayUrl = useMemo(() => getHostFromUrl(entry?.link), [entry?.link]);
  const accentColor = entry?.accentColor ?? '#1F1F1F';
  const gradientColors = useMemo(() => {
    const tint = (value: number) => applyAlpha(accentColor, value);
    return [tint(0.55), tint(0.35), tint(0.2), 'rgba(0, 0, 0, 0.96)'];
  }, [accentColor]);
  const urlColor = "#ffffff67";
  const qrBorderColor = useMemo(() => applyAlpha(accentColor, 0.5), [accentColor]);

  const {
    shellSize,
    shellPadding,
    qrSize,
    heroIconSize,
    heroBadgeSize,
    qrLogoSize,
    qrLogoContainerSize,
    outerPadding,
    outerRadius,
    shellRadius,
    innerRadius,
  } = layout;
  const qrLogoProps = entry?.iconUri && entry.iconType !== 'lucide' ? { uri: entry.iconUri } : undefined;
  const hasImageLogo = Boolean(qrLogoProps);
  const headerIconType = hasImageLogo ? 'image' : 'lucide';
  const headerIconUri = hasImageLogo ? entry?.iconUri ?? 'Link' : 'Link';

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
        const current = await Brightness.getBrightnessAsync();
        setOriginalBrightness(current);
        await AsyncStorage.setItem(BRIGHTNESS_BACKUP_KEY, current.toString());
        await Brightness.setBrightnessAsync(1.0);
        setMaxBrightness(true);
      } else {
        if (originalBrightness !== null) {
          await Brightness.setBrightnessAsync(originalBrightness);
        }
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
        console.log('Shared successfully');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error sharing:', message);
    }
  }, [entry]);

  const handleClose = useCallback(async () => {
    if (maxBrightness && originalBrightness !== null) {
      await Brightness.setBrightnessAsync(originalBrightness);
      await AsyncStorage.removeItem(BRIGHTNESS_BACKUP_KEY);
    }

    screenOpacity.value = withSpring(0, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    }, (finished) => {
      'worklet';
      if (finished) {
        runOnJS(router.back)();
      }
    });
  }, [router, maxBrightness, originalBrightness, screenOpacity, screenScale]);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading QR...</Text>
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

  const titleText = entry.title || 'Untitled';

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={styles.gradientBackground}
      >
        <TouchableWithoutFeedback onPress={handleToggleControls}>
          <View style={styles.innerContainer}>
            <StatusBar hidden={!showControls} barStyle="light-content" />
            {showControls && (
              <TouchableOpacity
                style={[styles.closeButton, { top: insets.top + 16 }]}
                onPress={handleClose}
              >
                <Text style={styles.controlButtonText}>Close</Text>
              </TouchableOpacity>
            )}
            <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 16 }]}> 
              {showControls && (
                <TouchableOpacity style={styles.controlButton} onPress={handleShare}>
                  <Text style={styles.controlButtonText}>Share</Text>
                </TouchableOpacity>
              )}
              {showControls && (
                <TouchableOpacity style={styles.controlButton} onPress={handleToggleBrightness}>
                  <Text style={styles.controlButtonText}>{maxBrightness ? 'Normal' : 'Max'} Brightness</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.content}>
              <View style={styles.titleSection}>
                <View style={[styles.iconBadge, { width: heroBadgeSize, height: heroBadgeSize }]}>
                  <View
                    style={[
                      styles.iconFrame,
                      {
                        width: heroBadgeSize - 18,
                        height: heroBadgeSize - 18,
                      },
                    ]}
                  >
                    <ThemedIcon uri={headerIconUri} iconType={headerIconType} size={heroIconSize} />
                  </View>
                </View>
                <Text style={styles.titleText} numberOfLines={2}>
                  {titleText}
                </Text>
                {displayUrl ? (
                  <Text style={[styles.urlText, { color: urlColor }]} numberOfLines={1}>
                    {displayUrl}
                  </Text>
                ) : null}
                {entry.subtitle ? (
                  <Text style={styles.subtitleText} numberOfLines={1}>
                    {entry.subtitle}
                  </Text>
                ) : null}
              </View>

              <View style={styles.qrWrapper}>
                <View
                  style={[
                    styles.qrContainer,
                    {
                      borderColor: qrBorderColor,
                      padding: Math.max(outerPadding, 18),
                      borderRadius: outerRadius,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.qrShell,
                      {
                        width: shellSize,
                        height: shellSize,
                        borderRadius: shellRadius,
                        padding: shellPadding,
                      },
                    ]}
                  >
                    <View style={[styles.qrShellInner, { borderRadius: innerRadius }]}>
                      <QRCode
                        value={entry.link}
                        size={qrSize}
                        color={BlurbColors.qrForeground}
                        backgroundColor={BlurbColors.qrBackground}
                        logo={undefined}
                      />
                      {qrLogoProps && (
                        <View
                          style={[
                            styles.qrLogoOverlay,
                            {
                              width: qrLogoContainerSize,
                              height: qrLogoContainerSize,
                              marginLeft: -qrLogoContainerSize / 2,
                              marginTop: -qrLogoContainerSize / 2,
                            },
                          ]}
                        >
                          <View style={[styles.qrLogoBackground, { width: qrLogoSize + 12, height: qrLogoSize + 12 }]}>
                            <ThemedIcon uri={headerIconUri} iconType={headerIconType} size={qrLogoSize} iconSize={qrLogoSize * 0.8} />
                          </View>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
  },
  gradientBackground: {
    flex: 1,
    justifyContent: 'center',
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  bottomControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  closeButton: {
    position: 'absolute',
    left: 16,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999, 
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    zIndex: 15,
  },
  controlButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
  },
  controlButtonText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.4,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  titleSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconBadge: {
    width: 96,
    height: 96,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 28,
    elevation: 16,
  },
  iconFrame: {
    width: 82,
    height: 82,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    backgroundColor: '#FFFFFF',
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -0.3,
    color: BlurbColors.text,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  urlText: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 20,
    letterSpacing: 0.4,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  subtitleText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 20,
    color: BlurbColors.textSecondary,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  qrWrapper: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    paddingVertical: 16,
  },
  qrContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 16,
    borderRadius: 38,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.45,
    shadowRadius: 28,
    elevation: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrShell: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 14,
  },
  qrShellInner: {
    width: '100%',
    height: '100%',
    padding: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  qrLogoOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
    transform: "translate(12.5%, 12.5%)"
  },
  qrLogoFrame: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  qrLogoBackground: {
    backgroundColor: '#FFFFFF',
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
    borderRadius: 10,
    backgroundColor: BlurbColors.backgroundElevated,
  },
});
