import { ThemedIcon } from '@/components/entry/themed-icon';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

type BlurbFormFieldsProps = {
  iconUri?: string;
  iconType?: 'image' | 'lucide';
  title: string;
  onTitleChange: (value: string) => void;
  link: string;
  onLinkChange: (value: string) => void;
};

export function BlurbFormFields({
  iconUri,
  iconType,
  title,
  onTitleChange,
  link,
  onLinkChange,
}: BlurbFormFieldsProps) {
  return (
    <View style={styles.formCard}>
      <View style={styles.avatarWrap}>
        {iconUri ? (
          <ThemedIcon uri={iconUri} iconType={iconType} size={44} />
        ) : (
          <ThemedIcon uri="Link" iconType="lucide" size={44} />
        )}
      </View>

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
          <TextInput
            value={link}
            onChangeText={onLinkChange}
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
});
