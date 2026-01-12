import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';

SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  anchor: '(tabs)',
};

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

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="light" />
        </ThemeProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}
