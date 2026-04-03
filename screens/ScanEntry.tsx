import { scrapeMetadata } from '@/lib/scraping';
import { ScannedEntry, storage } from '@/lib/storage';
import { cacheFavicon } from '@/lib/utils/favicon-cache';
import { normalizeUrl } from '@/lib/utils/url';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, ScanLine } from 'lucide-react-native';

type BarcodePayload = { data?: string };

function getScannedLabel(rawValue: string) {
  try {
    return new URL(normalizeUrl(rawValue)).hostname.replace(/^www\./, '');
  } catch {
    return rawValue.trim().slice(0, 80) || 'Scanned contact';
  }
}

export function ScanEntry() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const hasHandledScanRef = useRef(false);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleSaveScan = async (rawValue: string) => {
    const normalizedLink = normalizeUrl(rawValue);
    const metadata = await scrapeMetadata(normalizedLink);
    const iconUri = metadata.iconUrl ? await cacheFavicon(metadata.iconUrl) : undefined;
    const scannedEntry: ScannedEntry = {
      id: Crypto.randomUUID(),
      title: metadata.title || getScannedLabel(normalizedLink),
      subtitle: metadata.subtitle,
      link: normalizedLink,
      iconUri,
      iconType: iconUri ? 'image' : 'lucide',
      accentColor: metadata.accentColor,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      scannedAt: Date.now(),
    };

    await storage.saveScannedEntry(scannedEntry);
  };

  const handleBarcodeScanned = async ({ data }: BarcodePayload) => {
    if (!data || isProcessing || hasHandledScanRef.current) {
      return;
    }

    hasHandledScanRef.current = true;
    setIsProcessing(true);

    try {
      await handleSaveScan(data);
      router.replace('/?scanned=1');
    } catch (error) {
      console.error('Error saving scanned QR:', error);
      Alert.alert('Scan failed', 'The QR was detected, but it could not be saved.');
      hasHandledScanRef.current = false;
      setIsProcessing(false);
    }
  };

  if (!permission || permission.status === 'undetermined') {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={BlurbColors.text} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.stateTitle}>Camera access needed</Text>
        <Text style={styles.stateCopy}>
          Allow camera access to scan someone&apos;s QR and save their card instantly.
        </Text>
        <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
          <Text style={styles.primaryButtonText}>Enable camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleBarcodeScanned}
      />

      <View style={[styles.overlay, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft color={BlurbColors.text} size={20} />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.scanFrameSection}>
          <View style={styles.scanPoster}>
            <View style={styles.scanEyebrow}>
              <ScanLine color={BlurbColors.textSecondary} size={16} />
              <Text style={styles.scanEyebrowText}>Scan a blurb card</Text>
            </View>
            <Text style={styles.scanTitle}>Point the camera at their QR.</Text>
            <Text style={styles.scanCopy}>
              We&apos;ll save the destination instantly and keep it in your scanned list.
            </Text>
          </View>

          <View style={styles.scanFrame}>
            <View style={styles.scanFrameInner} />
          </View>
        </View>

        <View style={styles.footerHint}>
          <Text style={styles.footerHintText}>
            {isProcessing ? 'Saving scan...' : 'Hold steady while the QR enters the frame.'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BlurbColors.background,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.36)',
  },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(12, 12, 14, 0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.text,
    fontWeight: '500',
  },
  scanFrameSection: {
    alignItems: 'center',
    gap: 28,
  },
  scanPoster: {
    alignItems: 'center',
    gap: 10,
    maxWidth: 320,
  },
  scanEyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scanEyebrowText: {
    ...BlurbTypography.small,
    color: BlurbColors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  scanTitle: {
    fontSize: 34,
    lineHeight: 38,
    fontWeight: '700',
    color: BlurbColors.text,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  scanCopy: {
    ...BlurbTypography.body,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  scanFrame: {
    width: 256,
    height: 256,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 18,
  },
  scanFrameInner: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.92)',
    backgroundColor: 'transparent',
  },
  footerHint: {
    alignItems: 'center',
  },
  footerHintText: {
    ...BlurbTypography.small,
    color: 'rgba(255,255,255,0.78)',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    gap: 16,
    backgroundColor: BlurbColors.background,
  },
  stateTitle: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
    textAlign: 'center',
    fontFamily: 'Manrope',
  },
  stateCopy: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  primaryButton: {
    marginTop: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: BlurbColors.text,
  },
  primaryButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.background,
    fontWeight: '600',
  },
});
