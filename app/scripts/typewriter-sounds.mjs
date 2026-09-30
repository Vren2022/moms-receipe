// Generates the typewriter key clack + carriage-return ding as tiny WAVs (synthesised, so no licence questions).
// Run: node scripts/typewriter-sounds.mjs
import { writeFileSync } from 'node:fs';

const RATE = 22050;
let seed = 7;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function wav(file, seconds, sample) {
  const n = Math.round(RATE * seconds);
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(RATE, 24); buf.writeUInt32LE(RATE * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    const v = Math.max(-1, Math.min(1, sample(i / RATE)));
    buf.writeInt16LE(Math.round(v * 32767), 44 + i * 2);
  }
  writeFileSync(new URL(`../assets/sounds/${file}`, import.meta.url), buf);
}

// Clack: sharp noise transient + low wooden thump.
wav('clack.wav', 0.06, (t) => 0.55 * noise() * Math.exp(-t / 0.004) + 0.45 * Math.sin(2 * Math.PI * 170 * t) * Math.exp(-t / 0.012));

// Ding: small bell (fundamental + inharmonic partials), soft attack, long decay.
wav('ding.wav', 0.8, (t) => {
  const env = Math.min(1, t / 0.002) * Math.exp(-t / 0.22);
  return 0.35 * env * (Math.sin(2 * Math.PI * 1760 * t) + 0.4 * Math.sin(2 * Math.PI * 4400 * t) * Math.exp(-t / 0.08) + 0.2 * Math.sin(2 * Math.PI * 6150 * t) * Math.exp(-t / 0.05));
});
