import { ThemedIcon } from '@/components/entry/themed-icon';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import React from 'react';
import {
  KeyboardTypeOptions,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';

export type BlurbFormField = {
  key: string;
  label: string;
  headerRight?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
  multiline?: boolean;
  trailing?: React.ReactNode;
  footer?: React.ReactNode;
};

type BlurbFormFieldsProps = {
  iconUri?: string;
  iconType?: 'image' | 'lucide';
  onPressIcon?: () => void;
  fields: BlurbFormField[];
  footer?: React.ReactNode;
  showIcon?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

export function BlurbFormFields({
  iconUri,
  iconType,
  onPressIcon,
  fields,
  footer,
  showIcon = true,
  containerStyle,
}: BlurbFormFieldsProps) {
  return (
    <View style={[styles.formCard, containerStyle]}>
      {showIcon ? (
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
      ) : null}

      <View style={styles.formFields}>
        {fields.map((field, index) => {
          const isLast = index === fields.length - 1;

          return (
            <View key={field.key} style={[styles.fieldGroup, !isLast && styles.fieldSpacing]}>
              <View style={styles.labelRow}>
                <Text style={styles.fieldLabel}>{field.label}</Text>
                {field.headerRight}
              </View>

              <View style={styles.inputWrap}>
                <TextInput
                  value={field.value}
                  onChangeText={(text) =>
                    field.onChange(field.maxLength ? text.slice(0, field.maxLength) : text)
                  }
                  placeholder={field.placeholder}
                  placeholderTextColor={BlurbColors.textSecondary}
                  style={[styles.input, field.trailing && styles.inputWithTrailingAction, field.multiline && styles.multilineInput] as StyleProp<TextStyle>}
                  autoCapitalize={field.autoCapitalize ?? 'none'}
                  autoCorrect={field.autoCorrect ?? false}
                  keyboardType={field.keyboardType}
                  editable={field.editable ?? true}
                  maxLength={field.maxLength}
                  multiline={field.multiline}
                />

                {field.trailing ? <View style={styles.trailingSlot}>{field.trailing}</View> : null}
              </View>

              {field.footer}
            </View>
          );
        })}
      </View>

      {footer}
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
    paddingBottom: 30,
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
    gap: 0,
  },
  fieldGroup: {
    gap: 0,
  },
  fieldSpacing: {
    marginBottom: 22,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    ...BlurbTypography.small,
    color: 'rgba(255,255,255,0.54)',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
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
  inputWithTrailingAction: {
    paddingRight: 56,
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  trailingSlot: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
