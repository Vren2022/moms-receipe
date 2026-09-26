import type { Recipe } from './recipeSchema';

// Mirrored (allow-list) in supabase/functions/parse-recipe/index.ts — change both together.
export const LANGUAGES = ['Same as input', 'English', 'Hindi', 'Gujarati', 'Marathi', 'Tamil', 'Telugu', 'Bengali'];
export const PRIVACY_URL = 'https://github.com/Vren2022/moms-receipe/blob/main/docs/PRIVACY.md';

export const TEACHERS = ['Mom', 'Nani', 'Dadi', 'YouTube', 'Me'];

export const CATEGORY_LABEL: Record<string, string> = {
  sabzi: 'Sabzi',
  dal: 'Dal',
  rice: 'Rice',
  roti: 'Roti',
  snack: 'Snack',
  sweet: 'Sweet',
  drink: 'Drink',
  other: 'Other',
};

export function totalMinutes(steps: Recipe['steps']) {
  const sec = steps.reduce((t, s) => t + (s.duration_sec ?? 0), 0);
  return sec ? Math.max(1, Math.round(sec / 60)) : null;
}

export function timeAgo(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return 'last week';
  return `${Math.floor(days / 7)} weeks ago`;
}
