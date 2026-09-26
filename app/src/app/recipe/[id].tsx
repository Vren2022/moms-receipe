import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { RecipeBody } from '@/components/RecipeBody';
import { RecipeEditor } from '@/components/RecipeEditor';
import { Btn, Chip, VegDot } from '@/components/ui';
import { CATEGORY_LABEL, timeAgo, totalMinutes } from '@/lib/labels';
import type { Recipe } from '@/lib/recipeSchema';
import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

type Saved = Recipe & { taught_by: string | null; is_favorite: boolean; last_cooked_at: string | null; notes: string | null };

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Saved | null>(null);
  const [servings, setServings] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loaded = useRef(false);

  // Reload on focus: cook mode's Finish updates notes + last_cooked_at.
  useFocusEffect(
    useCallback(() => {
    supabase
      .from('recipes')
      .select('title, category, is_veg, base_servings, language, ingredients, prep, steps, taught_by, is_favorite, last_cooked_at, notes')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setRecipe(data as Saved); // validated with zod before insert
        if (!loaded.current) setServings(data.base_servings); // first load only; keep the user's servings on return
        loaded.current = true;
      });
    }, [id]),
  );

  async function update(patch: Partial<Saved>) {
    const before = recipe;
    setRecipe((r) => r && { ...r, ...patch });
    const { error } = await supabase.from('recipes').update(patch).eq('id', id);
    if (error) {
      setError(error.message);
      setRecipe(before);
    }
  }

  async function remove() {
    if (!confirmDelete) return setConfirmDelete(true);
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) return setError(error.message);
    router.back();
  }

  if (error && !recipe) return <Text style={{ color: color.danger, padding: size.pad }}>{error}</Text>;
  if (!recipe) return <ActivityIndicator size="large" color={color.accent} style={{ marginTop: 40 }} />;

  const mins = totalMinutes(recipe.steps);
  const cookedToday = recipe.last_cooked_at && timeAgo(recipe.last_cooked_at) === 'today';

  return (
    <ScrollView contentContainerStyle={{ padding: size.pad, gap: 16 }}>
      {/* A failed update (e.g. offline) is a banner, not a blank screen. */}
      {error && (
        <Pressable onPress={() => setError(null)} accessibilityRole="button">
          <Text style={{ color: color.danger, fontSize: 16 }}>{error} (tap to dismiss)</Text>
        </Pressable>
      )}
      <Stack.Screen
        options={{
          title: editing ? 'Edit recipe' : '',
          headerRight: () =>
            editing ? null : (
              <View style={{ flexDirection: 'row', gap: 20 }}>
                <Pressable onPress={() => setEditing(true)} hitSlop={12} accessibilityLabel="Edit recipe">
                  <MaterialCommunityIcons name="pencil-outline" size={28} color={color.accent} />
                </Pressable>
                <Pressable onPress={() => update({ is_favorite: !recipe.is_favorite })} hitSlop={12} accessibilityLabel={recipe.is_favorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <MaterialCommunityIcons name={recipe.is_favorite ? 'heart' : 'heart-outline'} size={28} color={color.accent} />
                </Pressable>
              </View>
            ),
        }}
      />
      {editing ? (
        <RecipeEditor
          recipe={recipe}
          onCancel={() => setEditing(false)}
          onSave={async ({ title, ingredients, prep, steps }) => {
            await update({ title, ingredients, prep, steps });
            setEditing(false);
          }}
        />
      ) : (
        <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <VegDot veg={recipe.is_veg} />
          <Text style={{ fontSize: size.title, fontWeight: '800', color: color.text, flexShrink: 1 }}>{recipe.title}</Text>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {recipe.taught_by && <Chip label={`From ${recipe.taught_by}`} />}
          {recipe.category && <Chip label={CATEGORY_LABEL[recipe.category] ?? recipe.category} />}
          {mins && <Chip label={`${mins} min`} />}
        </View>
        <RecipeBody recipe={recipe} servings={servings} onServings={setServings} />
        {!!recipe.notes && (
          <View style={{ backgroundColor: color.soft, borderRadius: size.radius, padding: size.pad, gap: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: color.softText }}>Notes for next time</Text>
            <Text style={{ fontSize: size.body, color: color.text }}>{recipe.notes}</Text>
          </View>
        )}
        <View style={{ gap: 10, marginTop: 8 }}>
          <Btn label="Start cooking" onPress={() => router.push({ pathname: '/cook/[id]', params: { id, servings: String(servings) } })} />
          <Btn label={cookedToday ? 'Cooked today ✓' : 'I cooked this'} onPress={() => update({ last_cooked_at: new Date().toISOString() })} secondary />
          {recipe.last_cooked_at && !cookedToday && (
            <Text style={{ textAlign: 'center', color: color.muted }}>Last cooked {timeAgo(recipe.last_cooked_at)}</Text>
          )}
        </View>
          <View style={{ gap: 6, marginTop: 24 }}>
            {confirmDelete && <Text style={{ textAlign: 'center', color: color.danger, fontSize: 16 }}>Delete this recipe forever? Tap again to confirm.</Text>}
            <Pressable onPress={remove} style={{ minHeight: 48, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button">
              <Text style={{ color: color.danger, fontSize: 17, fontWeight: '600' }}>{confirmDelete ? 'Yes, delete it' : 'Delete recipe'}</Text>
            </Pressable>
          </View>
        </>
      )}
    </ScrollView>
  );
}
