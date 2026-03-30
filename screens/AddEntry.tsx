import { IconPicker } from '@/components/icon-picker';
import { ThemedIcon } from '@/components/entry/themed-icon';
import { scrapeMetadata } from '@/lib/scraping';
import { Entry, storage } from '@/lib/storage';
import { isSuspiciousUrl, isValidUrl } from '@/lib/utils/url';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { getAccentColorFromFavicon } from '@/lib/utils/favicon-color';
import { cacheFavicon } from '@/lib/utils/favicon-cache';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
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
const DISMISS_THRESHOLD = 180;

// Input validation constants
const MAX_TITLE_LENGTH = 100;
const MAX_SUBTITLE_LENGTH = 150;
const MAX_URL_LENGTH = 2048; // Standard max URL length

function getDomainSeed(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    return url.hostname.replace(/^www\./, '');
  } catch {
    return rawUrl;
  }
}

export function AddEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;
  const insets = useSafeAreaInsets();
  
  // Drawer animation - start off-screen
  const drawerOffset = useSharedValue(SCREEN_HEIGHT);
  const pullDistance = useSharedValue(0);
  const isPulling = useSharedValue(false);
  const [scrollOffset, setScrollOffset] = useState(0);

  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [iconUri, setIconUri] = useState<string | undefined>();
  const [iconType, setIconType] = useState<'image' | 'lucide'>('image');
  const [accentColor, setAccentColor] = useState<string | undefined>();
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(0);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const SYNC_COOLDOWN_MS = 2000; // 2 seconds between sync requests

  useEffect(() => {
    if (isEditing && params.id) {
      loadEntry(params.id);
    }
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [isEditing, params.id]);

  const loadEntry = async (id: string) => {
    try {
      const entry = await storage.getEntry(id);
      if (entry) {
        setLink(entry.link);
        setTitle(entry.title);
        setSubtitle(entry.subtitle || '');
        setIconUri(entry.iconUri);
        setIconType(entry.iconType || 'image');
        setAccentColor(entry.accentColor);
      }
    } catch (error) {
      console.error('Error loading entry:', error);
    }
  };

  const handleSyncMetadata = useCallback(async () => {
    if (!link.trim()) {
      return;
    }

    // Rate limiting: Check if cooldown period has passed
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncTime;
    if (timeSinceLastSync < SYNC_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((SYNC_COOLDOWN_MS - timeSinceLastSync) / 1000);
      Alert.alert('Please Wait', `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before syncing again.`);
      return;
    }

    setLastSyncTime(now);
    setIsScraping(true);

    syncTimeoutRef.current = setTimeout(() => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      setIsScraping(false);
      Alert.alert('Sync Failed', 'Failed to fetch link contents. Please try again.');
    }, 5000);

    try {
      const metadata = await scrapeMetadata(link.trim());

      if (metadata.title) {
        setTitle(metadata.title);
      }
      if (metadata.subtitle) {
        setSubtitle(metadata.subtitle);
      }
      if (metadata.iconUrl) {
        const cachedIcon = await cacheFavicon(metadata.iconUrl);
        setIconUri(cachedIcon);
        setIconType('image'); // Favicon is an image
      }
      if (metadata.accentColor) {
        setAccentColor(metadata.accentColor);
      }
    } catch (error) {
      console.error('Error scraping metadata:', error);
      Alert.alert('Sync Failed', 'Failed to fetch link contents. Please try again.');
    } finally {
      // Always clear timeout and reset state
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      setIsScraping(false);
    }
  }, [link, lastSyncTime]);

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIconUri(result.assets[0].uri);
        setIconType('image');
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSelectLucideIcon = (iconName: string) => {
    setIconUri(iconName);
    setIconType('lucide');
  };

  const handlePreview = useCallback(() => {
    if (!link.trim() || !title.trim()) {
      return;
    }

    // Validate URL format
    if (!isValidUrl(link.trim())) {
      Alert.alert(
        'Invalid URL',
        'Please enter a valid URL. Make sure it includes a domain name (e.g., example.com or https://example.com)',
        [{ text: 'OK' }]
      );
      return;
    }

    // Security check for suspicious URLs
    if (isSuspiciousUrl(link.trim())) {
      Alert.alert(
        'Suspicious URL Detected',
        'This URL uses a potentially dangerous protocol (javascript:, data:, file:, vbscript:). Creating a QR code for this URL may pose security risks.\n\nAre you sure you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Continue Anyway',
            style: 'destructive',
            onPress: () => proceedWithPreview(),
          },
        ]
      );
      return;
    }

    proceedWithPreview();
  }, [link, title, subtitle, iconUri, iconType, params.id, isEditing, drawerOffset, router]);

  const proceedWithPreview = useCallback(async () => {
    const resolvedIconUri =
      iconUri && iconUri.startsWith('http') ? await cacheFavicon(iconUri) : iconUri;
    const entry: Entry = {
      id: params.id || Crypto.randomUUID(),
      link: link.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      iconUri: resolvedIconUri,
      iconType,
      accentColor,
      createdAt: params.id ? Date.now() : Date.now(), // Will be set properly on save
      updatedAt: Date.now(),
    };

    // Animate out before navigation
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
          runOnJS(router.push)({
            pathname: '/preview',
            params: {
              entry: JSON.stringify(entry),
              isNew: isEditing ? 'false' : 'true',
            },
          });
        }
      }
    );
  }, [link, title, subtitle, iconUri, iconType, params.id, isEditing, drawerOffset, router]);

  const canPreview = link.trim().length > 0 && title.trim().length > 0;
  const canSave = link.trim().length > 0 && title.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || !params.id) {
      return;
    }

    // Validate URL format
    if (!isValidUrl(link.trim())) {
      Alert.alert(
        'Invalid URL',
        'Please enter a valid URL. Make sure it includes a domain name (e.g., example.com or https://example.com)',
        [{ text: 'OK' }]
      );
      return;
    }

    // Security check for suspicious URLs
    if (isSuspiciousUrl(link.trim())) {
      Alert.alert(
        'Suspicious URL Detected',
        'This URL uses a potentially dangerous protocol (javascript:, data:, file:, vbscript:). Saving this entry may pose security risks.\n\nAre you sure you want to continue?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Save Anyway',
            style: 'destructive',
            onPress: () => proceedWithSave(),
          },
        ]
      );
      return;
    }

    proceedWithSave();
  }, [canSave, params.id, link, title, subtitle, iconUri, iconType, router, drawerOffset]);

  const proceedWithSave = useCallback(async () => {
    if (!params.id) return;

    setIsSaving(true);

    try {
      const existingEntry = await storage.getEntry(params.id);
      if (!existingEntry) {
        Alert.alert('Error', 'Entry not found');
        return;
      }

      const resolvedAccent =
        iconType === 'image'
          ? await getAccentColorFromFavicon(iconUri, getDomainSeed(link.trim()))
          : await getAccentColorFromFavicon(undefined, getDomainSeed(link.trim()));

      let resolvedIconUri = iconUri;
      if (iconType === 'image' && iconUri && iconUri.startsWith('http')) {
        resolvedIconUri = await cacheFavicon(iconUri);
      }

      const updatedEntry: Entry = {
        ...existingEntry,
        link: link.trim(),
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        iconUri: resolvedIconUri,
        iconType,
        accentColor: resolvedAccent || accentColor,
        updatedAt: Date.now(),
      };

      await storage.saveEntry(updatedEntry);

      // Animate out
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
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save entry. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [params.id, link, title, subtitle, iconUri, iconType, router, drawerOffset]);

  const handleDelete = useCallback(async () => {
    if (!params.id) {
      return;
    }

    Alert.alert(
      'Delete Entry',
      `Are you sure you want to delete "${title || 'this entry'}"? This action cannot be undone.`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await storage.deleteEntry(params.id!);

              // Animate out
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
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry. Please try again.');
            }
          },
        },
      ]
    );
  }, [params.id, title, router, drawerOffset]);

  const handleDismiss = useCallback(() => {
    // Animate out
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
  }, [router, drawerOffset]);

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
        const distance = Math.min(event.translationY, DISMISS_THRESHOLD * 1.5);
        pullDistance.value = distance;
        drawerOffset.value = distance;
      } else {
        pullDistance.value = 0;
        isPulling.value = false;
      }
    })
    .onEnd((event) => {
      if (scrollOffset <= 0 && event.translationY > DISMISS_THRESHOLD) {
        // Threshold crossed - dismiss drawer smoothly
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
        // Below threshold - spring back elegantly
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
      transform: [
        { translateY: drawerOffset.value },
        { scale },
      ],
      opacity,
    };
  });

  const indicatorOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      pullDistance.value,
      [0, 30, DISMISS_THRESHOLD],
      [0, 0.3, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  const indicatorTranslateY = useAnimatedStyle(() => {
    const translateY = interpolate(
      pullDistance.value,
      [0, DISMISS_THRESHOLD],
      [-60, 40],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY }] };
  });

  const textOpacity = useAnimatedStyle(() => {
    const opacity = interpolate(
      pullDistance.value,
      [60, DISMISS_THRESHOLD],
      [0, 1],
      Extrapolation.CLAMP
    );
    return { opacity };
  });

  // Animate in on mount with smooth spring
  useEffect(() => {
    drawerOffset.value = withSpring(0, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
  }, [drawerOffset]);

  return (
    <Animated.View style={[styles.drawerContainer, drawerStyle]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <Animated.View style={[styles.pullIndicator, { paddingTop: insets.top + 8 }, indicatorOpacity, indicatorTranslateY]} pointerEvents="none">
        <View style={styles.indicatorLine} />
        <Animated.View style={[styles.indicatorText, textOpacity]}>
          <Text style={styles.indicatorTextContent}>D I S M I S S</Text>
        </Animated.View>
      </Animated.View>
      <GestureDetector gesture={pullDownGesture}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onScroll={(event) => {
            setScrollOffset(event.nativeEvent.contentOffset.y);
          }}
          scrollEventThrottle={16}
        >
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backButtonText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Entry' : 'New Entry'}
          </Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>URL</Text>
            <View style={styles.urlInputContainer}>
              <TextInput
                style={[
                  styles.input,
                  styles.urlInput,
                  isScraping && styles.inputDisabled,
                ]}
                value={link}
                onChangeText={(text) => setLink(text.slice(0, MAX_URL_LENGTH))}
                placeholder="https://..."
                placeholderTextColor={BlurbColors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isScraping}
                maxLength={MAX_URL_LENGTH}
              />
              <TouchableOpacity
                style={[styles.syncButton, isScraping && styles.syncButtonDisabled]}
                onPress={handleSyncMetadata}
                disabled={!link.trim() || isScraping}
              >
                {isScraping ? (
                  <ActivityIndicator size="small" color={BlurbColors.text} />
                ) : (
                  <Text style={styles.syncButtonText}>↻</Text>
                )}
              </TouchableOpacity>
            </View>
            {isScraping && (
              <View style={styles.scrapingIndicator}>
                <Text style={styles.scrapingText}>Fetching metadata...</Text>
              </View>
            )}
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Title</Text>
              <Text style={styles.charCount}>{title.length}/{MAX_TITLE_LENGTH}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={(text) => setTitle(text.slice(0, MAX_TITLE_LENGTH))}
              placeholder="Entry title"
              placeholderTextColor={BlurbColors.textTertiary}
              autoCapitalize="words"
              maxLength={MAX_TITLE_LENGTH}
            />
          </View>

          <View style={styles.field}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Subtitle (optional)</Text>
              <Text style={styles.charCount}>{subtitle.length}/{MAX_SUBTITLE_LENGTH}</Text>
            </View>
            <TextInput
              style={styles.input}
              value={subtitle}
              onChangeText={(text) => setSubtitle(text.slice(0, MAX_SUBTITLE_LENGTH))}
              placeholder="Subtitle or handle"
              placeholderTextColor={BlurbColors.textTertiary}
              autoCapitalize="none"
              maxLength={MAX_SUBTITLE_LENGTH}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconSection}>
              {iconUri && (
                <ThemedIcon uri={iconUri} iconType={iconType} size={64} />
              )}
              {!iconUri && (
                <ThemedIcon uri="Link" iconType="lucide" size={64} />
              )}
              <View style={styles.iconButtonsColumn}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handlePickImage}
                >
                  <Text style={styles.iconButtonText}>
                    {iconUri ? 'Upload' : 'Upload'} Image
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowIconPicker(true)}
                >
                  <Text style={styles.iconButtonText}>
                    Pick Icon
                  </Text>
                </TouchableOpacity>
                {iconUri && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => {
                      setIconUri(undefined);
                      setIconType('image');
                    }}
                  >
                    <Text style={[styles.iconButtonText, styles.removeButtonText]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </View>

        {isEditing ? (
          <>
            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave || isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color={BlurbColors.background} />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
              disabled={isSaving}
            >
              <Text style={styles.deleteButtonText}>Delete Entry</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={[styles.previewButton, !canPreview && styles.previewButtonDisabled]}
            onPress={handlePreview}
            disabled={!canPreview || isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color={BlurbColors.background} />
            ) : (
              <Text style={styles.previewButtonText}>Preview</Text>
            )}
          </TouchableOpacity>
        )}
        </ScrollView>
      </GestureDetector>
    </KeyboardAvoidingView>
    <IconPicker
      visible={showIconPicker}
      onClose={() => setShowIconPicker(false)}
      onSelectIcon={handleSelectLucideIcon}
    />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: BlurbColors.backgroundElevated,
  },
  container: {
    flex: 1,
    backgroundColor: BlurbColors.backgroundElevated,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BlurbColors.border,
  },
  backButton: {
    minWidth: 60,
  },
  backButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
  },
  headerTitle: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
  },
  form: {
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
  },
  charCount: {
    ...BlurbTypography.small,
    color: BlurbColors.textTertiary,
    fontSize: 12,
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.text,
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  urlInput: {
    flex: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: BlurbColors.backgroundElevated,
    borderWidth: 1,
    borderColor: BlurbColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.5,
  },
  syncButtonText: {
    fontSize: 20,
    color: BlurbColors.text,
    fontWeight: '600',
  },
  scrapingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  scrapingText: {
    ...BlurbTypography.small,
    color: BlurbColors.textSecondary,
  },
  iconSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  iconButtonsColumn: {
    flex: 1,
    gap: 8,
  },
  iconPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  iconPlaceholderText: {
    ...BlurbTypography.small,
    color: BlurbColors.textTertiary,
  },
  iconButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  iconButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
  },
  removeButtonText: {
    color: BlurbColors.textSecondary,
  },
  previewButton: {
    backgroundColor: BlurbColors.text,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewButtonDisabled: {
    opacity: 0.5,
  },
  previewButtonText: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.background,
  },
  saveButton: {
    backgroundColor: BlurbColors.text,
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.background,
  },
  deleteButton: {
    backgroundColor: 'transparent',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  deleteButtonText: {
    ...BlurbTypography.entryTitle,
    color: '#FF3B30',
  },
  pullIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  indicatorLine: {
    width: 40,
    height: 3,
    backgroundColor: BlurbColors.textTertiary,
    borderRadius: 2,
    marginBottom: 12,
  },
  indicatorText: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorTextContent: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 2,
    color: BlurbColors.textTertiary,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
});
