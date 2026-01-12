import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Entry, storage } from '@/lib/storage';
import { scrapeMetadata } from '@/lib/scraping';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const DISMISS_THRESHOLD = 100;

export function AddEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;
  const insets = useSafeAreaInsets();
  
  // Drawer animation
  const drawerOffset = useSharedValue(0);
  const chevronScale = useSharedValue(1);

  const [link, setLink] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [iconUri, setIconUri] = useState<string | undefined>();
  const [isScraping, setIsScraping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing && params.id) {
      loadEntry(params.id);
    }
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

  const handleLinkChange = useCallback(
    async (text: string) => {
      setLink(text);
      
      // Only auto-scrape if it looks like a URL and we're not editing
      if (text.trim() && !isEditing && (text.startsWith('http://') || text.startsWith('https://'))) {
        setIsScraping(true);
        try {
          const metadata = await scrapeMetadata(text);
          if (metadata.title && !title) {
            setTitle(metadata.title);
          }
          if (metadata.subtitle && !subtitle) {
            setSubtitle(metadata.subtitle);
          }
          if (metadata.iconUrl && !iconUri) {
            setIconUri(metadata.iconUrl);
          }
        } catch (error) {
          console.error('Error scraping metadata:', error);
        } finally {
          setIsScraping(false);
        }
      }
    },
    [isEditing, title, subtitle, iconUri]
  );

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

  const handlePreview = () => {
    if (!link.trim() || !title.trim()) {
      return;
    }

    const entry: Entry = {
      id: params.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      link: link.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      iconUri,
      createdAt: params.id ? Date.now() : Date.now(), // Will be set properly on save
      updatedAt: Date.now(),
    };

    router.push({
      pathname: '/preview',
      params: {
        entry: JSON.stringify(entry),
        isNew: isEditing ? 'false' : 'true',
      },
    });
  };

  const canPreview = link.trim().length > 0 && title.trim().length > 0;

  const handleDismiss = useCallback(() => {
    router.back();
  }, [router]);

  const pullUpGesture = Gesture.Pan()
    .activeOffsetY(-10)
    .failOffsetX([-30, 30])
    .onChange((event) => {
      if (event.translationY < 0) {
        const distance = Math.abs(event.translationY);
        drawerOffset.value = -distance;
        chevronScale.value = interpolate(
          distance,
          [0, DISMISS_THRESHOLD],
          [1, 0.8],
          Extrapolation.CLAMP
        );
      }
    })
    .onEnd((event) => {
      if (event.translationY < -DISMISS_THRESHOLD) {
        // Threshold crossed - dismiss drawer
        drawerOffset.value = withSpring(-SCREEN_HEIGHT, {
          damping: 20,
          stiffness: 100,
        }, () => {
          runOnJS(handleDismiss)();
        });
      } else {
        // Below threshold - spring back
        drawerOffset.value = withSpring(0, {
          damping: 15,
          stiffness: 150,
        });
        chevronScale.value = withSpring(1, {
          damping: 15,
          stiffness: 150,
        });
      }
    });

  const drawerStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: drawerOffset.value }],
    };
  });

  const chevronStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scaleY: chevronScale.value }],
    };
  });

  return (
    <Animated.View style={[styles.drawerContainer, drawerStyle]}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
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
            <TextInput
              style={styles.input}
              value={link}
              onChangeText={handleLinkChange}
              placeholder="https://..."
              placeholderTextColor={BlurbColors.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              editable={!isScraping}
            />
            {isScraping && (
              <View style={styles.scrapingIndicator}>
                <ActivityIndicator size="small" color={BlurbColors.textSecondary} />
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
                <Image
                  source={{ uri: iconUri }}
                  style={styles.iconPreview}
                  contentFit="cover"
                />
              )}
              {!iconUri && (
                <View style={[styles.iconPreview, styles.iconPlaceholder]}>
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
      </ScrollView>
      <GestureDetector gesture={pullUpGesture}>
        <View style={[styles.chevronContainer, { paddingBottom: insets.bottom + 20 }]}>
          <Animated.View style={[styles.chevron, chevronStyle]}>
            <View style={styles.chevronUp}>
              <View style={[styles.chevronLine, styles.chevronLeft]} />
              <View style={[styles.chevronLine, styles.chevronRight]} />
            </View>
          </Animated.View>
        </View>
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
  input: {
    ...BlurbTypography.entryTitle,
    color: BlurbColors.text,
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: BlurbColors.border,
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
  iconPreview: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: BlurbColors.backgroundElevated,
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
  chevronContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  chevron: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronUp: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronLine: {
    width: 12,
    height: 2,
    backgroundColor: BlurbColors.textTertiary,
    position: 'absolute',
  },
  chevronLeft: {
    transform: [{ rotate: '45deg' }, { translateX: -4 }],
  },
  chevronRight: {
    transform: [{ rotate: '-45deg' }, { translateX: 4 }],
  },
});
