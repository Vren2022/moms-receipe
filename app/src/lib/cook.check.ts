// Run: npx tsx src/lib/cook.check.ts
import { fmtClock, remaining, stepIngredients } from './cook';
import type { Ingredient } from './recipeSchema';

const assert = {
  equal: (a: unknown, b: unknown) => { if (a !== b) throw new Error(`${a} !== ${b}`); },
};

const ing = (name: string): Ingredient => ({ name, qty: 1, unit: '', scale: 'linear' });
const all = [ing('oil'), ing('onions'), ing('jeera (cumin)'), ing('salt'), ing('garam masala')];
const names = (text: string) => stepIngredients({ text }, all).map((i) => i.name).join(',');

assert.equal(names('Heat the oil'), 'oil');
assert.equal(names('Add the onion and fry until golden'), 'onions');
assert.equal(names('Add jeera to the hot oil'), 'oil,jeera (cumin)');
assert.equal(names('Finish with garam masala and salt'), 'salt,garam masala');
assert.equal(names('Cover and cook'), '');

assert.equal(fmtClock(245), '4:05');
assert.equal(fmtClock(0), '0:00');
assert.equal(remaining(10_000, 9_001), 1);
assert.equal(remaining(10_000, 12_000), 0);

console.log('cook ok');
