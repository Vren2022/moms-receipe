// "Aaj main banaunga!" — a frame-by-frame flipbook using every pose from the owner's character sheet.
// Son's frames play in a kitchen panel; Maa's frames play inside a phone (live video call).
import { useEffect, useState } from 'react';
import { Image, type ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, ZoomIn } from 'react-native-reanimated';
import Svg, { Line, Rect } from 'react-native-svg';

import { CookingTogether } from '@/components/CookingTogether';
import { color } from '@/lib/theme';

const img = {
  maaFront: require('@/assets/images/characters/maa-front.png'),
  maaSide: require('@/assets/images/characters/maa-side.png'),
  maaThreeQuarter: require('@/assets/images/characters/maa-three-quarter.png'),
  maaSmile: require('@/assets/images/characters/maa-smile.png'),
  maaThinking: require('@/assets/images/characters/maa-thinking.png'),
  maaConcerned: require('@/assets/images/characters/maa-concerned.png'),
  maaCheer: require('@/assets/images/characters/maa-cheer.png'),
  sonFront: require('@/assets/images/characters/son-front.png'),
  sonSide: require('@/assets/images/characters/son-side.png'),
  sonWalking: require('@/assets/images/characters/son-walking.png'),
  sonHappy: require('@/assets/images/characters/son-happy.png'),
  sonThinking: require('@/assets/images/characters/son-thinking.png'),
  sonConfused: require('@/assets/images/characters/son-confused.png'),
  sonJumping: require('@/assets/images/characters/son-jumping.png'),
};

type Frame =
  | { kind: 'son'; pose: ImageSourcePropType; full?: boolean; line: string }
  | { kind: 'maa'; pose: ImageSourcePropType; full?: boolean; line: string }
  | { kind: 'cooking' }
  | { kind: 'finale'; line: string };

export const FRAMES: Frame[] = [
  { kind: 'son', pose: img.sonWalking, full: true, line: 'Aaj khana main banaunga!' },
  { kind: 'son', pose: img.sonSide, full: true, line: 'Hmm… aloo gobi.' },
  { kind: 'son', pose: img.sonConfused, line: 'Par shuru kahan se karun?' },
  { kind: 'son', pose: img.sonThinking, line: 'Maa ko call karta hoon!' },
  { kind: 'maa', pose: img.maaSide, full: true, line: 'Haan beta?' },
  { kind: 'maa', pose: img.maaFront, full: true, line: 'Main hoon na, bata kya banana hai?' },
  { kind: 'maa', pose: img.maaThinking, line: 'Pehle tel garam kar, phir jeera…' },
  { kind: 'cooking' },
  { kind: 'maa', pose: img.maaConcerned, line: 'Aanch dheemi kar, jal jayega!' },
  { kind: 'maa', pose: img.maaThreeQuarter, full: true, line: 'Shabash! Ab 15 minute pakne de.' },
  { kind: 'son', pose: img.sonFront, full: true, line: 'Ho gaya, Maa!' },
  { kind: 'finale', line: 'Wah mera beta!' },
];

const FRAME_MS = 1500;
const COOKING_MS = 3200; // the cooking scene has its own animations; give it longer
const FINALE_MS = 2500;
/** Rough total, for the welcome's progress bar. The flipbook itself calls onDone when it really ends. */
export const STORY_MS = (FRAMES.length - 2) * FRAME_MS + COOKING_MS + FINALE_MS;

export function StoryFlipbook({ onDone }: { onDone?: () => void }) {
  const [i, setI] = useState(0);
  const frame = FRAMES[i];
  const last = i === FRAMES.length - 1;

  useEffect(() => {
    const t = setTimeout(() => (last ? onDone?.() : setI(i + 1)), last ? FINALE_MS : frame.kind === 'cooking' ? COOKING_MS : FRAME_MS);
    return () => clearTimeout(t);
  }, [i, last, frame.kind, onDone]);

  return (
    <View style={s.stage}>
      {/* warm every pose so frames don't blink in on first show (matters on web) */}
      <View style={s.preload} pointerEvents="none">
        {Object.values(img).map((src, n) => (
          <Image key={n} source={src} style={{ width: 1, height: 1 }} />
        ))}
      </View>

      <Animated.View key={i} entering={FadeIn.duration(220)} style={StyleSheet.absoluteFill}>
        {frame.kind === 'son' && <SonPanel pose={frame.pose} full={frame.full} />}
        {frame.kind === 'maa' && <MaaPanel pose={frame.pose} full={frame.full} />}
        {frame.kind === 'cooking' && (
          <View style={s.cookingWrap}>
            <CookingTogether />
          </View>
        )}
        {frame.kind === 'finale' && <Finale />}

        {'line' in frame && (
          <Animated.View
            entering={FadeInUp.delay(120).duration(260)}
            style={[s.bubble, frame.kind === 'son' ? s.sonBubble : s.maaBubble]}>
            <Text style={[s.bubbleText, frame.kind === 'son' && { color: color.accentText }]}>{frame.line}</Text>
          </Animated.View>
        )}
      </Animated.View>

      <Text style={s.counter}>{`${i + 1}/${FRAMES.length}`}</Text>
    </View>
  );
}

