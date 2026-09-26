import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn, Chip } from '@/components/ui';
import { LANGUAGES } from '@/lib/labels';
import { prefs } from '@/lib/prefs';
import { color, size } from '@/lib/theme';

const SLIDES = [
  { icon: 'chef-hat', title: "Never forget Mom's recipes", body: 'Paste or speak what she told you. We turn it into clear steps with amounts and timings.' },
  { icon: 'account-multiple-plus', title: 'Cooking for more people?', body: 'Change the number of people and every amount adjusts — salt and spices sensibly, not blindly.' },
  { icon: 'timer-outline', title: 'Cook step by step', body: 'One step at a time with timers, so nothing burns while you look for the next line.' },
] as const;

export default function Welcome() {
  const [i, setI] = useState(0);
  const [language, setLanguage] = useState(prefs.language());
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  function finish() {
    prefs.setLanguage(language);
    prefs.setOnboarded();
    router.replace('/');
  }

  return (
    <SafeAreaView style={s.screen}>
      <View style={s.body}>
        <View style={s.circle}>
          {i === 0 ? (
            <Image source={require('@/assets/images/splash-icon.png')} style={{ width: 120, height: 120 }} accessibilityLabel="Mom's Recipes logo" />
          ) : (
            <MaterialCommunityIcons name={slide.icon} size={72} color={color.softText} />
          )}
        </View>
        <Text style={s.title}>{slide.title}</Text>
        <Text style={s.text}>{slide.body}</Text>
        {last && (
          <View style={{ gap: 10, alignSelf: 'stretch' }}>
            <Text style={s.label}>Show recipes in</Text>
            <View style={s.chips}>
              {LANGUAGES.map((l) => (
                <Chip key={l} label={l} on={l === language} onPress={() => setLanguage(l)} />
              ))}
            </View>
          </View>
        )}
      </View>

      <View style={s.dots} accessibilityLabel={`Page ${i + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, n) => (
          <View key={n} style={[s.dot, n === i && s.dotOn]} />
        ))}
      </View>
      <View style={{ gap: 8 }}>
        <Btn label={last ? 'Get started' : 'Next'} onPress={last ? finish : () => setI(i + 1)} />
        {!last && (
          <Pressable onPress={finish} style={s.skip}>
            <Text style={s.skipText}>Skip</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg, padding: 24, gap: 20 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  circle: { width: 160, height: 160, borderRadius: 80, backgroundColor: color.soft, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: color.text, textAlign: 'center' },
  text: { fontSize: size.body, color: color.muted, textAlign: 'center', lineHeight: 26 },
  label: { fontSize: size.body, fontWeight: '700', color: color.text, marginTop: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: color.border },
  dotOn: { backgroundColor: color.accent, width: 24 },
  skip: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 16, color: color.muted },
});
