// Required login after the welcome story: Google, or email + password (name on first sign-up).
// Email code = confirm new account / forgot password.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

import { Btn } from '@/components/ui';
import { PRIVACY_URL } from '@/lib/labels';
import { prefs } from '@/lib/prefs';
import { sendCode, signIn, signInWithGoogle, signUp, verifyCode } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

type Mode = 'login' | 'signup' | 'code' | 'verify';

const TITLE: Record<Mode, string> = {
  login: 'Welcome back',
  signup: 'Keep your recipes safe',
  code: 'Log in with a code',
  verify: 'Enter the code',
};

export default function Login() {
  const [mode, setMode] = useState<Mode>('signup');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!prefs.onboarded()) return <Redirect href="/welcome" />;

  const cleanEmail = email.trim().toLowerCase();
  const go = (m: Mode) => {
    setMode(m);
    setError(null);
  };

  // On success the layout's auth listener swaps this screen for home.
  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  function submit() {
    if (mode === 'verify') return run(() => verifyCode(cleanEmail, code.trim()));
    if (!/^\S+@\S+\.\S+$/.test(cleanEmail)) return setError('Please enter a valid email');
    if (mode === 'code')
      return run(async () => {
        await sendCode(cleanEmail);
        go('verify');
      });
    if (mode === 'signup' && !name.trim()) return setError('Please enter your name');
    if (password.length < 6) return setError('Password needs at least 6 characters');
    if (mode === 'login') return run(() => signIn(cleanEmail, password));
    run(async () => {
      const loggedIn = await signUp(name.trim(), cleanEmail, password);
      if (!loggedIn) go('verify'); // email confirmation is on: user types the code from the email
    });
  }

  const withPassword = mode === 'login' || mode === 'signup';

  return (
    <SafeAreaView style={s.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>{TITLE[mode]}</Text>
          {mode === 'signup' && <Text style={s.sub}>Your recipes stay with you, even on a new phone.</Text>}
          {mode === 'verify' && <Text style={s.sub}>We sent a code to {cleanEmail}</Text>}

          {withPassword && (
            <>
              <Pressable style={s.google} onPress={() => run(signInWithGoogle)} accessibilityRole="button">
                <MaterialCommunityIcons name="google" size={24} color={color.text} />
                <Text style={s.googleText}>Continue with Google</Text>
              </Pressable>
              <View style={s.orRow}>
                <View style={s.line} />
                <Text style={s.or}>or</Text>
                <View style={s.line} />
              </View>
            </>
          )}

          {mode === 'signup' && (
            <TextInput style={s.input} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={color.muted} autoComplete="name" textContentType="name" />
          )}
          {mode !== 'verify' && (
            <TextInput
              style={s.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={color.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
          )}
          {withPassword && (
            <TextInput
              style={s.input}
              value={password}
              onChangeText={setPassword}
              placeholder={mode === 'signup' ? 'Make a password (6+ characters)' : 'Password'}
              placeholderTextColor={color.muted}
              secureTextEntry
              autoCapitalize="none"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              textContentType={mode === 'signup' ? 'newPassword' : 'password'}
              onSubmitEditing={submit}
            />
          )}
          {mode === 'verify' && (
            <TextInput
              style={[s.input, s.code]}
              value={code}
              onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
              placeholder="123456"
              placeholderTextColor={color.muted}
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={8}
              onSubmitEditing={submit}
              autoFocus
            />
          )}

          {error && <Text style={s.error}>{error}</Text>}

          {busy ? (
            <ActivityIndicator size="large" color={color.accent} style={{ minHeight: size.tap }} />
          ) : (
            <Btn label={{ login: 'Log in', signup: 'Create account', code: 'Send code', verify: 'Continue' }[mode]} onPress={submit} />
          )}

          {mode === 'signup' && <Link label="Already have an account? Log in" onPress={() => go('login')} />}
          {mode === 'login' && (
            <>
              <Link label="Forgot password? Log in with a code" onPress={() => go('code')} />
              <Link label="New here? Create account" onPress={() => go('signup')} />
            </>
          )}
          {(mode === 'code' || mode === 'verify') && <Link label="Back to log in" onPress={() => go('login')} />}
          <Pressable onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} style={s.link} accessibilityRole="link">
            <Text style={s.fine}>By continuing you agree to our Privacy Policy</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Link({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.link} accessibilityRole="button">
      <Text style={s.linkText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  body: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 14 },
  title: { fontSize: 30, fontWeight: '800', color: color.text },
  sub: { fontSize: size.body, color: color.muted, lineHeight: 26 },
  google: {
    minHeight: size.tap,
    borderRadius: size.radius,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.card,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  googleText: { fontSize: 20, fontWeight: '700', color: color.text },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  line: { flex: 1, height: 1, backgroundColor: color.border },
  or: { fontSize: 16, color: color.muted },
  input: {
    minHeight: size.tap,
    borderRadius: size.radius,
    borderWidth: 2,
    borderColor: color.border,
    backgroundColor: color.card,
    paddingHorizontal: 16,
    fontSize: 20,
    color: color.text,
  },
  code: { fontSize: 28, letterSpacing: 8, textAlign: 'center', fontWeight: '700' },
  error: { fontSize: 16, color: color.danger },
  link: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  fine: { fontSize: 14, color: color.muted, textDecorationLine: 'underline' },
  linkText: { fontSize: 16, color: color.accent, fontWeight: '600' },
});
