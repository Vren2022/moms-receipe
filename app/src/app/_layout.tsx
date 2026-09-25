import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

import { ensureSession } from '@/lib/supabase';
import { color } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    ensureSession()
      .then(() => setReady(true))
      .catch((e) => setError(String(e?.message ?? e)))
      .finally(() => SplashScreen.hideAsync());
  }, []);

  if (error)
    return (
      <View style={{ flex: 1, justifyContent: 'center', padding: 24, backgroundColor: color.bg }}>
        <Text style={{ fontSize: 18, color: color.danger }}>Could not connect: {error}</Text>
      </View>
    );
  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: color.bg },
          headerTintColor: color.text,
          headerTitleStyle: { fontSize: 20, fontWeight: '700' },
          contentStyle: { backgroundColor: color.bg },
        }}>
        <Stack.Screen name="index" options={{ title: 'My recipes' }} />
        <Stack.Screen name="add" options={{ title: 'Add recipe' }} />
        <Stack.Screen name="recipe/[id]" options={{ title: '' }} />
      </Stack>
    </>
  );
}
