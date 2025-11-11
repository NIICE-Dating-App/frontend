// MUST be first
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/lib/supabase';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'Kadwa': require('../assets/fonts/Kadwa-Regular.ttf'),
    'Kadwa-Bold': require('../assets/fonts/Kadwa-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Mark expired frames on app startup
  useEffect(() => {
    const markExpiredFrames = async () => {
      try {
        const { data, error } = await supabase.rpc('mark_all_expired_frames');
        if (error) {
          console.error('Error marking expired frames:', error);
        } else if (data && data.length > 0 && data[0].updated_count > 0) {
          console.log(`✅ Marked ${data[0].updated_count} frames as expired`);
        }
      } catch (err) {
        console.error('Failed to mark expired frames:', err);
      }
    };

    // Run immediately when app starts
    markExpiredFrames();

    // Run every 30 minutes while app is open (optional but recommended)
    const interval = setInterval(markExpiredFrames, 30 * 60 * 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack
          screenOptions={{
            animation: 'fade',
            animationDuration: 400,
            gestureEnabled: true,
            headerShown: false,
          }}
        >
          <Stack.Screen 
            name="index" 
            options={{ 
              headerShown: false,
            }} 
          />
          <Stack.Screen 
            name="signup" 
            options={{ 
              headerShown: false, 
              title: 'Sign Up',
            }} 
          />
          <Stack.Screen 
            name="login" 
            options={{ 
              headerShown: false, 
              title: 'Log In',
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}