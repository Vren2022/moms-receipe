// Run: npx tsx src/lib/typewriter.check.ts
import { groupDigits, keyKind, lastLineChars } from './typewriter';

// tiny assert so the app doesn't need @types/node
const assert = { equal: (a: unknown, b: unknown) => { if (a !== b) throw new Error(`${a} !== ${b}`); } };

assert.equal(keyKind('', 'a'), 'type');
assert.equal(keyKind('ab', 'ab\n'), 'newline');
assert.equal(keyKind('abc', 'ab'), 'erase');
assert.equal(keyKind('abc', ''), 'erase');
assert.equal(keyKind('', 'pasted recipe'), 'burst');
assert.equal(keyKind('tel', 'तेल'), 'none');

assert.equal(lastLineChars('', 10), 0);
assert.equal(lastLineChars('abc', 10), 3);
assert.equal(lastLineChars('abc\n', 10), 0);
assert.equal(lastLineChars('abcdefghij', 10), 10); // exactly full line, not 0
assert.equal(lastLineChars('abcdefghijkl', 10), 2);
assert.equal(lastLineChars('long first line\nxy', 10), 2);
assert.equal(lastLineChars('abc', 0), 0);

assert.equal(groupDigits(0), '0');
assert.equal(groupDigits(103), '103');
assert.equal(groupDigits(20000), '20 000');

console.log('typewriter.check ok');
