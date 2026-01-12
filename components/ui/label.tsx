import React from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { BlurbColors } from '@/theme/colors';

export interface LabelProps extends TextProps {
  size?: 'xs' | 'sm';
}

const sizeStyles = {
  xs: { fontSize: 10, lineHeight: 14, letterSpacing: 1.8 },
  sm: { fontSize: 11, lineHeight: 16, letterSpacing: 1.2 },
};

export function Label({
  children,
  style,
  size = 'xs',
  ...props
}: LabelProps) {
  return (
    <Text
      style={[
        styles.base,
        sizeStyles[size],
        style,
      ]}
      {...props}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: BlurbColors.textTertiary,
    fontWeight: '300',
    textTransform: 'uppercase',
    fontFamily: 'Inter',
  },
});
