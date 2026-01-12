import { BlurbColors } from '@/theme/colors';
import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';

export interface HeadingProps extends TextProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  weight?: '200' | '300' | '400' | '500' | '600' | '700' | '800' | '900';
}

const sizeStyles = {
  sm: { fontSize: 24, lineHeight: 32, letterSpacing: 0 },
  md: { fontSize: 28, lineHeight: 36, letterSpacing: 0 },
  lg: { fontSize: 32, lineHeight: 40, letterSpacing: 0 },
  xl: { fontSize: 36, lineHeight: 44, letterSpacing: 0 },
  '2xl': { fontSize: 40, lineHeight: 48, letterSpacing: 0 },
};

export function Heading({
  children,
  style,
  size = 'lg',
  weight = '300',
  ...props
}: HeadingProps) {
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
    color: BlurbColors.text,
    fontFamily: 'Manrope',
  },
});
