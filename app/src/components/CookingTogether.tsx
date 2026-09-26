// Cartoon kitchen: son stirs a kadhai while Maa watches live on a phone propped on the counter.
// Characters are cut from the owner's character sheet (assets/images/characters). Layers, back to front:
// wall SVG → son → counter/stove/kadhai/phone SVG → Maa on the phone screen → stirring arm, steam, bubble, timer.
// All layers share one 320x260 coordinate space; overlays are positioned in % of it.
import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';

import { color } from '@/lib/theme';

const SHIRT = '#5AAA6D'; // sampled from son-happy.png
const SKIN = '#E0906D';

// scene units (320x260) -> % for absolutely positioned overlays
const box = (x: number, y: number, w: number, h: number) =>
  ({ position: 'absolute', left: `${(x / 320) * 100}%`, top: `${(y / 260) * 100}%`, width: `${(w / 320) * 100}%`, height: `${(h / 260) * 100}%` }) as const;

export function CookingTogether() {
  return (
    <View style={s.frame} accessibilityLabel="Cartoon: a boy cooking at the stove while his mother watches on a live video call">
      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 320 260">
        <Rect x={0} y={0} width={320} height={260} rx={20} fill="#FAEEDA" />
        <Rect x={16} y={20} width={50} height={42} rx={6} fill="#FFF8F0" stroke="#E7D8CB" strokeWidth={3} />
        <Line x1={41} y1={20} x2={41} y2={62} stroke="#E7D8CB" strokeWidth={3} />
        <Line x1={16} y1={41} x2={66} y2={41} stroke="#E7D8CB" strokeWidth={3} />
        <Rect x={172} y={24} width={12} height={16} rx={3} fill="#EF9F27" />
        <Rect x={188} y={28} width={10} height={12} rx={3} fill="#C2410C" />
        <Rect x={166} y={40} width={38} height={4} rx={2} fill="#854F0B" />
      </Svg>

      <Image source={require('@/assets/images/characters/son-happy.png')} style={box(55, 37, 100, 155)} resizeMode="contain" />

      <Svg style={StyleSheet.absoluteFill} viewBox="0 0 320 260">
        <Path d="M0 186 H320 V240 Q320 260 300 260 H20 Q0 260 0 240 Z" fill="#BA7517" />
        <Rect x={0} y={184} width={320} height={7} fill="#854F0B" />
        <Rect x={50} y={172} width={110} height={12} rx={3} fill="#444441" />
        <Path d="M82 172 q-5 -7 0 -13 q5 6 0 13 Z" fill="#EF9F27" />
        <Path d="M105 172 q-5 -7 0 -13 q5 6 0 13 Z" fill="#EF9F27" />
        <Path d="M128 172 q-5 -7 0 -13 q5 6 0 13 Z" fill="#EF9F27" />
        <Path d="M62 146 H148 Q144 170 105 170 Q66 170 62 146 Z" fill="#2C2C2A" />
        <Circle cx={57} cy={148} r={5} stroke="#2C2C2A" strokeWidth={3} fill="none" />
        <Circle cx={153} cy={148} r={5} stroke="#2C2C2A" strokeWidth={3} fill="none" />
        <Ellipse cx={105} cy={147} rx={40} ry={4} fill="#EF9F27" />
        {/* phone on a stand; Maa is drawn on its screen by the overlay below */}
        <Path d="M232 190 L244 172 L256 190 Z" fill="#444441" />
        <Rect x={206} y={84} width={76} height={102} rx={11} fill="#1F1A17" />
      </Svg>

      <View style={[box(211, 90, 66, 90), s.screen]}>
        <Image source={require('@/assets/images/characters/maa-smile.png')} style={s.maa} resizeMode="cover" />
        <View style={s.live}>
          <Text style={s.liveText}>LIVE</Text>
        </View>
      </View>

      <StirringArm />
      {/* steam at the kadhai's edges, so it doesn't cross his face */}
      <Steam left="17%" delay={0} />
      <Steam left="44%" delay={700} />
      <Steam left="20%" delay={1400} />

      <Animated.View entering={FadeInDown.delay(900).duration(500)} style={s.bubble}>
        <Text style={s.bubbleText}>Bas beta, ab dhak de!</Text>
        <View style={s.bubbleTail} />
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(1600).duration(500)} style={s.timer}>
        <Text style={s.timerStep}>Step 5 · Cover & cook</Text>
        <Countdown from={15 * 60} />
      </Animated.View>
    </View>
  );
}

// Right arm + ladle, rocking around the shoulder (146,152).
function StirringArm() {
  const reduce = useReducedMotion();
  const r = useSharedValue(-5);
  useEffect(() => {
    if (!reduce) r.value = withRepeat(withTiming(7, { duration: 700 }), -1, true);
  }, [reduce, r]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.value}deg` }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: '45.6% 58.5%' }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 320 260">
        <Line x1={146} y1={152} x2={122} y2={145} stroke={SHIRT} strokeWidth={13} strokeLinecap="round" />
        <Circle cx={119} cy={145} r={6.5} fill={SKIN} />
        <Line x1={119} y1={145} x2={104} y2={160} stroke="#854F0B" strokeWidth={4} strokeLinecap="round" />
        <Ellipse cx={101} cy={162} rx={7} ry={3.5} fill="#854F0B" />
      </Svg>
    </Animated.View>
  );
}

function Steam({ left, delay }: { left: `${number}%`; delay: number }) {
  const reduce = useReducedMotion();
  const p = useSharedValue(reduce ? 0.5 : 0);
  useEffect(() => {
    if (!reduce) p.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2100 }), -1, false));
  }, [reduce, delay, p]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.sin(Math.PI * p.value) * 0.9,
    transform: [{ translateY: -26 * p.value }],
  }));
  return (
    <Animated.View style={[s.steam, { left }, style]} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 12 30">
        <Path d="M6 28 Q1 21 6 15 Q11 9 6 2" stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

function Countdown({ from }: { from: number }) {
  const [left, setLeft] = useState(from);
  useEffect(() => {
    const t = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(t);
  }, []);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');
  return <Text style={s.timerTime}>{`${mm}:${ss}`}</Text>;
}

const s = StyleSheet.create({
  frame: { width: '100%', aspectRatio: 320 / 260, alignSelf: 'center' },
  screen: { borderRadius: 7, overflow: 'hidden', backgroundColor: '#DCEAF7' },
  maa: { position: 'absolute', left: '-4%', top: '6%', width: '108%', height: '124%' },
  live: { position: 'absolute', top: 5, left: 5, backgroundColor: '#E24B4A', borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
  liveText: { color: '#FFFFFF', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
  steam: { position: 'absolute', top: '42%', width: '4%', height: '12%' },
  bubble: { position: 'absolute', top: '4%', right: '2%', maxWidth: '52%', backgroundColor: color.card, borderRadius: 14, borderWidth: 1, borderColor: color.border, paddingHorizontal: 10, paddingVertical: 7 },
  bubbleText: { fontSize: 14, color: color.text, fontWeight: '600' },
  bubbleTail: { position: 'absolute', bottom: -6, right: 28, width: 12, height: 12, backgroundColor: color.card, borderRightWidth: 1, borderBottomWidth: 1, borderColor: color.border, transform: [{ rotate: '45deg' }] },
  timer: { position: 'absolute', bottom: '5%', left: '4%', backgroundColor: color.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1, borderColor: color.border },
  timerStep: { fontSize: 11, color: color.muted },
  timerTime: { fontSize: 18, fontWeight: '800', color: color.accent, fontVariant: ['tabular-nums'] },
});
