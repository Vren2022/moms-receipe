import type { Ingredient } from './recipeSchema';

// You can't add half a clove or 1½ pinches: countable units round to whole numbers.
const COUNTABLE = new Set(['pc', 'clove', 'pinch']);

export function scaleQty(qty: number | null, scale: Ingredient['scale'], factor: number, unit = ''): number | null {
  if (qty == null || scale === 'to_taste' || factor === 1) return qty;
  // ponytail: 0.7 exponent heuristic for spices/oil; let the AI set a per-ingredient exponent if it's off
  const q = qty * (scale === 'linear' ? factor : factor ** 0.7);
  if (COUNTABLE.has(unit)) return Math.max(1, Math.round(q));
  return q < 10 ? Math.max(0.25, Math.round(q * 4) / 4) : Math.round(q); // kitchen-friendly: quarters, then whole numbers
}

export function formatQty(q: number | null): string {
  if (q == null) return '';
  const whole = Math.floor(q);
  const frac = { 0.25: '¼', 0.5: '½', 0.75: '¾' }[q - whole] ?? '';
  if (!frac && q !== whole) return String(+q.toFixed(2)); // unscaled AI value like 0.33
  return whole === 0 && frac ? frac : `${whole}${frac}`;
}
