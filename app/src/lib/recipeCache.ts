// The app's one client-side copy of the user's recipes. Home is drawn from it, and opening a recipe,
// cook mode and "just saved" render from it instantly while screens refresh from the server in the background.
// Also persisted (prefs) so a cold start shows recipes immediately. Cleared on logout (_layout).
import { prefs } from './prefs';
import type { Recipe } from './recipeSchema';

export type SavedRecipe = Recipe & {
  id: string;
  created_at: string;
  taught_by: string | null;
  is_favorite: boolean;
  last_cooked_at: string | null;
  notes: string | null;
};

// Everything the home list and the recipe/cook screens need, in one query.
export const RECIPE_COLUMNS =
  'id, created_at, title, category, is_veg, base_servings, language, ingredients, prep, steps, taught_by, is_favorite, last_cooked_at, notes';

const cache = new Map<string, SavedRecipe>();
let loaded = false; // false until seeded from disk or the server

export const recipeCache = {
  get: (id: string) => cache.get(id),
  // null = nothing known yet (show a spinner, not "no recipes").
  list(): SavedRecipe[] | null {
    if (!loaded) {
      const saved = prefs.savedRecipes<SavedRecipe[]>();
      if (!saved) return null;
      saved.forEach((r) => cache.set(r.id, r));
      loaded = true;
    }
    return [...cache.values()].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  replaceAll(rows: SavedRecipe[]) {
    cache.clear();
    rows.forEach((r) => cache.set(r.id, r));
    loaded = true;
    prefs.setSavedRecipes(rows);
  },
  set(r: SavedRecipe) {
    cache.set(r.id, r);
  },
  patch(id: string, p: Partial<SavedRecipe>) {
    const r = cache.get(id);
    if (r) cache.set(id, { ...r, ...p });
  },
  remove(id: string) {
    cache.delete(id);
  },
  clear() {
    cache.clear();
    loaded = false;
    prefs.clearSavedRecipes();
  },
};
