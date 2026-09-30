import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { RecipeBody } from '@/components/RecipeBody';
import { Typewriter } from '@/components/Typewriter';
import { Btn, Chip } from '@/components/ui';
import { TEACHERS } from '@/lib/labels';
import { RECIPE_COLUMNS, recipeCache, type SavedRecipe } from '@/lib/recipeCache';
import { type Recipe, RecipeSchema } from '@/lib/recipeSchema';
import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

const OTHER = 'Someone else';
const MAX = 20000;
const PLACEHOLDER = 'e.g. Pehle tel garam karo, jeera daalo, phir pyaaz golden hone tak…';
// The AI takes ~4s: show progress so the wait feels shorter and alive.
const STAGES = ["Reading what Mom said…", 'Putting the steps in order…', 'Working out the timings…', 'Almost done…'];

export default function AddRecipe() {
  const [text, setText] = useState('');
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [teacher, setTeacher] = useState('Mom');
  const [otherName, setOtherName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState(0);
  const [plain, setPlain] = useState(false); // typewriter by default; plain box to fix text in the middle

  useEffect(() => {
    if (!busy || recipe) return;
    const t = setInterval(() => setStage((n) => Math.min(n + 1, STAGES.length - 1)), 1500);
    return () => clearInterval(t);
  }, [busy, recipe]);

  function onText(t: string) {
    setText(t);
    setError(null);
  }

  async function parse() {
    if (!text.trim()) return setError('Paste or type the recipe first.');
    setStage(0);
    setBusy(true);
    setError(null);
    // No language sent: the recipe comes back in the language it was typed in (English / Hindi / Hinglish).
    const { data, error } = await supabase.functions.invoke('parse-recipe', { body: { text } });
    setBusy(false);
    const parsed = RecipeSchema.safeParse(data); // never trust AI output blindly
    if ((error as any)?.context?.status === 429) return setError("You've made 30 recipes in the last day. Please try again tomorrow.");
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
      .select(RECIPE_COLUMNS) // the saved row seeds the cache so the recipe screen opens instantly
      .single();
    setBusy(false);
    if (error) return setError(error.message);
    recipeCache.set(data as SavedRecipe);
    router.replace(`/recipe/${data.id}`);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: size.pad, gap: 16 }} keyboardShouldPersistTaps="handled">
      {!recipe ? (
        <>
          <Text style={s.label}>What did Mom (or the video) say?</Text>
          {plain ? (
            <TextInput
              style={s.input}
              multiline
              maxLength={MAX}
              value={text}
              onChangeText={onText}
              placeholder={PLACEHOLDER}
              placeholderTextColor={color.muted}
              textAlignVertical="top"
            />
          ) : (
            <Typewriter value={text} onChangeText={onText} maxLength={MAX} placeholder={PLACEHOLDER} />
          )}
          <Pressable onPress={() => setPlain((p) => !p)} style={s.switch} accessibilityRole="button">
            <Text style={s.switchText}>{plain ? 'Use the typewriter' : 'Edit normally'}</Text>
          </Pressable>
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
          <Text style={{ color: color.muted }}>{recipe ? 'Saving…' : STAGES[stage]}</Text>
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
  switch: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4, marginTop: -8 },
  switchText: { color: color.accent, fontSize: 16, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  teacherBox: { gap: 10, backgroundColor: color.soft, borderRadius: size.radius, padding: size.pad },
});
