import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Brightness from 'expo-brightness';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppAlertProvider } from '@/components/ui/app-alert-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { BlurbColors } from '@/theme/colors';
import { BlurbTypography } from '@/theme/typography';

const BRIGHTNESS_BACKUP_KEY = '@blurb:brightness_backup';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <View style={styles.errorContainer}>
      <Text style={styles.errorTitle}>Something went wrong</Text>
      <Text style={styles.errorMessage}>{error instanceof Error ? error.message : 'Unknown error'}</Text>
      <TouchableOpacity style={styles.errorButton} onPress={resetErrorBoundary}>
        <Text style={styles.errorButtonText}>Try again</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'Manrope': require('../assets/fonts/Manrope-VariableFont_wght.ttf'),
    'Inter': require('../assets/fonts/Inter-VariableFont_opsz,wght.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Restore brightness on app launch if backup exists
  useEffect(() => {
    const restoreBrightness = async () => {
      try {
        const savedBrightness = await AsyncStorage.getItem(BRIGHTNESS_BACKUP_KEY);
        if (savedBrightness) {
          const brightness = parseFloat(savedBrightness);
          await Brightness.setBrightnessAsync(brightness);
          await AsyncStorage.removeItem(BRIGHTNESS_BACKUP_KEY);
          console.log('Restored brightness from backup:', brightness);
        }
      } catch (error) {
        console.error('Error restoring brightness:', error);
      }
    };

    restoreBrightness();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <AppAlertProvider>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="add-entry"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="preview"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="fullscreen-qr"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="scan"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'fade',
                }}
              />
              <Stack.Screen
                name="scan-review"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'none',
                }}
              />
              <Stack.Screen
                name="edit-entry-blurb"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'none',
                }}
              />
              <Stack.Screen
                name="edit-scanned-blurb"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'none',
                }}
              />
              <Stack.Screen
                name="scanned"
                options={{
                  presentation: 'transparentModal',
                  headerShown: false,
                  animation: 'fade',
                }}
              />
                <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              </Stack>
              <StatusBar style="light" />
            </AppAlertProvider>
          </ThemeProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: BlurbColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  errorTitle: {
    ...BlurbTypography.title,
    color: BlurbColors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  errorMessage: {
    ...BlurbTypography.body,
    color: BlurbColors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  errorButton: {
    backgroundColor: BlurbColors.text,
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  errorButtonText: {
    ...BlurbTypography.body,
    color: BlurbColors.background,
    fontWeight: '600',
  },
});
