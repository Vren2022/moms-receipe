// Small shared UI pieces used across screens.
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { color, size } from '@/lib/theme';

export function Btn({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, secondary && s.btnSecondary]} accessibilityRole="button">
      <Text style={[s.btnText, secondary && { color: color.accent }]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.chip, on && s.chipOn]} accessibilityState={{ selected: on }}>
      <Text style={[s.chipText, on && { color: color.accentText }]}>{label}</Text>
    </Pressable>
  );
}

// Indian food-label convention: green square = veg, red = non-veg.
export function VegDot({ veg }: { veg: boolean | null | undefined }) {
  if (veg == null) return null;
  const c = veg ? color.veg : color.nonVeg;
  return (
    <View style={[s.vegBox, { borderColor: c }]} accessibilityLabel={veg ? 'Vegetarian' : 'Non-vegetarian'}>
      <View style={[s.vegDot, { backgroundColor: c }]} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: { minHeight: size.tap, borderRadius: size.radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: color.accent },
  btnText: { color: color.accentText, fontSize: 20, fontWeight: '700' },
  chip: { paddingHorizontal: 14, minHeight: 40, justifyContent: 'center', borderRadius: 20, borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  chipOn: { backgroundColor: color.accent, borderColor: color.accent },
  chipText: { fontSize: 16, color: color.text },
  vegBox: { width: 16, height: 16, borderWidth: 2, borderRadius: 3, alignItems: 'center', justifyContent: 'center' },
  vegDot: { width: 7, height: 7, borderRadius: 4 },
});
