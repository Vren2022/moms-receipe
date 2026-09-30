// Recipe text box styled as a typewriter: paper feeds up so the line being typed sits on the rail,
// the carriage follows the typing point, each key clacks (+ haptic), a new line dings.
// A hidden TextInput does the real typing (keyboards, Indian-language IMEs, paste); we only draw the paper.
import { SpecialElite_400Regular, useFonts } from '@expo-google-fonts/special-elite';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { prefs } from '@/lib/prefs';
import { color } from '@/lib/theme';
import { groupDigits, keyKind, lastLineChars } from '@/lib/typewriter';

const H = 360; // whole machine
const RAIL = 200; // centre of the rail, in paper coordinates; the current line sits just above it
const FONT = 20;
const LINE = 30;
const PAD = 22;
const CHAR_W = FONT * 0.575; // ponytail: measured advance of Special Elite (web); approx; only used where onTextLayout is missing (web)
const INK = '#2A2521';
const PAPER = '#F1EADB';

const clackSrc = require('../../assets/sounds/clack.wav');
const dingSrc = require('../../assets/sounds/ding.wav');

type Props = { value: string; onChangeText: (t: string) => void; maxLength: number; placeholder: string };

export function Typewriter({ value, onChangeText, maxLength, placeholder }: Props) {
  const [fontLoaded] = useFonts({ SpecialElite_400Regular });
  const reduceMotion = useReducedMotion();
  const input = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);
  const [sound, setSound] = useState(prefs.typewriterSound());
  const [paperW, setPaperW] = useState(0);
  const [nativeLineW, setNativeLineW] = useState<number | null>(null);
  const lastSound = useRef(0);

  const clack = useAudioPlayer(clackSrc); // released automatically on unmount: nothing keeps playing
  const ding = useAudioPlayer(dingSrc);

  const feed = useSharedValue(RAIL - 12 - LINE); // paper offset
  const carriage = useSharedValue(0);
  const jolt = useSharedValue(0);

  // Typing point: right end of the centred last line.
  const lineW = nativeLineW ?? lastLineChars(value, Math.floor((paperW - 2 * PAD) / CHAR_W)) * CHAR_W;
  const x = Math.min(paperW - 30, Math.max(30, (paperW + lineW) / 2));

  useEffect(() => {
    carriage.set(reduceMotion ? x : withTiming(x, { duration: 90 }));
  }, [x, reduceMotion, carriage]);

  function feedback(prev: string, next: string) {
    const k = keyKind(prev, next);
    if (k === 'none') return;
    if (!reduceMotion && k !== 'burst') jolt.set(withSequence(withTiming(k === 'erase' ? -1.5 : 2, { duration: 25 }), withTiming(0, { duration: 70 })));
    if (!sound) return;
    const now = Date.now();
    if (now - lastSound.current < 35) return; // fast typing: don't machine-gun
    lastSound.current = now;
    const p = k === 'newline' ? ding : clack;
    p.seekTo(0);
    p.play();
    if (Platform.OS !== 'web') {
      (k === 'newline' ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light) : Haptics.selectionAsync()).catch(() => {});
    }
  }

  function toggleSound() {
    prefs.setTypewriterSound(!sound);
    setSound(!sound);
  }

  const paperStyle = useAnimatedStyle(() => ({ transform: [{ translateY: feed.value + jolt.value }] }));
  const carriageStyle = useAnimatedStyle(() => ({ transform: [{ translateX: carriage.value - 32 }] }));
  const font = fontLoaded ? 'SpecialElite_400Regular' : Platform.select({ ios: 'Courier', default: 'monospace' });

  return (
    <View style={s.machine}>
      <Pressable
        style={s.paper}
        onPress={() => input.current?.focus()}
        onLayout={(e) => setPaperW(e.nativeEvent.layout.width)}
        accessibilityLabel="Recipe text. Tap to type."
        accessibilityHint={value || undefined}>
        <Specks />
        <Animated.View style={[s.sheet, paperStyle]}>
          <Sheet
            text={value}
            placeholder={placeholder}
            font={font}
            focused={focused}
            onHeight={(h) => feed.set(reduceMotion ? RAIL - 12 - h : withTiming(RAIL - 12 - h, { duration: 140 }))}
            onLastLine={setNativeLineW}
          />
        </Animated.View>

        <View style={s.rail}>
          <View style={[s.cap, { left: 0 }]} />
          <View style={[s.cap, { right: 0 }]} />
        </View>
        <Animated.View style={[s.carriage, carriageStyle]} pointerEvents="none">
          <View style={s.guide} />
          <View style={s.capsule}>
            <View style={s.red}>
              <View style={s.led} />
            </View>
            <View style={s.yellow} />
          </View>
        </Animated.View>

        {!focused && <Text style={[s.hint, { fontFamily: font }]}>{value ? 'Tap to keep typing' : 'Tap the paper to start typing'}</Text>}
        <Pressable onPress={toggleSound} style={s.mute} hitSlop={10} accessibilityRole="button" accessibilityLabel={sound ? 'Mute typewriter sound' : 'Turn on typewriter sound'}>
          <MaterialCommunityIcons name={sound ? 'volume-high' : 'volume-off'} size={26} color={INK} />
        </Pressable>
      </Pressable>

      <Text style={s.counter}>
        {groupDigits(value.length)} / {groupDigits(maxLength)}
      </Text>

      <TextInput
        ref={input}
        style={s.hidden}
        value={value}
        maxLength={maxLength}
        multiline
        caretHidden
        onFocus={() => {
          setFocused(true);
          // typewriter: always type at the end (native TextInput has setSelection; on web it's a DOM textarea)
          const el = input.current as any;
          if (el?.setSelection) el.setSelection(value.length, value.length);
          else el?.setSelectionRange?.(value.length, value.length);
        }}
        onBlur={() => setFocused(false)}
        onChangeText={(t) => {
          feedback(value, t);
          onChangeText(t);
        }}
        accessibilityLabel="Recipe text"
      />
    </View>
  );
}

