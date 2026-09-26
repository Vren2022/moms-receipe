// Fix what the AI got wrong: title, ingredient amounts/names, prep and steps. Validated with the same zod schema as AI output.
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Btn } from '@/components/ui';
import { type Recipe, RecipeSchema } from '@/lib/recipeSchema';
import { color, size } from '@/lib/theme';

type Props = { recipe: Recipe; onSave: (r: Recipe) => Promise<void> | void; onCancel: () => void };

export function RecipeEditor({ recipe, onSave, onCancel }: Props) {
  const [title, setTitle] = useState(recipe.title);
  // qty kept as text while typing ("1.", "") and parsed on save.
  const [ingredients, setIngredients] = useState(recipe.ingredients.map((i) => ({ ...i, qtyText: i.qty == null ? '' : String(i.qty) })));
  const [prep, setPrep] = useState(recipe.prep);
  const [steps, setSteps] = useState(recipe.steps);
  const [error, setError] = useState<string | null>(null);

  function save() {
    const bad = ingredients.find((i) => i.qtyText.trim() && !(Number(i.qtyText.replace(',', '.')) > 0));
    if (bad) return setError(`Amount for "${bad.name || 'ingredient'}" must be a number, or empty`);
    const parsed = RecipeSchema.safeParse({
      ...recipe,
      title: title.trim(),
      ingredients: ingredients.map(({ qtyText, ...i }) => ({ ...i, name: i.name.trim(), qty: qtyText.trim() ? Number(qtyText.replace(',', '.')) : null })),
      prep: prep.map((p) => ({ text: p.text.trim() })).filter((p) => p.text),
      steps: steps.map((s) => ({ ...s, text: s.text.trim() })).filter((s) => s.text),
    });
    if (!parsed.success) {
      const path = parsed.error.issues[0]?.path[0];
      return setError(
        path === 'title' ? 'Give the recipe a name' : path === 'steps' ? 'Keep at least one step' : path === 'ingredients' ? 'Every ingredient needs a name (and keep at least one)' : 'Please check the fields',
      );
    }
    setError(null);
    onSave(parsed.data);
  }

  return (
    <View style={{ gap: 20 }}>
      <Field label="Recipe name">
        <TextInput style={s.input} value={title} onChangeText={setTitle} />
      </Field>

      <Field label="Ingredients (amount for the original servings)">
        {ingredients.map((i, n) => (
          <View key={n} style={s.row}>
            <TextInput
              style={[s.input, { width: 64 }]}
              value={i.qtyText}
              onChangeText={(t) => setIngredients((xs) => xs.map((x, k) => (k === n ? { ...x, qtyText: t } : x)))}
              keyboardType="decimal-pad"
              placeholder="qty"
              placeholderTextColor={color.muted}
            />
            <TextInput
              style={[s.input, { width: 64 }]}
              value={i.unit}
              onChangeText={(t) => setIngredients((xs) => xs.map((x, k) => (k === n ? { ...x, unit: t } : x)))}
              placeholder="unit"
              placeholderTextColor={color.muted}
              autoCapitalize="none"
            />
            <TextInput
              style={[s.input, { flex: 1 }]}
              value={i.name}
              onChangeText={(t) => setIngredients((xs) => xs.map((x, k) => (k === n ? { ...x, name: t } : x)))}
              placeholder="ingredient"
              placeholderTextColor={color.muted}
            />
            <Remove onPress={() => setIngredients((xs) => xs.filter((_, k) => k !== n))} />
          </View>
        ))}
        <Add label="Add ingredient" onPress={() => setIngredients((xs) => [...xs, { name: '', qty: null, qtyText: '', unit: '', scale: 'linear' }])} />
      </Field>

      <Field label="Before you start">
        {prep.map((p, n) => (
          <View key={n} style={s.row}>
            <TextInput style={[s.input, s.multi]} multiline value={p.text} onChangeText={(t) => setPrep((xs) => xs.map((x, k) => (k === n ? { text: t } : x)))} />
            <Remove onPress={() => setPrep((xs) => xs.filter((_, k) => k !== n))} />
          </View>
        ))}
        <Add label="Add prep" onPress={() => setPrep((xs) => [...xs, { text: '' }])} />
      </Field>

      <Field label="Steps">
        {steps.map((st, n) => (
          <View key={n} style={s.row}>
            <Text style={s.num}>{n + 1}</Text>
            <TextInput style={[s.input, s.multi]} multiline value={st.text} onChangeText={(t) => setSteps((xs) => xs.map((x, k) => (k === n ? { ...x, text: t } : x)))} />
            <Remove onPress={() => setSteps((xs) => xs.filter((_, k) => k !== n))} />
          </View>
        ))}
        <Add label="Add step" onPress={() => setSteps((xs) => [...xs, { text: '' }])} />
      </Field>

      {error && <Text style={{ color: color.danger, fontSize: 16 }}>{error}</Text>}
      <Btn label="Save changes" onPress={save} />
      <Btn label="Cancel" onPress={onCancel} secondary />
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      {children}
    </View>
  );
}

function Remove({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={s.icon} accessibilityRole="button" accessibilityLabel="Remove">
      <MaterialCommunityIcons name="close-circle-outline" size={26} color={color.muted} />
    </Pressable>
  );
}

function Add({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={s.add} accessibilityRole="button">
      <MaterialCommunityIcons name="plus" size={22} color={color.accent} />
      <Text style={s.addText}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  label: { fontSize: size.body, fontWeight: '700', color: color.text },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  input: { minHeight: 48, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: 10, paddingHorizontal: 10, fontSize: size.body, color: color.text },
  multi: { flex: 1, paddingVertical: 10 },
  num: { width: 22, fontSize: size.body, fontWeight: '700', color: color.accent, textAlign: 'center' },
  icon: { width: 36, height: 48, alignItems: 'center', justifyContent: 'center' },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44 },
  addText: { fontSize: 16, color: color.accent, fontWeight: '600' },
});
