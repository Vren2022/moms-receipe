import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text } from 'react-native';

import { RecipeBody } from '@/components/RecipeBody';
import type { Recipe } from '@/lib/recipeSchema';
import { supabase } from '@/lib/supabase';
import { color, size } from '@/lib/theme';

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(2);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('recipes')
      .select('title, base_servings, language, ingredients, prep, steps')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (error) return setError(error.message);
        setRecipe(data as Recipe); // validated with zod before insert
        setServings(data.base_servings);
      });
  }, [id]);

  if (error) return <Text style={{ color: color.danger, padding: size.pad }}>{error}</Text>;
  if (!recipe) return <ActivityIndicator size="large" color={color.accent} style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={{ padding: size.pad, gap: 16 }}>
      <Stack.Screen options={{ title: recipe.title }} />
      <Text style={{ fontSize: size.title, fontWeight: '800', color: color.text }}>{recipe.title}</Text>
      <RecipeBody recipe={recipe} servings={servings} onServings={setServings} />
    </ScrollView>
  );
}
