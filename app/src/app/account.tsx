// Who's logged in, log out, delete account (store requirement). Two-tap confirm works on web too (Alert doesn't).
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';

import { Btn } from '@/components/ui';
import { PRIVACY_URL } from '@/lib/labels';
import { deleteAccount, setPassword, supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

export default function Account() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saved, setSaved] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user;
      setEmail(u?.email ?? u?.phone ?? '');
      setName(u?.user_metadata.name ?? u?.user_metadata.full_name ?? '');
    });
  }, []);

  // For "forgot password" (logged in with a code) and Google users who want a password too.
  async function onSavePassword() {
    if (newPassword.length < 6) return setError('Password needs at least 6 characters');
    setError(null);
    try {
      await setPassword(newPassword);
      setNewPassword('');
      setSaved(true);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  async function onDelete() {
    if (!confirming) return setConfirming(true);
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch (e: any) {
      setError(e?.message ?? String(e));
      setBusy(false);
    }
  }

  return (
    <View style={s.screen}>
      {!!name && <Text style={s.email}>Namaste, {name}</Text>}
      <Text style={s.label}>Logged in as {email}</Text>

      <Text style={[s.label, { marginTop: 16 }]}>New password</Text>
      <TextInput
        style={s.input}
        value={newPassword}
        onChangeText={(t) => {
          setNewPassword(t);
          setSaved(false);
        }}
        placeholder="6+ characters"
        placeholderTextColor={color.muted}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />
      {saved ? <Text style={s.label}>Password saved ✓</Text> : newPassword.length > 0 && <Btn label="Save password" onPress={onSavePassword} secondary />}

      <View style={{ flex: 1 }} />

      {busy ? (
        <ActivityIndicator size="large" color={color.accent} />
      ) : (
        <>
          <Btn label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)} secondary />
          <Btn label="Log out" onPress={() => supabase.auth.signOut()} />
          {confirming && <Text style={s.warn}>This deletes all your recipes forever. Tap again to confirm.</Text>}
          <Btn label={confirming ? 'Yes, delete everything' : 'Delete account'} onPress={onDelete} secondary />
        </>
      )}
      {error && <Text style={s.warn}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, padding: size.pad, gap: 12, paddingBottom: 32 },
  label: { fontSize: 16, color: color.muted },
  email: { fontSize: 22, fontWeight: '700', color: color.text },
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
  warn: { fontSize: 16, color: color.danger, textAlign: 'center' },
});
