import { z } from 'zod';

// Mirrored in supabase/functions/parse-recipe/index.ts — change both together.
export const IngredientSchema = z.object({
  name: z.string().min(1),
  qty: z.number().positive().nullable(),
  unit: z.string().default(''),
  scale: z.enum(['linear', 'partial', 'to_taste']),
});

export const CATEGORIES = ['sabzi', 'dal', 'rice', 'roti', 'snack', 'sweet', 'drink', 'other'] as const;

export const RecipeSchema = z.object({
  title: z.string().min(1),
  category: z.enum(CATEGORIES).catch('other'),
  is_veg: z.boolean().nullish(),
  base_servings: z.number().int().positive(),
  language: z.string(),
  ingredients: z.array(IngredientSchema).min(1),
  prep: z.array(z.object({ text: z.string().min(1) })).default([]),
  steps: z
    .array(
      z.object({
        text: z.string().min(1),
        duration_sec: z.number().int().nonnegative().nullish(),
        heat: z.enum(['low', 'medium', 'high']).nullish(),
      }),
    )
    .min(1),
});

export type Ingredient = z.infer<typeof IngredientSchema>;
export type Recipe = z.infer<typeof RecipeSchema>;
