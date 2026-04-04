import { BlurbFormField, BlurbFormFields } from '@/components/ui/blurb-form-fields';
import { BlurbFormSheet } from '@/components/ui/blurb-form-sheet';
import { useAppAlert } from '@/components/ui/app-alert-provider';
import { IconPicker } from '@/components/icon-picker';
import { Entry, storage } from '@/lib/storage';
import { cacheFavicon } from '@/lib/utils/favicon-cache';
import { getAccentColorFromFavicon } from '@/lib/utils/favicon-color';
import { getDomainSeed, pickBlurbImage, syncFaviconForLink } from '@/lib/utils/blurb-icon';
import { normalizeUrl } from '@/lib/utils/url';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, ExternalLink, RefreshCw, Trash2 } from 'lucide-react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function EditEntryBlurb() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
  const params = useLocalSearchParams<{ entry?: string; title?: string }>();

  const entry = useMemo(() => {
    try {
      return JSON.parse(params.entry || '{}') as Entry;
    } catch {
      return null;
    }
  }, [params.entry]);

  const [title, setTitle] = useState(entry?.title ?? '');
  const [link, setLink] = useState(entry?.link ?? '');
  const [iconUri, setIconUri] = useState(entry?.iconUri);
  const [iconType, setIconType] = useState<'image' | 'lucide'>(entry?.iconType ?? (entry?.iconUri ? 'image' : 'lucide'));
  const [accentColor, setAccentColor] = useState(entry?.accentColor);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncingIcon, setIsSyncingIcon] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const isExistingScanEdit = params.title === 'Edit existing blurb';

  useEffect(() => {
    if (!entry) return;
    setTitle(entry.title ?? '');
    setLink(entry.link ?? '');
    setIconUri(entry.iconUri);
    setIconType(entry.iconType ?? (entry.iconUri ? 'image' : 'lucide'));
    setAccentColor(entry.accentColor);
  }, [entry]);

  if (!entry) return null;

  const handleSave = async () => {
    const nextTitle = title.trim();
    const nextLink = link.trim();

    if (!nextTitle || !nextLink) {
      await showAlert({
        title: 'Missing details',
        message: 'Name and link are both required.',
      });
      return;
    }

    setIsSaving(true);
    try {
      let resolvedIconUri = iconUri;
      if (iconType === 'image' && resolvedIconUri?.startsWith('http')) {
        resolvedIconUri = await cacheFavicon(resolvedIconUri);
      }

      const resolvedAccent =
        iconType === 'image'
          ? await getAccentColorFromFavicon(resolvedIconUri, getDomainSeed(nextLink))
          : await getAccentColorFromFavicon(undefined, getDomainSeed(nextLink));

      await storage.saveEntry({
        ...entry,
        title: nextTitle,
        link: normalizeUrl(nextLink),
        iconUri: resolvedIconUri,
        iconType,
        accentColor: resolvedAccent || accentColor,
        updatedAt: Date.now(),
      });
      router.back();
    } catch (error) {
      console.error('Error saving entry edit:', error);
      await showAlert({
        title: 'Save failed',
        message: 'This blurb could not be saved.',
      });
      setIsSaving(false);
    }
  };

  const handleSyncFavicon = async () => {
    if (!link.trim()) {
      await showAlert({
        title: 'Missing link',
        message: 'Enter a link before syncing the favicon.',
      });
      return;
    }

    setIsSyncingIcon(true);
    try {
      const nextIcon = await syncFaviconForLink(link);
      setIconUri(nextIcon.iconUri);
      setIconType(nextIcon.iconType);
      setAccentColor(nextIcon.accentColor);
    } catch (error) {
      console.error('Error syncing favicon:', error);
      await showAlert({
        title: 'Sync failed',
        message: 'The favicon could not be refreshed.',
      });
    } finally {
      setIsSyncingIcon(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const picked = await pickBlurbImage();
      if (!picked) return;

      setIconUri(picked.iconUri);
      setIconType(picked.iconType);
      setAccentColor(await getAccentColorFromFavicon(picked.iconUri, getDomainSeed(link || title || entry.link)));
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const handleSelectLucideIcon = (iconName: string) => {
    setIconUri(iconName);
    setIconType('lucide');
    void getAccentColorFromFavicon(undefined, getDomainSeed(link || title || entry.link)).then(setAccentColor);
  };

  const handleDelete = async () => {
    const result = await showAlert({
      title: 'Delete blurb',
      message: 'This will remove it from your list.',
      actions: [
        { label: 'Cancel', style: 'cancel', value: 'cancel' },
        { label: 'Delete', style: 'destructive', value: 'delete' },
      ],
    });

    if (result !== 'delete') return;
    await storage.deleteEntry(entry.id);
    router.back();
    router.back();
  };

  const handleVisit = async () => {
    try {
      await Linking.openURL(normalizeUrl(link));
    } catch (error) {
      console.error('Error opening link:', error);
      await showAlert({
        title: 'Open failed',
        message: 'This link could not be opened.',
      });
    }
  };

  const fields: BlurbFormField[] = [
    {
      key: 'name',
      label: 'Name',
      headerRight: (
        <Text style={styles.counterText}>
          {title.length}/100
        </Text>
      ),
      value: title,
      onChange: setTitle,
      placeholder: 'Enter a name',
      maxLength: 100,
      autoCapitalize: 'words',
      autoCorrect: false,
    },
    {
      key: 'link',
      label: 'Link',
      value: link,
      onChange: setLink,
      placeholder: 'https://',
      maxLength: 2048,
      keyboardType: 'url',
      autoCapitalize: 'none',
      autoCorrect: false,
      trailing: (
        <TouchableOpacity
          style={[styles.trailingButton, (!link.trim() || isSyncingIcon) && styles.trailingButtonDisabled]}
          onPress={handleSyncFavicon}
          disabled={!link.trim() || isSyncingIcon}
          activeOpacity={0.88}
        >
          <RefreshCw color={BlurbColors.text} size={15} />
        </TouchableOpacity>
      ),
    },
  ];

  return (
    <BlurbFormSheet
      title={params.title || 'Edit blurb'}
      onClose={() => router.back()}
      height="fit"
      footer={
        <View style={styles.actionsRow}>
          {isExistingScanEdit ? (
            <TouchableOpacity style={styles.secondaryButton} onPress={handleVisit} activeOpacity={0.88}>
              <ExternalLink color={BlurbColors.text} size={17} />
              <Text style={styles.secondaryButtonText}>Visit</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.88}>
              <Trash2 color="#FF6B6B" size={17} />
              <Text style={styles.deleteButtonText}>Delete</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.primaryButton, isSaving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
            activeOpacity={0.88}
          >
            <Check color={BlurbColors.background} size={18} />
            <Text style={styles.primaryButtonText}>{isSaving ? 'Saving...' : 'Save'}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <BlurbFormFields
        iconUri={iconUri}
        iconType={iconType}
        fields={fields}
        onPressIcon={() => setShowIconPicker(true)}
      />
      <IconPicker
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelectIcon={handleSelectLucideIcon}
        topActionLabel="Upload image"
        onPressTopAction={handlePickImage}
      />
    </BlurbFormSheet>
  );
}

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deleteButtonText: {
    ...BlurbTypography.body,
    color: '#FF6B6B',
    fontWeight: '600',
  },
  secondaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
    fontWeight: '600',
  },
  counterText: {
    ...BlurbTypography.small,
    color: BlurbColors.textTertiary,
    fontSize: 12,
  },
  primaryButton: {
    flex: 1,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#F4F4F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.background,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.7,
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
});
