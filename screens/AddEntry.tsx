import { IconPicker } from '@/components/icon-picker';
import { useAppAlert } from '@/components/ui/app-alert-provider';
import { BlurbFormField, BlurbFormFields } from '@/components/ui/blurb-form-fields';
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
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ChevronLeft, Image as ImageIcon, RefreshCw, Shapes } from 'lucide-react-native';
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
  const { showAlert } = useAppAlert();
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
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
      await showAlert({
        title: 'Please wait',
        message: `Please wait ${remainingSeconds} second${remainingSeconds > 1 ? 's' : ''} before syncing again.`,
      });
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
      void showAlert({
        title: 'Sync failed',
        message: 'Failed to fetch link contents. Please try again.',
      });
    }, 5000);

    try {
      const metadata = await scrapeMetadata(link.trim());

      if (metadata.title) {
        const currentTitle = title.trim();
        const metadataTitle = metadata.title.trim();

        if (currentTitle.length === 0 || currentTitle === metadataTitle) {
          setTitle(metadataTitle);
        }
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
      await showAlert({
        title: 'Sync failed',
        message: 'Failed to fetch link contents. Please try again.',
      });
    } finally {
      // Always clear timeout and reset state
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
        syncTimeoutRef.current = null;
      }
      setIsScraping(false);
    }
  }, [link, lastSyncTime, title]);

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
      void showAlert({
        title: 'Invalid URL',
        message: 'Please enter a valid URL. Make sure it includes a domain name (e.g., example.com or https://example.com)',
      });
      return;
    }

    // Security check for suspicious URLs
    if (isSuspiciousUrl(link.trim())) {
      void showAlert({
        title: 'Suspicious URL detected',
        message:
          'This URL uses a potentially dangerous protocol (javascript:, data:, file:, vbscript:). Creating a QR code for this URL may pose security risks.',
        actions: [
          { label: 'Cancel', style: 'cancel', value: 'cancel' },
          { label: 'Continue anyway', style: 'destructive', value: 'continue' },
        ],
      }).then((result) => {
        if (result === 'continue') {
          proceedWithPreview();
        }
      });
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
      void showAlert({
        title: 'Invalid URL',
        message: 'Please enter a valid URL. Make sure it includes a domain name (e.g., example.com or https://example.com)',
      });
      return;
    }

    // Security check for suspicious URLs
    if (isSuspiciousUrl(link.trim())) {
      void showAlert({
        title: 'Suspicious URL detected',
        message:
          'This URL uses a potentially dangerous protocol (javascript:, data:, file:, vbscript:). Saving this entry may pose security risks.',
        actions: [
          { label: 'Cancel', style: 'cancel', value: 'cancel' },
          { label: 'Save anyway', style: 'destructive', value: 'save' },
        ],
      }).then((result) => {
        if (result === 'save') {
          proceedWithSave();
        }
      });
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
        await showAlert({
          title: 'Error',
          message: 'Entry not found',
        });
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
      await showAlert({
        title: 'Error',
        message: 'Failed to save entry. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  }, [params.id, link, title, subtitle, iconUri, iconType, router, drawerOffset]);

  const handleDelete = useCallback(async () => {
    if (!params.id) {
      return;
    }

    void showAlert({
      title: 'Delete entry',
      message: `Are you sure you want to delete "${title || 'this entry'}"? This action cannot be undone.`,
      actions: [
        { label: 'Cancel', style: 'cancel', value: 'cancel' },
        { label: 'Delete', style: 'destructive', value: 'delete' },
      ],
    }).then(async (result) => {
      if (result !== 'delete') return;
      try {
        await storage.deleteEntry(params.id!);
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
        await showAlert({
          title: 'Error',
          message: 'Failed to delete entry. Please try again.',
        });
      }
    });
  }, [params.id, title, router, drawerOffset, showAlert]);

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

  // Animate in on mount with smooth spring
  useEffect(() => {
    drawerOffset.value = withSpring(0, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
  }, [drawerOffset]);

  const addEntryFields: BlurbFormField[] = [
    {
      key: 'url',
      label: 'URL',
      value: link,
      onChange: setLink,
      placeholder: 'https://...',
      maxLength: MAX_URL_LENGTH,
      keyboardType: 'url',
      autoCapitalize: 'none',
      autoCorrect: false,
      editable: !isScraping,
      trailing: (
        <TouchableOpacity
          style={[styles.trailingButton, (!link.trim() || isScraping) && styles.trailingButtonDisabled]}
          onPress={handleSyncMetadata}
          disabled={!link.trim() || isScraping}
          activeOpacity={0.88}
        >
          {isScraping ? (
            <ActivityIndicator size="small" color={BlurbColors.text} />
          ) : (
            <RefreshCw color={BlurbColors.text} size={15} />
          )}
        </TouchableOpacity>
      ),
      footer: isScraping ? (
        <View style={styles.scrapingIndicator}>
          <Text style={styles.scrapingText}>Fetching metadata...</Text>
        </View>
      ) : null,
    },
    {
      key: 'title',
      label: 'Title',
      headerRight: (
        <Text style={styles.counterText}>
          {title.length}/{MAX_TITLE_LENGTH}
        </Text>
      ),
      value: title,
      onChange: setTitle,
      placeholder: 'Entry title',
      maxLength: MAX_TITLE_LENGTH,
      autoCapitalize: 'words',
      autoCorrect: false,
    },
    {
      key: 'subtitle',
      label: 'Subtitle (optional)',
      headerRight: (
        <Text style={styles.counterText}>
          {subtitle.length}/{MAX_SUBTITLE_LENGTH}
        </Text>
      ),
      value: subtitle,
      onChange: setSubtitle,
      placeholder: 'Subtitle or handle',
      maxLength: MAX_SUBTITLE_LENGTH,
      autoCapitalize: 'none',
      autoCorrect: false,
    },
  ];

  return (
    <Animated.View style={[styles.drawerContainer, drawerStyle]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
            <ChevronLeft color={BlurbColors.text} size={18} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit blurb' : 'New blurb'}
          </Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <View style={styles.iconSection}>
              <TouchableOpacity
                style={styles.iconPreviewButton}
                onPress={() => setShowIconPicker(true)}
                activeOpacity={0.88}
              >
                {iconUri ? (
                  <ThemedIcon uri={iconUri} iconType={iconType} size={40} />
                ) : (
                  <ThemedIcon uri="Link" iconType="lucide" size={40} iconSize={20} />
                )}
              </TouchableOpacity>
              <View style={styles.iconActionsRow}>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setShowIconPicker(true)}
                >
                  <Shapes color={BlurbColors.text} size={15} />
                  <Text style={styles.iconButtonText}>
                    Select icon
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={handlePickImage}
                >
                  <ImageIcon color={BlurbColors.text} size={15} />
                  <Text style={styles.iconButtonText}>
                    Upload image
                  </Text>
                </TouchableOpacity>
              </View>
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

          <BlurbFormFields
            showIcon={false}
            fields={addEntryFields}
            containerStyle={styles.formCard}
          />
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
      topActionLabel="Upload image"
      onPressTopAction={handlePickImage}
    />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  drawerContainer: {
    flex: 1,
    backgroundColor: BlurbColors.backgroundElevated,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
  },
  container: {
    flex: 1,
    backgroundColor: '#0C0C0E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
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
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backButton: {
    minWidth: 76,
    height: 42,
    borderRadius: 21,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  backButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: BlurbColors.text,
    fontFamily: 'Manrope',
  },
  headerPlaceholder: {
    width: 76,
    height: 42,
  },
  form: {
    padding: 18,
    gap: 16,
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    gap: 18,
  },
  field: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    ...BlurbTypography.small,
    color: 'rgba(255,255,255,0.54)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  counterText: {
    ...BlurbTypography.small,
    color: BlurbColors.textTertiary,
    fontSize: 12,
  },
  urlInputContainer: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.text,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  urlInput: {
    paddingRight: 56,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  syncButton: {
    position: 'absolute',
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncButtonDisabled: {
    opacity: 0.5,
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
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
  },
  iconPreviewButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 10,
    flex: 1,
    flexWrap: 'wrap',
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
    minHeight: 36,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    justifyContent: 'center',
  },
  iconButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
    fontWeight: '500',
  },
  removeButtonText: {
    color: '#FF8B8B',
  },
  previewButton: {
    backgroundColor: '#F4F4F1',
    marginHorizontal: 18,
    marginTop: 12,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewButtonDisabled: {
    opacity: 0.5,
  },
  trailingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  trailingButtonDisabled: {
    opacity: 0.7,
  },
  previewButtonText: {
    ...BlurbTypography.entryTitle,
    color: '#0C0C0E',
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: '#F4F4F1',
    marginHorizontal: 18,
    marginTop: 12,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    ...BlurbTypography.entryTitle,
    color: '#0C0C0E',
    fontWeight: '700',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    marginHorizontal: 18,
    marginTop: 10,
    minHeight: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  deleteButtonText: {
    ...BlurbTypography.entryTitle,
    color: '#FF3B30',
  },
});
