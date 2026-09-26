import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RecipeBody } from '@/components/RecipeBody';
import { Btn, Chip } from '@/components/ui';
import { LANGUAGES, TEACHERS } from '@/lib/labels';
import { prefs } from '@/lib/prefs';
import { type Recipe, RecipeSchema } from '@/lib/recipeSchema';
import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

const OTHER = 'Someone else';

export default function AddRecipe() {
  const [text, setText] = useState('');
  const [language, setLanguage] = useState(prefs.language());
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [teacher, setTeacher] = useState('Mom');
  const [otherName, setOtherName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function parse() {
    if (!text.trim()) return setError('Paste or type the recipe first.');
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.functions.invoke('parse-recipe', { body: { text, language } });
    setBusy(false);
    const parsed = RecipeSchema.safeParse(data); // never trust AI output blindly
    if (error || !parsed.success) return setError(error ? 'Could not reach the recipe helper. Check your internet and try again.' : 'The AI reply was not a valid recipe. Try again.');
    setRecipe(parsed.data);
    setServings(parsed.data.base_servings);
  }

  async function save() {
    if (!recipe) return;
    const taught_by = teacher === OTHER ? otherName.trim() : teacher;
    if (!taught_by) return setError('Type who taught you this recipe.');
    setBusy(true);
    const { data, error } = await supabase
      .from('recipes')
      .insert({ ...recipe, source: 'text', raw_input: text, taught_by })
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
            onChangeText={(t) => {
              setText(t);
              setError(null);
            }}
            placeholder="e.g. Pehle tel garam karo, jeera daalo, phir pyaaz golden hone tak…"
            placeholderTextColor={color.muted}
            textAlignVertical="top"
          />
          <Text style={s.label}>Show the recipe in</Text>
          <View style={s.chips}>
            {LANGUAGES.map((l) => (
              <Chip key={l} label={l} on={l === language} onPress={() => setLanguage(l)} />
            ))}
          </View>
        </>
      ) : (
        <>
          <Text style={s.title}>{recipe.title}</Text>
          <RecipeBody recipe={recipe} servings={servings} onServings={setServings} />
          <View style={s.teacherBox}>
            <Text style={s.label}>Who taught you this?</Text>
            <View style={s.chips}>
              {[...TEACHERS, OTHER].map((t) => (
                <Chip key={t} label={t} on={t === teacher} onPress={() => setTeacher(t)} />
              ))}
            </View>
            {teacher === OTHER && (
              <TextInput
                style={s.nameInput}
                value={otherName}
                onChangeText={(t) => {
                  setOtherName(t);
                  setError(null);
                }}
                placeholder="e.g. Masi, Neighbour aunty"
                placeholderTextColor={color.muted}
                autoFocus
              />
            )}
          </View>
        </>
      )}

      {error && <Text style={{ color: color.danger, fontSize: 16 }}>{error}</Text>}

      {busy ? (
        <View style={{ alignItems: 'center', gap: 8 }}>
          <ActivityIndicator size="large" color={color.accent} />
          <Text style={{ color: color.muted }}>{recipe ? 'Saving…' : 'Turning it into steps…'}</Text>
        </View>
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

const s = StyleSheet.create({
  label: { fontSize: size.body, fontWeight: '700', color: color.text },
  title: { fontSize: size.title, fontWeight: '800', color: color.text },
  input: { minHeight: 220, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: size.radius, padding: size.pad, fontSize: size.body, color: color.text },
  nameInput: { minHeight: 50, backgroundColor: color.card, borderWidth: 1, borderColor: color.border, borderRadius: size.radius, paddingHorizontal: size.pad, fontSize: size.body, color: color.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teacherBox: { gap: 10, backgroundColor: color.soft, borderRadius: size.radius, padding: size.pad },
});
