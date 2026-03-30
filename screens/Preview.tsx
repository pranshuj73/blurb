import { ThemedIcon } from '@/components/entry/themed-icon';
import { Heading } from '@/components/ui/heading';
import { Label } from '@/components/ui/label';
import { Subheading } from '@/components/ui/subheading';
import { QR_CONFIG } from '@/lib/qr';
import { Entry, storage } from '@/lib/storage';
import { getAccentColorFromFavicon } from '@/lib/utils/favicon-color';
import { BlurbColors } from '@/theme/colors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const domainSeed = (() => {
      try {
        return new URL(entry.link).hostname.replace(/^www\./, '');
      } catch {
        return entry.link;
      }
    })();
    const resolvedAccent =
      entry.iconType === 'image'
        ? await getAccentColorFromFavicon(entry.iconUri, domainSeed)
        : await getAccentColorFromFavicon(undefined, domainSeed);

    const saveAndNavigate = async () => {
      await storage.saveEntry({ ...entry, accentColor: resolvedAccent || entry.accentColor });
      router.replace('/');
    };

    // Animate out
    screenOpacity.value = withSpring(
      0,
      {
        damping: 30,
        stiffness: 300,
        mass: 0.7,
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(saveAndNavigate)();
        }
      }
    );
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
  };


  const handleBack = () => {
    // Animate out
    screenOpacity.value = withSpring(
      0,
      {
        damping: 30,
        stiffness: 300,
        mass: 0.7,
      },
      (finished) => {
        'worklet';
        if (finished) {
          runOnJS(router.back)();
        }
      }
    );
    screenScale.value = withSpring(0.95, {
      damping: 30,
      stiffness: 300,
      mass: 0.7,
    });
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
          {entry.iconUri ? (
            <ThemedIcon uri={entry.iconUri} size={52} />
          ) : (
            <ThemedIcon uri="Link" iconType="lucide" size={52} />
          )}
          <View style={styles.titleSection}>
            <Heading size="lg" weight="300">{entry.title}</Heading>
            {entry.subtitle && (
              <Subheading size="md">{entry.subtitle}</Subheading>
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
            />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.metadata}>
          <Label size="xs">Link</Label>
          <Text style={styles.metadataValue} selectable>
            {entry.link}
          </Text>
        </View>
      </View>

      {isNew && (
        <View style={styles.actions}>
          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save Entry</Text>
          </TouchableOpacity>
        </View>
      )}
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
  titleSection: {
    flex: 1,
    alignItems: 'flex-start',
    gap: 4,
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
    gap: 6,
  },
  metadataValue: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    color: BlurbColors.text,
    fontFamily: Platform.select({
      ios: 'SF Pro Text',
      android: 'sans-serif',
      default: 'system-ui',
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
