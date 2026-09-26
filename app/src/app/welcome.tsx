// First-launch welcome: a short "ad" in five beats — the call, the chaos, the magic, cooking together, the promise.
// Auto-plays (story-style progress bars); tap anywhere to skip ahead. Reanimated respects the OS reduce-motion setting.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CookingTogether } from '@/components/CookingTogether';
import { Btn, Chip } from '@/components/ui';
import { LANGUAGES } from '@/lib/labels';
import { prefs } from '@/lib/prefs';
import { color, size } from '@/lib/theme';

const BEAT_MS = [5000, 5000, 5500, 6000, 0]; // 0 = last beat waits for the user
const LAST = BEAT_MS.length - 1;

export default function Welcome() {
  const [beat, setBeat] = useState(0);
  const [language, setLanguage] = useState(prefs.language());

  useEffect(() => {
    if (beat === LAST) return;
    const t = setTimeout(() => setBeat((b) => Math.min(b + 1, LAST)), BEAT_MS[beat]);
    return () => clearTimeout(t);
  }, [beat]);

  function finish(to: '/' | '/add') {
    prefs.setLanguage(language);
    prefs.setOnboarded();
    router.replace('/');
    if (to === '/add') router.push('/add');
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.top}>
        <View style={s.bars}>
          {BEAT_MS.map((_, n) => (
            <Bar key={n} state={n < beat ? 'done' : n === beat ? 'now' : 'todo'} ms={BEAT_MS[n]} />
          ))}
        </View>
        {beat < LAST && (
          <Pressable onPress={() => setBeat(LAST)} hitSlop={12} accessibilityRole="button">
            <Text style={s.skip}>Skip</Text>
          </Pressable>
        )}
      </View>

      <Pressable
        style={{ flex: 1 }}
        onPress={() => beat < LAST && setBeat(beat + 1)}
        accessibilityHint={beat < LAST ? 'Tap to continue' : undefined}
        disabled={beat === LAST}>
        {/* key remounts each beat so its entering animations replay */}
        <View key={beat} style={{ flex: 1 }}>
          {beat === 0 && <TheCall />}
          {beat === 1 && <TheChaos />}
          {beat === 2 && <TheMagic />}
          {beat === 3 && <Together />}
          {beat === 4 && <ThePromise language={language} setLanguage={setLanguage} onStart={() => finish('/add')} onExplore={() => finish('/')} />}
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

function Bar({ state, ms }: { state: 'done' | 'now' | 'todo'; ms: number }) {
  const p = useSharedValue(state === 'done' ? 1 : 0);
  useEffect(() => {
    p.value = state === 'done' ? 1 : 0;
    if (state === 'now') p.value = withTiming(1, { duration: ms || 400 });
  }, [state, ms, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={s.bar}>
      <Animated.View style={[s.barFill, fill]} />
    </View>
  );
}

const Label = ({ children }: { children: string }) => <Text style={s.label}>{children}</Text>;

function TheCall() {
  return (
    <View style={s.beat}>
      <Label>THE CALL</Label>
      <Animated.View entering={ZoomIn.duration(400)} style={s.callIcon}>
        <MaterialCommunityIcons name="phone-in-talk" size={40} color={color.accent} />
      </Animated.View>
      <Animated.Text entering={FadeIn.delay(200)} style={s.muted}>Calling Maa…</Animated.Text>
      <View style={s.chat}>
        <Animated.View entering={FadeInUp.delay(900)} style={[s.bubble, s.me]}>
          <Text style={s.meText}>Maa, aloo gobi kaise banate hain?</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(2000)} style={[s.bubble, s.ma]}>
          <Text style={s.maText}>Arre beta, simple hai! Pehle tel garam kar…</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(3200)} style={[s.bubble, s.ma]}>
          <Text style={[s.maText, { color: color.muted, letterSpacing: 4 }]}>● ● ●</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const FRAGMENTS = ['thoda sa tel', 'jeera daal', 'jab tak golden na ho', 'namak andaaze se', 'haldi… ek chutki', 'dhak ke pakne de', 'bas ho gaya!'];

function TheChaos() {
  return (
    <View style={s.beat}>
      <Label>THE CHAOS</Label>
      <View style={s.frags}>
        {FRAGMENTS.map((f, n) => (
          <Animated.View key={f} entering={FadeIn.delay(250 + n * 320).duration(500)} style={[s.frag, { transform: [{ rotate: `${[-4, 3, -2, 5, -3, 2, -5][n]}deg` }] }]}>
            <Text style={s.fragText}>{f}</Text>
          </Animated.View>
        ))}
      </View>
      <Animated.Text entering={FadeInUp.delay(2800)} style={s.big}>
        {'Kitna tel? Kitni der?\nNext time… phir se call.'}
      </Animated.Text>
    </View>
  );
}

const STEPS: [string, string][] = [
  ['Heat the oil', '2 tbsp'],
  ['Add jeera', '30 sec'],
  ['Onion till golden', '5 min'],
  ['Haldi & masala', '1 min'],
  ['Cover & cook', '15 min'],
];

function TheMagic() {
  return (
    <View style={s.beat}>
      <Label>THE MAGIC</Label>
      <Animated.View entering={ZoomIn.duration(400)} style={{ alignSelf: 'center' }}>
        <MaterialCommunityIcons name="creation" size={40} color={color.softText} />
      </Animated.View>
      <View style={{ gap: 10 }}>
        {STEPS.map(([text, amount], n) => (
          <Animated.View key={text} entering={FadeInDown.delay(400 + n * 380)} style={s.step}>
            <Text style={s.stepText}>
              <Text style={{ color: color.accent, fontWeight: '800' }}>{n + 1}. </Text>
              {text}
            </Text>
            <Text style={s.stepAmt}>{amount}</Text>
          </Animated.View>
        ))}
      </View>
      <Animated.Text entering={FadeIn.delay(2600)} style={[s.muted, { textAlign: 'center' }]}>
        Ordered, measured, timed — for 2, 4 or 10 people.
      </Animated.Text>
    </View>
  );
}

function Together() {
  return (
    <View style={s.beat}>
      <Label>COOKING TOGETHER</Label>
      <Animated.View entering={FadeIn.duration(500)}>
        <CookingTogether />
      </Animated.View>
      <Animated.Text entering={FadeInUp.delay(2200)} style={s.big}>
        {'Like Maa is right\nthere with you'}
      </Animated.Text>
      <Animated.Text entering={FadeIn.delay(2700)} style={s.muted}>
        One step at a time, with timers. At your pace.
      </Animated.Text>
    </View>
  );
}

function ThePromise({ language, setLanguage, onStart, onExplore }: { language: string; setLanguage: (l: string) => void; onStart: () => void; onExplore: () => void }) {
  return (
    <View style={[s.beat, { justifyContent: 'flex-start' }]}>
      <Animated.View entering={ZoomIn.duration(500)} style={s.logo}>
        <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 110, height: 110 }} accessibilityLabel="Nuskha logo" />
      </Animated.View>
      <Animated.Text entering={FadeInUp.delay(300)} style={[s.big, { fontSize: 28 }]}>
        {'Maa ke haath ka swaad,\nab kabhi nahi bhoolenge'}
      </Animated.Text>
      <Animated.Text entering={FadeInUp.delay(600)} style={[s.muted, { textAlign: 'center' }]}>
        Her recipes. Your kitchen. Forever.
      </Animated.Text>
      <Animated.View entering={FadeIn.delay(900)} style={s.trust}>
        <MaterialCommunityIcons name="shield-lock-outline" size={20} color={color.veg} />
        <Text style={s.trustText}>{"Private to you. No ads, no noise — just your family's recipes."}</Text>
      </Animated.View>
      <Animated.View entering={FadeIn.delay(1100)} style={{ gap: 8 }}>
        <Text style={s.chooseLabel}>Show recipes in</Text>
        <View style={s.chips}>
          {LANGUAGES.map((l) => (
            <Chip key={l} label={l} on={l === language} onPress={() => setLanguage(l)} />
          ))}
        </View>
      </Animated.View>
      <View style={{ flex: 1 }} />
      <Animated.View entering={FadeInUp.delay(1300)} style={{ gap: 4 }}>
        <Btn label="Save your first recipe" onPress={onStart} />
        <Pressable onPress={onExplore} style={s.explore} accessibilityRole="button">
          <Text style={s.skip}>Look around first</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, paddingHorizontal: 20, paddingBottom: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  bars: { flex: 1, flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: color.border, overflow: 'hidden' },
  barFill: { height: 4, backgroundColor: color.accent },
  skip: { fontSize: 16, color: color.muted },
  beat: { flex: 1, justifyContent: 'center', gap: 18 },
  label: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5, color: color.softText, textAlign: 'center' },
  muted: { fontSize: size.body, color: color.muted, textAlign: 'center' },
  callIcon: { alignSelf: 'center', width: 88, height: 88, borderRadius: 44, backgroundColor: color.soft, alignItems: 'center', justifyContent: 'center' },
  chat: { gap: 10, marginTop: 8 },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, maxWidth: '85%' },
  me: { alignSelf: 'flex-end', backgroundColor: color.accent, borderRadius: 18, borderBottomRightRadius: 4 },
  ma: { alignSelf: 'flex-start', backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 18, borderBottomLeftRadius: 4 },
  meText: { color: color.accentText, fontSize: size.body },
  maText: { color: color.text, fontSize: size.body },
  frags: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, paddingVertical: 12 },
  frag: { backgroundColor: color.soft, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8 },
  fragText: { color: color.softText, fontSize: size.body, fontStyle: 'italic' },
  big: { fontSize: 24, fontWeight: '800', color: color.text, textAlign: 'center', lineHeight: 34 },
  step: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: size.radius, paddingHorizontal: 16, minHeight: 52 },
  stepText: { fontSize: size.body, color: color.text },
  stepAmt: { fontSize: size.body, fontWeight: '700', color: color.accent },
  logo: { alignSelf: 'center', width: 150, height: 150, borderRadius: 75, backgroundColor: color.soft, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  trust: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: color.card, borderRadius: size.radius, borderWidth: 1, borderColor: color.border, padding: 12 },
  trustText: { flex: 1, fontSize: 15, color: color.text },
  chooseLabel: { fontSize: 16, fontWeight: '700', color: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  explore: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
