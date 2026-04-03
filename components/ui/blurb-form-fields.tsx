import { ThemedIcon } from '@/components/entry/themed-icon';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { RefreshCw } from 'lucide-react-native';
import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type BlurbFormFieldsProps = {
  iconUri?: string;
  iconType?: 'image' | 'lucide';
  title: string;
  onTitleChange: (value: string) => void;
  link: string;
  onLinkChange: (value: string) => void;
  onSyncFavicon?: () => void;
  onPressIcon?: () => void;
  isSyncingIcon?: boolean;
};

export function BlurbFormFields({
  iconUri,
  iconType,
  title,
  onTitleChange,
  link,
  onLinkChange,
  onSyncFavicon,
  onPressIcon,
  isSyncingIcon = false,
}: BlurbFormFieldsProps) {
  return (
    <View style={styles.formCard}>
      <TouchableOpacity
        style={styles.avatarWrap}
        onPress={onPressIcon}
        activeOpacity={onPressIcon ? 0.88 : 1}
        disabled={!onPressIcon}
      >
        {iconUri ? (
          <ThemedIcon uri={iconUri} iconType={iconType} size={44} />
        ) : (
          <ThemedIcon uri="Link" iconType="lucide" size={44} />
        )}
      </TouchableOpacity>

      <View style={styles.formFields}>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            value={title}
            onChangeText={onTitleChange}
            placeholder="Enter a name"
            placeholderTextColor={BlurbColors.textSecondary}
            style={styles.input}
            maxLength={100}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>Link</Text>
          <View style={styles.linkInputWrap}>
            <TextInput
              value={link}
              onChangeText={onLinkChange}
              placeholder="https://"
              placeholderTextColor={BlurbColors.textSecondary}
              style={[styles.input, styles.linkInput]}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              maxLength={2048}
            />
            {onSyncFavicon ? (
              <TouchableOpacity
                style={[styles.syncButton, isSyncingIcon && styles.syncButtonDisabled]}
                onPress={onSyncFavicon}
                disabled={isSyncingIcon}
                activeOpacity={0.88}
              >
                <RefreshCw color={BlurbColors.text} size={15} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
    alignSelf: 'center',
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
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
  linkInputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  linkInput: {
    paddingRight: 56,
  },
  syncButton: {
    position: 'absolute',
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  syncButtonDisabled: {
    opacity: 0.7,
  },
});
