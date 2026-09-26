import type { Session } from '@supabase/supabase-js';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import { prefs } from '@/lib/prefs';
import { supabase } from '@/lib/supabase';
import { color } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .finally(() => SplashScreen.hideAsync());
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Old anonymous sessions (pre-login builds) don't count as signed in.
  const userId = session && !session.user.is_anonymous ? session.user.id : null;

  // Backend "CRM": last seen + language chosen in the welcome story. Row itself is created by a DB trigger.
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .update({ last_seen_at: new Date().toISOString(), language: prefs.language() })
      .eq('id', userId)
      .then(() => {});
  }, [userId]);

  if (session === undefined) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: color.bg },
          headerTintColor: color.text,
          headerTitleStyle: { fontSize: 20, fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: color.bg },
        }}>
        <Stack.Protected guard={!!userId}>
          <Stack.Screen name="index" options={{ headerShown: false, title: 'My recipes' }} />
          <Stack.Screen name="add" options={{ title: 'Add recipe' }} />
          <Stack.Screen name="recipe/[id]" options={{ title: '' }} />
          <Stack.Screen name="account" options={{ title: 'Account' }} />
          <Stack.Screen name="cook/[id]" options={{ headerShown: false, gestureEnabled: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!userId}>
          <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
        </Stack.Protected>
        <Stack.Screen name="welcome" options={{ headerShown: false, animation: 'fade' }} />
      </Stack>
    </>
  );
}
