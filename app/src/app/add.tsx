import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RecipeBody } from '@/components/RecipeBody';
import { type Recipe, RecipeSchema } from '@/lib/recipeSchema';
import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

const LANGUAGES = ['Same as input', 'English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu', 'Bengali'];

export default function AddRecipe() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function parse() {
    if (!text.trim()) return setError('Paste or type the recipe first.');
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('parse-recipe', { body: { text, language } });
    setBusy(false);
    const parsed = RecipeSchema.safeParse(data); // never trust AI output blindly
    if (error || !parsed.success) return setError(error?.message ?? 'The AI reply was not a valid recipe. Try again.');
    setRecipe(parsed.data);
    setServings(parsed.data.base_servings);
  }

  async function save() {
    if (!recipe) return;
    setBusy(true);
    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...recipe, source: 'text', raw_input: text })
      .select('id')
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    router.replace(`/recipe/${data.id}`);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: size.pad, gap: 16 }} keyboardShouldPersistTaps="handled">
      {!recipe ? (
        <>
          <Text style={s.label}>What did Mom (or the video) say?</Text>
          <TextInput
            style={s.input}
            multiline
            value={text}
            onChangeText={(t) => { setText(t); setError(null); }}
            placeholder="e.g. Pehle tel garam karo, jeera daalo, phir pyaaz golden hone tak…"
            placeholderTextColor={color.muted}
            textAlignVertical="top"
          />
          <Text style={s.label}>Show the recipe in</Text>
          <View style={s.chips}>
            {LANGUAGES.map((l) => (
              <Pressable key={l} onPress={() => setLanguage(l)} style={[s.chip, l === language && s.chipOn]}>
                <Text style={[s.chipText, l === language && { color: color.accentText }]}>{l}</Text>
              </Pressable>
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={s.title}>{recipe.title}</Text>
          <RecipeBody recipe={recipe} servings={servings} onServings={setServings} />
        </>
      )}

      {error && <Text style={{ color: color.danger, fontSize: 16 }}>{error}</Text>}

      {busy ? (
        <ActivityIndicator size="large" color={color.accent} />
      ) : recipe ? (
        <View style={{ gap: 10 }}>
          <Btn label="Save recipe" onPress={save} />
          <Btn label="Edit the text again" onPress={() => setRecipe(null)} secondary />
        </View>
      ) : (
        <Btn label="Make it a recipe" onPress={parse} />
      )}
    </ScrollView>
  );
}

function Btn({ label, onPress, secondary }: { label: string; onPress: () => void; secondary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, secondary && s.btnSecondary]}>
      <Text style={[s.btnText, secondary && { color: color.accent }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  label: { fontSize: size.body, fontWeight: '700', color: color.text },
  title: { fontSize: size.title, fontWeight: '800', color: color.text },
  input: { minHeight: 220, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: size.radius, padding: size.pad, fontSize: size.body, color: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, minHeight: 44, justifyContent: 'center', borderRadius: 22, borderWidth: 1, borderColor: color.border, backgroundColor: color.card },
  chipOn: { backgroundColor: color.accent, borderColor: color.accent },
  chipText: { fontSize: 16, color: color.text },
  btn: { minHeight: size.tap, borderRadius: size.radius, backgroundColor: color.accent, alignItems: 'center', justifyContent: 'center' },
  btnSecondary: { backgroundColor: 'transparent', borderWidth: 2, borderColor: color.accent },
  btnText: { color: color.accentText, fontSize: 20, fontWeight: '700' },
});