function Kitchen() {
  return (
    <Svg style={StyleSheet.absoluteFill} viewBox="0 0 320 300" preserveAspectRatio="none">
      <Rect x={0} y={0} width={320} height={300} rx={20} fill="#FAEEDA" />
      <Rect x={220} y={70} width={70} height={56} rx={6} fill="#FFF8F0" stroke="#E7D8CB" strokeWidth={3} />
      <Line x1={255} y1={70} x2={255} y2={126} stroke="#E7D8CB" strokeWidth={3} />
      <Line x1={220} y1={98} x2={290} y2={98} stroke="#E7D8CB" strokeWidth={3} />
      <Rect x={20} y={80} width={14} height={18} rx={3} fill="#EF9F27" />
      <Rect x={38} y={84} width={12} height={14} rx={3} fill="#C2410C" />
      <Rect x={14} y={98} width={42} height={4} rx={2} fill="#854F0B" />
      <Rect x={0} y={262} width={320} height={38} fill="#E7D8CB" />
    </Svg>
  );
}

function SonPanel({ pose, full }: { pose: ImageSourcePropType; full?: boolean }) {
  return (
    <View style={s.panel}>
      <Kitchen />
      <Animated.Image entering={ZoomIn.duration(260)} source={pose} resizeMode="contain" style={full ? s.fullBody : s.bust} />
    </View>
  );
}

function MaaPanel({ pose, full }: { pose: ImageSourcePropType; full?: boolean }) {
  return (
    <View style={[s.panel, { backgroundColor: color.soft }]}>
      <View style={s.phone}>
        <View style={s.phoneScreen}>
          <Animated.Image entering={ZoomIn.duration(260)} source={pose} resizeMode="contain" style={full ? s.phoneFull : s.phoneBust} />
          <View style={s.live}>
            <Text style={s.liveText}>LIVE · Maa</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function Finale() {
  return (
    <View style={s.panel}>
      <Kitchen />
      <Animated.Image entering={ZoomIn.duration(300)} source={img.sonJumping} resizeMode="contain" style={s.finaleSon} />
      <View style={[s.phone, s.finalePhone]}>
        <View style={s.phoneScreen}>
          <Animated.Image entering={ZoomIn.delay(150).duration(300)} source={img.maaCheer} resizeMode="contain" style={s.phoneBust} />
          <View style={s.live}>
            <Text style={s.liveText}>LIVE · Maa</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  stage: { width: '100%', aspectRatio: 320 / 300, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FAEEDA' },
  preload: { position: 'absolute', opacity: 0, width: 1, height: 1, overflow: 'hidden' },
  panel: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  fullBody: { height: '86%', aspectRatio: 0.45, marginBottom: '2%' },
  bust: { height: '66%', aspectRatio: 0.66 },
  cookingWrap: { flex: 1, justifyContent: 'flex-end' },
  phone: { width: '48%', height: '72%', backgroundColor: '#1F1A17', borderRadius: 22, padding: 6, marginBottom: '3%' },
  phoneScreen: { flex: 1, borderRadius: 16, overflow: 'hidden', backgroundColor: '#DCEAF7', alignItems: 'center', justifyContent: 'flex-end' },
  phoneFull: { height: '92%', aspectRatio: 0.38 },
  phoneBust: { width: '100%', height: '78%' },
  live: { position: 'absolute', top: 8, left: 8, backgroundColor: '#E24B4A', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 },
  liveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  finaleSon: { position: 'absolute', left: '2%', bottom: '4%', width: '48%', height: '72%' },
  finalePhone: { position: 'absolute', right: '4%', bottom: '1%', width: '40%', height: '66%' },
  bubble: { position: 'absolute', top: 12, maxWidth: '78%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  sonBubble: { left: 12, backgroundColor: color.accent, borderBottomLeftRadius: 4 },
  maaBubble: { right: 12, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderBottomRightRadius: 4 },
  bubbleText: { fontSize: 16, fontWeight: '700', color: color.text },
  counter: { position: 'absolute', bottom: 8, right: 12, fontSize: 11, color: color.muted },
});
