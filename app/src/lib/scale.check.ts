// Run: npx tsx src/lib/scale.check.ts
import { formatQty, scaleQty } from './scale';

// tiny assert so the app doesn't need @types/node
const assert = {
  equal: (a: unknown, b: unknown) => { if (a !== b) throw new Error(`${a} !== ${b}`); },
  ok: (c: boolean, msg: string) => { if (!c) throw new Error(msg); },
};

assert.equal(scaleQty(1, 'linear', 3), 3);
assert.equal(scaleQty(1, 'to_taste', 3), 1);
const p = scaleQty(1, 'partial', 3)!;
assert.ok(p > 1 && p < 3, `partial should be between: ${p}`);
assert.equal(scaleQty(null, 'linear', 3), null);
assert.equal(scaleQty(0.5, 'linear', 0.5), 0.25);
assert.equal(scaleQty(200, 'linear', 1.5), 300);
assert.equal(formatQty(1.5), '1½');
assert.equal(formatQty(0.25), '¼');
assert.equal(formatQty(3), '3');
assert.equal(scaleQty(0.33, 'linear', 1), 0.33);
assert.equal(formatQty(0.33), '0.33');
console.log('scale ok');
