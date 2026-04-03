import { ThemedIcon } from '@/components/entry/themed-icon';
import { ScannedEntry, storage } from '@/lib/storage';
import { normalizeUrl } from '@/lib/utils/url';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, X } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export function ScanReview() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ entry?: string }>();

  const entry = useMemo(() => {
    try {
      return JSON.parse(params.entry || '{}') as ScannedEntry;
    } catch {
      return null;
    }
  }, [params.entry]);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [link, setLink] = useState(entry?.link ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const keyboardOffset = useSharedValue(0);

  React.useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      const nextOffset = Math.max(event.endCoordinates.height - insets.bottom, 0);
      keyboardOffset.value = withTiming(nextOffset, {
        duration: event.duration ?? 220,
        easing: Easing.out(Easing.cubic),
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, (event) => {
      keyboardOffset.value = withTiming(0, {
        duration: event?.duration ?? 180,
        easing: Easing.out(Easing.cubic),
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [insets.bottom, keyboardOffset]);

  const sheetLiftStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboardOffset.value }],
  }));

  if (!entry) {
    return null;
  }

  const handleClose = () => {
    router.back();
  };

  const handleSave = async () => {
    const nextTitle = title.trim();
    const nextLink = link.trim();

    if (!nextTitle || !nextLink) {
      Alert.alert('Missing details', 'Name and link are both required.');
      return;
    }

    setIsSaving(true);

    try {
      await storage.saveScannedEntry({
        ...entry,
        title: nextTitle,
        link: normalizeUrl(nextLink),
        updatedAt: Date.now(),
      });
      router.back();
    } catch (error) {
      console.error('Error saving scanned draft:', error);
      Alert.alert('Save failed', 'This blurb could not be saved.');
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.backdrop} />
      <View style={styles.keyboardWrap}>
        <Animated.View
          entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic))}
          exiting={SlideOutDown.duration(180).easing(Easing.in(Easing.cubic))}
          style={[
            sheetLiftStyle,
            styles.sheet,
            {
              paddingTop: insets.top + 18,
              paddingBottom: insets.bottom + 24,
            },
          ]}
        >
          <View style={styles.header}>
            <TouchableOpacity style={styles.iconButton} onPress={handleClose} activeOpacity={0.85}>
              <X color={BlurbColors.textSecondary} size={18} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Save scan</Text>
            <View style={styles.iconButtonPlaceholder} />
          </View>

          <View style={styles.formCard}>
            <View style={styles.avatarWrap}>
              {entry.iconUri ? (
                <ThemedIcon uri={entry.iconUri} size={44} />
              ) : (
                <ThemedIcon uri="Link" iconType="lucide" size={44} />
              )}
            </View>

            <View style={styles.formFields}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Name</Text>
                <TextInput
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter a name"
                  placeholderTextColor={BlurbColors.textSecondary}
                  style={styles.input}
                  maxLength={100}
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>Link</Text>
                <TextInput
                  value={link}
                  onChangeText={setLink}
                  placeholder="https://"
                  placeholderTextColor={BlurbColors.textSecondary}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  maxLength={2048}
                />
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.88}
          >
            <Check color={BlurbColors.background} size={18} />
            <Text style={styles.saveButtonText}>{isSaving ? 'Saving...' : 'Save blurb'}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  keyboardWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.42)',
  },
  sheet: {
    backgroundColor: '#0C0C0E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  iconButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  headerTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '700',
    color: BlurbColors.text,
    fontFamily: 'Manrope',
  },
  formCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 18,
    gap: 18,
  },
  avatarWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  formFields: {
    gap: 14,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    ...BlurbTypography.small,
    color: 'rgba(255,255,255,0.54)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  input: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: BlurbColors.text,
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Inter',
  },
  saveButton: {
    marginTop: 16,
    marginBottom: 4,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F4F4F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.background,
    fontWeight: '700',
  },
});
