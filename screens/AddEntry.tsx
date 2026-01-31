import { ThemedIcon } from '@/components/entry/themed-icon';
import { scrapeMetadata } from '@/lib/scraping';
import { Entry, storage } from '@/lib/storage';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
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
  const [isScraping, setIsScraping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
      }
    } catch (error) {
      console.error('Error loading entry:', error);
    }
  };

  const handleSyncMetadata = useCallback(async () => {
    if (!link.trim()) {
      return;
    }

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
        setIconUri(metadata.iconUrl);
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
  }, [link]);

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
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handlePreview = useCallback(() => {
    if (!link.trim() || !title.trim()) {
      return;
    }

    const entry: Entry = {
      id: params.id || Crypto.randomUUID(),
      link: link.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      iconUri,
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
  }, [link, title, subtitle, iconUri, params.id, isEditing, drawerOffset, router]);

  const canPreview = link.trim().length > 0 && title.trim().length > 0;
  const canSave = link.trim().length > 0 && title.trim().length > 0;

  const handleSave = useCallback(async () => {
    if (!canSave || !params.id) {
      return;
    }

    setIsSaving(true);

    try {
      const existingEntry = await storage.getEntry(params.id);
      if (!existingEntry) {
        Alert.alert('Error', 'Entry not found');
        return;
      }

      const updatedEntry: Entry = {
        ...existingEntry,
        link: link.trim(),
        title: title.trim(),
        subtitle: subtitle.trim() || undefined,
        iconUri,
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
  }, [canSave, params.id, link, title, subtitle, iconUri, router, drawerOffset]);

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
                onChangeText={setLink}
                placeholder="https://..."
                placeholderTextColor={BlurbColors.textTertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isScraping}
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
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Entry title"
              placeholderTextColor={BlurbColors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Subtitle (optional)</Text>
            <TextInput
              style={styles.input}
              value={subtitle}
              onChangeText={setSubtitle}
              placeholder="Subtitle or handle"
              placeholderTextColor={BlurbColors.textTertiary}
              autoCapitalize="none"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Icon</Text>
            <View style={styles.iconSection}>
              {iconUri && (
                <ThemedIcon uri={iconUri} size={64} />
              )}
              {!iconUri && (
                <View style={[styles.iconPlaceholder, { width: 64, height: 64, borderRadius: 8 }]}>
                  <Text style={styles.iconPlaceholderText}>No icon</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.iconButton}
                onPress={handlePickImage}
              >
                <Text style={styles.iconButtonText}>
                  {iconUri ? 'Change' : 'Add'} Icon
                </Text>
              </TouchableOpacity>
              {iconUri && (
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => setIconUri(undefined)}
                >
                  <Text style={[styles.iconButtonText, styles.removeButtonText]}>
                    Remove
                  </Text>
                </TouchableOpacity>
              )}
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
  label: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
    marginBottom: 8,
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
    alignItems: 'center',
    gap: 12,
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