// The typed text. Memoised so carriage/feed animations never re-render 20k chars.
const Sheet = memo(function Sheet({
  text,
  placeholder,
  font,
  focused,
  onHeight,
  onLastLine,
}: {
  text: string;
  placeholder: string;
  font: string | undefined;
  focused: boolean;
  onHeight: (h: number) => void;
  onLastLine: (w: number) => void;
}) {
  return (
    <Text
      style={[s.text, { fontFamily: font }]}
      onLayout={(e) => onHeight(e.nativeEvent.layout.height)}
      onTextLayout={(e) => {
        const last = e.nativeEvent.lines.at(-1);
        if (last) onLastLine(last.width - CHAR_W); // minus the cursor (always laid out, transparent when unfocused)
      }}>
      {text ? text : <Text style={{ color: '#A89C8C' }}>{placeholder}</Text>}
      <Text style={{ color: focused ? color.accent : 'transparent' }}>_</Text>
    </Text>
  );
});

// Paper grain: fixed pseudo-random ink specks, computed once.
let seed = 11;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const SPECKS = Array.from({ length: 90 }, () => ({ x: `${rnd() * 100}%`, y: `${rnd() * 100}%`, r: rnd() * 1.1 + 0.3, o: rnd() * 0.25 + 0.05 }));

const Specks = memo(function Specks() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      {SPECKS.map((d, i) => (
        <Circle key={i} cx={d.x} cy={d.y} r={d.r} fill={INK} opacity={d.o} />
      ))}
    </Svg>
  );
});

const s = StyleSheet.create({
  machine: { height: H, borderRadius: 22, backgroundColor: '#1E1B18', paddingTop: 30, paddingHorizontal: 12, overflow: 'hidden' },
  paper: { flex: 1, backgroundColor: PAPER, borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden' },
  sheet: { position: 'absolute', top: 0, left: 0, right: 0 },
  text: { fontSize: FONT, lineHeight: LINE, color: INK, textAlign: 'center', paddingHorizontal: PAD },
  rail: { position: 'absolute', top: RAIL - 7, left: 0, right: 0, height: 14, backgroundColor: '#2B2B2E', borderTopWidth: 3, borderTopColor: '#5A5A60' },
  cap: { position: 'absolute', top: -7, width: 14, height: 24, borderRadius: 3, backgroundColor: '#1A1A1C' },
  carriage: { position: 'absolute', top: RAIL - 29, left: 0, width: 64, alignItems: 'center' },
  guide: { width: 3, height: 12, backgroundColor: '#3A3A3E', marginBottom: 2 },
  capsule: { flexDirection: 'row', height: 30, width: 64, borderRadius: 15, overflow: 'hidden', boxShadow: '0 2px 4px rgba(0,0,0,0.35)' },
  red: { flex: 1, backgroundColor: '#C62828', justifyContent: 'center', paddingLeft: 9 },
  led: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#7CFC8A' },
  yellow: { flex: 1, backgroundColor: '#F2B01E' },
  hint: { position: 'absolute', top: RAIL + 22, left: 0, right: 0, textAlign: 'center', color: '#8C8072', fontSize: 16 },
  mute: { position: 'absolute', right: 14, bottom: 12, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  counter: { position: 'absolute', top: 8, right: 20, color: '#A09A94', fontSize: 12, fontFamily: Platform.select({ ios: 'Courier', default: 'monospace' }) },
  hidden: { position: 'absolute', left: 0, bottom: 0, width: 1, height: 1, opacity: 0 },
});
