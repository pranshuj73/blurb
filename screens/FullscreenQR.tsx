import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StatusBar,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import QRCode from 'react-native-qrcode-svg';
import * as Brightness from 'expo-brightness';
import { Entry, storage } from '@/lib/storage';
import { QR_CONFIG } from '@/lib/qr';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

export function FullscreenQR() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const [entry, setEntry] = useState<Entry | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [maxBrightness, setMaxBrightness] = useState(false);
  const [originalBrightness, setOriginalBrightness] = useState<number | null>(null);

  useEffect(() => {
    loadEntry();
  }, [params.id]);

  useEffect(() => {
    // Restore brightness when leaving screen
    return () => {
      if (maxBrightness && originalBrightness !== null) {
        Brightness.setBrightnessAsync(originalBrightness);
      }
    };
  }, [maxBrightness, originalBrightness]);

  const loadEntry = async () => {
    if (params.id) {
      const loaded = await storage.getEntry(params.id);
      setEntry(loaded);
    }
  };

  const handleToggleControls = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const handleToggleBrightness = useCallback(async () => {
    try {
      if (!maxBrightness) {
        // Save current brightness and set to max
        const current = await Brightness.getBrightnessAsync();
        setOriginalBrightness(current);
        await Brightness.setBrightnessAsync(1.0);
        setMaxBrightness(true);
      } else {
        // Restore original brightness
        if (originalBrightness !== null) {
          await Brightness.setBrightnessAsync(originalBrightness);
        }
        setMaxBrightness(false);
        setOriginalBrightness(null);
      }
    } catch (error) {
      console.error('Error toggling brightness:', error);
    }
  }, [maxBrightness, originalBrightness]);

  const handleShare = useCallback(() => {
    // TODO: Implement share functionality
    // For now, just show an alert
    if (entry) {
      // Share the QR code or link
      console.log('Share:', entry.link);
    }
  }, [entry]);

  const handleClose = useCallback(() => {
    if (maxBrightness && originalBrightness !== null) {
      Brightness.setBrightnessAsync(originalBrightness);
    }
    router.back();
  }, [router, maxBrightness, originalBrightness]);

  if (!entry) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
        <TouchableOpacity style={styles.backButtonFallback} onPress={() => router.back()}>
          <Text style={styles.controlButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!entry.link) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Invalid entry</Text>
        <TouchableOpacity style={styles.backButtonFallback} onPress={() => router.back()}>
          <Text style={styles.controlButtonText}>Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const qrSize = QR_CONFIG.getFullscreenSize();

  return (
    <TouchableWithoutFeedback onPress={handleToggleControls}>
      <View style={styles.container}>
        <StatusBar hidden={!showControls} />
        
        {showControls && (
          <View style={styles.controls}>
            <TouchableOpacity style={styles.controlButton} onPress={handleClose}>
              <Text style={styles.controlButtonText}>Close</Text>
            </TouchableOpacity>
            
            <View style={styles.controlButtons}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleShare}
              >
                <Text style={styles.controlButtonText}>Share</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleToggleBrightness}
              >
                <Text style={styles.controlButtonText}>
                  {maxBrightness ? 'Normal' : 'Max'} Brightness
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.content}>
          <View style={styles.header}>
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
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  controls: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: BlurbColors.background,
    zIndex: 10,
  },
  controlButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  controlButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  controlButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    width: '100%',
    justifyContent: 'center',
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    marginRight: 12,
  },
  titleSection: {
    alignItems: 'center',
  },
  title: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    ...BlurbTypography.subtitle,
    color: BlurbColors.textSecondary,
    textAlign: 'center',
  },
  qrContainer: {
    backgroundColor: BlurbColors.qrBackground,
    padding: 16,
    borderRadius: 12,
  },
  loadingText: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
    marginBottom: 16,
  },
  backButtonFallback: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: BlurbColors.backgroundElevated,
    borderRadius: 8,
  },
});
