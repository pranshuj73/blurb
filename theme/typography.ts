import { Platform } from 'react-native';

export const BlurbTypography = {
  // Large, readable titles
  title: {
    fontSize: 24,
    fontWeight: '600' as const,
    lineHeight: 32,
    letterSpacing: -0.5,
  },
  
  // Entry titles in list
  entryTitle: {
    fontSize: 17,
    fontWeight: '500' as const,
    lineHeight: 24,
  },
  
  // Subtitles
  subtitle: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 20,
    color: '#A0A0A0',
  },
  
  // Body text
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    lineHeight: 22,
  },
  
  // Small text
  small: {
    fontSize: 13,
    fontWeight: '400' as const,
    lineHeight: 18,
    color: '#A0A0A0',
  },
  
  // Monospace for URLs
  mono: {
    fontSize: 13,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
    lineHeight: 18,
    color: '#A0A0A0',
  },
};
