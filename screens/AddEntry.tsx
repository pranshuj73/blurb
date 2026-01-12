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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Entry, storage } from '@/lib/storage';
import { scrapeMetadata } from '@/lib/scraping';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

export function AddEntry() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!params.id;

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
    const entry = await storage.getEntry(id);
    if (entry) {
      setLink(entry.link);
      setTitle(entry.title);
      setSubtitle(entry.subtitle || '');
      setIconUri(entry.iconUri);
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setIconUri(result.assets[0].uri);
    }
  };

  const handlePreview = () => {
    if (!link.trim() || !title.trim()) {
      return;
    }

    const entry: Entry = {
      id: params.id || `temp-${Date.now()}`,
      link: link.trim(),
      title: title.trim(),
      subtitle: subtitle.trim() || undefined,
      iconUri,
      createdAt: Date.now(),
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

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
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
});
