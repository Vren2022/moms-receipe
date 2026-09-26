import './storage';
import { createClient } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';

// Session is persisted (SQLite on native, browser storage on web) and auto-refreshed,
// so users stay logged in until they log out — same as other Android/iOS apps.
export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      flowType: 'pkce',
      detectSessionInUrl: Platform.OS === 'web', // web: Google redirects back with ?code=
    },
  },
);

AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

// First time: name + email + password. Returns false when the email must be confirmed with a code first.
export async function signUp(name: string, email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
  if (error) throw error;
  // Supabase hides "already registered" (no identities, no session) to prevent email enumeration.
  if (data.user && !data.user.identities?.length) throw new Error('This email already has an account. Please log in.');
  return !!data.session;
}

export async function signIn(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

// Browser OAuth: works on web and in Expo Go (redirect URL must be in Supabase's allow-list).
export async function signInWithGoogle() {
  const redirectTo = Platform.OS === 'web' ? window.location.origin : Linking.createURL('/');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' },
  });
  if (error) throw error;
  if (Platform.OS === 'web') return; // page navigates to Google and back
  const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (res.type !== 'success') return; // user closed the browser
  const code = Linking.parse(res.url).queryParams?.code;
  if (typeof code !== 'string') throw new Error('Google login failed');
  const { error: e2 } = await supabase.auth.exchangeCodeForSession(code);
  if (e2) throw e2;
}

// Email code: confirms a new account, and doubles as "forgot password".
export async function sendCode(email: string) {
  const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
  if (error) throw error;
}

export async function verifyCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
  if (error) throw error;
}

export async function setPassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
}

// Recipes + profile are removed by cascade on the server.
export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account');
  if (error) throw error;
  await supabase.auth.signOut({ scope: 'local' });
}
