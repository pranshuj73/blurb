import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

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
