import React from 'react';
import { Text, TextProps, StyleSheet, Platform } from 'react-native';
import { BlurbColors } from '@/theme/colors';

export interface SubheadingProps extends TextProps {
  size?: 'sm' | 'md' | 'lg';
  weight?: '400' | '500' | '600';
}

const defaultWeight = '600';

const sizeStyles = {
  sm: { fontSize: 13, lineHeight: 18, letterSpacing: 0.3 },
  md: { fontSize: 16, lineHeight: 22, letterSpacing: 0.4 },
  lg: { fontSize: 17, lineHeight: 24, letterSpacing: 0.5 },
};

export function Subheading({
  children,
  style,
  size = 'md',
  weight = defaultWeight,
  ...props
}: SubheadingProps) {
  return (
    <Text
      style={[
        styles.base,
        sizeStyles[size],
        { fontWeight: weight },
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
    color: BlurbColors.textSecondary,
    fontFamily: 'Inter',
  },
});
