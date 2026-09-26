// Cook-mode helpers (pure, no RN imports) — checked by cook.check.ts.
import type { Ingredient, Recipe } from './recipeSchema';

// Step text has no amounts ("Heat the oil"), so show the amounts of ingredients the step mentions.
// Matches the full name or its first word ("onion" for "onions", "jeera" for "jeera (cumin)"), case-insensitive.
export function stepIngredients(step: Recipe['steps'][number], ingredients: Ingredient[]): Ingredient[] {
  const text = step.text.toLowerCase();
  return ingredients.filter((i) => {
    const name = i.name.toLowerCase().trim();
    const head = name.split(/[\s(,]/)[0].replace(/(es|s)$/, '');
    return text.includes(name) || (head.length >= 3 && text.includes(head));
  });
}

export function remaining(endAt: number, now: number) {
  return Math.max(0, Math.ceil((endAt - now) / 1000));
}

export function fmtClock(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
