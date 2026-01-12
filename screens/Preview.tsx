import React, { useMemo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { Image } from 'expo-image';
import { Entry, storage } from '@/lib/storage';
import { QR_CONFIG } from '@/lib/qr';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export function Preview() {
  const router = useRouter();
  const params = useLocalSearchParams<{ entry: string; isNew: string }>();
  const insets = useSafeAreaInsets();
  
  // Animation for smooth fade in/out
  const screenOpacity = useSharedValue(0);
  const screenScale = useSharedValue(0.95);
  
  const entry: Entry = useMemo(() => {
    try {
      return JSON.parse(params.entry || '{}');
    } catch {
      return null;
    }
  }, [params.entry]);

  const isNew = params.isNew === 'true';

  useEffect(() => {
    // Animate in
    screenOpacity.value = withSpring(1, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(1, {
      damping: 28,
      stiffness: 300,
      mass: 0.7,
    });
  }, []);

  const screenStyle = useAnimatedStyle(() => {
    return {
      opacity: screenOpacity.value,
      transform: [{ scale: screenScale.value }],
    };
  });

  if (!entry || !entry.link) {
    return (
      <Animated.View style={[styles.container, screenStyle]}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Error</Text>
          <View style={styles.backButton} />
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid entry data</Text>
        </View>
      </Animated.View>
    );
  }

  const handleSave = async () => {
    // Animate out
    screenOpacity.value = withSpring(0, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    setTimeout(async () => {
      await storage.saveEntry(entry);
      router.replace('/');
    }, 200);
  };

  const handleViewFullscreen = async () => {
    // Animate out
    screenOpacity.value = withSpring(0, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    
    setTimeout(async () => {
      if (!isNew) {
        router.push(`/fullscreen-qr?id=${entry.id}`);
      } else {
        // Save first, then view
        await storage.saveEntry(entry);
        router.push(`/fullscreen-qr?id=${entry.id}`);
      }
    }, 200);
  };

  const handleBack = () => {
    // Animate out
    screenOpacity.value = withSpring(0, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
    setTimeout(() => {
      router.back();
    }, 200);
  };

  const qrSize = QR_CONFIG.getSize();

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Preview</Text>
          <View style={styles.backButton} />
        </View>

      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          {entry.iconUri && (
            <Image
              source={{ uri: entry.iconUri }}
              style={styles.icon}
              contentFit="cover"
            />
          )}
          <View style={styles.titleSection}>
            <Text style={styles.title}>{entry.title}</Text>
            {entry.subtitle && (
              <Text style={styles.subtitle}>{entry.subtitle}</Text>
            )}
          </View>
        </View>

        <View style={styles.qrSpacer} />

        <View style={styles.qrWrapper}>
          <View style={styles.qrContainer}>
            <QRCode
              value={entry.link}
              size={qrSize}
              color={BlurbColors.qrForeground}
              backgroundColor={BlurbColors.qrBackground}
              errorCorrectionLevel={QR_CONFIG.errorCorrectionLevel}
              logo={entry.iconUri ? { uri: entry.iconUri } : undefined}
              logoSize={qrSize * 0.15}
              logoBackgroundColor={BlurbColors.qrBackground}
              logoMargin={4}
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metadata}>
          <Text style={styles.metadataLabel}>Link</Text>
          <Text style={styles.metadataValue} selectable>
            {entry.link}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        {isNew && (
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.fullscreenButton, !isNew && styles.fullscreenButtonOnly]}
          onPress={handleViewFullscreen}
        >
          <Text style={styles.fullscreenButtonText}>View Fullscreen</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>
    </Animated.View>
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
  content: {
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
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 22,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 28,
    letterSpacing: -0.4,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  preview: {
    padding: 32,
    backgroundColor: BlurbColors.backgroundElevated,
    margin: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  qrSpacer: {
    height: 32,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 40,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    marginRight: 16,
  },
  titleSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 38,
    letterSpacing: -1,
    color: BlurbColors.text,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  subtitle: {
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 24,
    letterSpacing: -0.3,
    color: BlurbColors.textSecondary,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: BlurbColors.qrBackground,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BlurbColors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  divider: {
    height: 1,
    backgroundColor: BlurbColors.divider,
    marginBottom: 24,
  },
  metadata: {
    gap: 8,
  },
  metadataLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: BlurbColors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  metadataValue: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
    color: BlurbColors.textSecondary,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
  actions: {
    paddingHorizontal: 16,
    gap: 12,
  },
  saveButton: {
    backgroundColor: BlurbColors.backgroundElevated,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: BlurbColors.border,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  fullscreenButton: {
    backgroundColor: BlurbColors.text,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  fullscreenButtonOnly: {
    marginTop: 0,
  },
  fullscreenButtonText: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 24,
    letterSpacing: -0.2,
    color: BlurbColors.background,
    fontFamily: Platform.select({
      ios: 'SF Pro Display',
      android: 'sans-serif-medium',
      default: 'system-ui',
    }),
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: BlurbColors.textSecondary,
    textAlign: 'center',
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
    }),
  },
});
