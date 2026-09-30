// Per-device preferences. localStorage is the browser's on web and the SQLite polyfill on native (see ./storage).
import './storage';

function get(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function set(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

export const prefs = {
  onboarded: () => get('onboarded') === '1',
  setOnboarded: () => set('onboarded', '1'),
  language: () => get('language') ?? 'Same as input',
  readAloud: () => get('readAloud') === '1',
  setReadAloud: (on: boolean) => set('readAloud', on ? '1' : '0'),
  typewriterSound: () => get('typewriterSound') !== '0', // on by default
  setTypewriterSound: (on: boolean) => set('typewriterSound', on ? '1' : '0'),
  // Last known recipe list (see recipeCache). Corrupt/missing -> null, never a crash.
  savedRecipes<T>(): T | null {
    try {
      return JSON.parse(get('recipes') ?? 'null');
    } catch {
      return null;
    }
  },
  setSavedRecipes: (rows: unknown) => set('recipes', JSON.stringify(rows)),
  clearSavedRecipes: () => {
    try {
      localStorage.removeItem('recipes');
    } catch {}
  },
};
