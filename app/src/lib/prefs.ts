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
  setLanguage: (l: string) => set('language', l),
};
