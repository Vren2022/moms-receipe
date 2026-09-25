import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Recipe } from '@/lib/recipeSchema';
import { formatQty, scaleQty } from '@/lib/scale';
import { color, size } from '@/lib/theme';

type Props = { recipe: Recipe; servings: number; onServings: (n: number) => void };

export function RecipeBody({ recipe, servings, onServings }: Props) {
  const factor = servings / recipe.base_servings;
  return (
    <View style={{ gap: 24 }}>
      <View style={s.stepper}>
        <Pressable style={s.stepBtn} onPress={() => onServings(Math.max(1, servings - 1))} accessibilityLabel="Fewer people">
          <Text style={s.stepBtnText}>−</Text>
        </Pressable>
        <Text style={s.servings}>{servings} {servings === 1 ? 'person' : 'people'}</Text>
        <Pressable style={s.stepBtn} onPress={() => onServings(servings + 1)} accessibilityLabel="More people">
          <Text style={s.stepBtnText}>+</Text>
        </Pressable>
      </View>

      <Section title="Ingredients">
        {recipe.ingredients.map((i, n) => {
          const q = formatQty(scaleQty(i.qty, i.scale, factor));
          return (
            <Text key={n} style={s.row}>
              <Text style={s.qty}>{q ? `${q} ${i.unit} ` : ''}</Text>
              {i.name}
              {i.scale === 'to_taste' && factor !== 1 ? <Text style={s.muted}>  (to taste, start here)</Text> : null}
            </Text>
          );
        })}
      </Section>

      {recipe.prep.length > 0 && (
        <Section title="Before you start">
          {recipe.prep.map((p, n) => (
            <Text key={n} style={s.row}>• {p.text}</Text>
          ))}
        </Section>
      )}

      <Section title="Steps">
        {recipe.steps.map((st, n) => (
          <View key={n} style={s.step}>
            <Text style={s.stepNum}>{n + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.row}>{st.text}</Text>
              {(st.duration_sec || st.heat) && (
                <Text style={s.muted}>
                  {[st.duration_sec ? fmtTime(st.duration_sec) : null, st.heat ? `${st.heat} heat` : null].filter(Boolean).join(' · ')}
                </Text>
              )}
            </View>
          </View>
        ))}
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 10 }}>
      <Text style={s.h2}>{title}</Text>
      {children}
    </View>
  );
}

function fmtTime(sec: number) {
  return sec < 60 ? `${sec} sec` : `${Math.round(sec / 60)} min`;
}

const s = StyleSheet.create({
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: color.card, borderRadius: size.radius, borderWidth: 1, borderColor: color.border, padding: 8 },
  stepBtn: { width: size.tap, height: size.tap, borderRadius: size.radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { color: color.accentText, fontSize: 30, fontWeight: '700' },
  servings: { fontSize: 22, fontWeight: '700', color: color.text },
  h2: { fontSize: 22, fontWeight: '700', color: color.text },
  row: { fontSize: size.body, color: color.text, lineHeight: 26 },
  qty: { fontWeight: '700', color: color.accent },
  muted: { fontSize: 15, color: color.muted },
  step: { flexDirection: 'row', gap: 12 },
  stepNum: { fontSize: size.body, fontWeight: '700', color: color.accent, width: 24 },
});
