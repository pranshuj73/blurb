import { BlurbFormFields } from '@/components/ui/blurb-form-fields';
import { BlurbFormSheet } from '@/components/ui/blurb-form-sheet';
import { useAppAlert } from '@/components/ui/app-alert-provider';
import { ScannedEntry, storage } from '@/lib/storage';
import { normalizeUrl } from '@/lib/utils/url';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Check, Trash2 } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function EditScannedBlurb() {
  const router = useRouter();
  const { showAlert } = useAppAlert();
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
      await storage.saveScannedEntry({
        ...entry,
        title: nextTitle,
        link: normalizeUrl(nextLink),
        updatedAt: Date.now(),
      });
      router.back();
    } catch (error) {
      console.error('Error saving scanned edit:', error);
      await showAlert({
        title: 'Save failed',
        message: 'This blurb could not be saved.',
      });
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    const result = await showAlert({
      title: 'Delete blurb',
      message: 'This will remove it from your scanned list.',
      actions: [
        { label: 'Cancel', style: 'cancel', value: 'cancel' },
        { label: 'Delete', style: 'destructive', value: 'delete' },
      ],
    });

    if (result !== 'delete') return;
    await storage.deleteScannedEntry(entry.link);
    router.back();
    router.back();
  };

  return (
    <BlurbFormSheet
      title="Edit blurb"
      onClose={() => router.back()}
      height="fit"
      footer={
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} activeOpacity={0.88}>
            <Trash2 color="#FF6B6B" size={17} />
            <Text style={styles.deleteButtonText}>Delete</Text>
          </TouchableOpacity>

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
        iconUri={entry.iconUri}
        iconType={entry.iconType}
        title={title}
        onTitleChange={setTitle}
        link={link}
        onLinkChange={setLink}
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
});
