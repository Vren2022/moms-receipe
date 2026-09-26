// Renders the "Pot of love" icon set into app/assets/images.
// Run: npm i --no-save @resvg/resvg-js && node scripts/render-icons.mjs  (from app/)
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';

const OUT = new URL('../assets/images/', import.meta.url).pathname.replace(/^/([A-Z]:)/, '$1');
const TURMERIC = '#EF9F27', CREAM = '#FFF8F0', POT = '#412402', SAFFRON = '#C2410C';

// Glyph in a 100x100 box, visually centered (heart steam above a pot).
const glyph = (heart, pot) => `
  <g transform="translate(0,4)">
    <path d="M50 42 C38 32 30 22 38 16 C44 12 50 18 50 22 C50 18 56 12 62 16 C70 22 62 32 50 42 Z" fill="${heart}"/>
    <rect x="24" y="50" width="52" height="30" rx="8" fill="${pot}"/>
    <rect x="20" y="46" width="60" height="7" rx="3.5" fill="${pot}"/>
    <rect x="45" y="40" width="10" height="6" rx="2" fill="${pot}"/>
  </g>`;

// scale < 1 shrinks the glyph around the center (Android safe zone).
const svg = ({ bg, rx = 0, heart = CREAM, pot = POT, scale = 1 }) => `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    ${bg ? `<rect width="100" height="100" rx="${rx}" fill="${bg}"/>` : ''}
    <g transform="translate(50 50) scale(${scale}) translate(-50 -50)">${glyph(heart, pot)}</g>
  </svg>`;

function png(name, size, opts) {
  const r = new Resvg(svg(opts), { fitTo: { mode: 'width', value: size } });
  console.log('wrote', name, size);
}

png('icon.png', 1024, { bg: TURMERIC }); // full bleed: iOS/Android mask the corners
png('android-icon-foreground.png', 512, { scale: 0.62 }); // fits the 66% safe zone
png('android-icon-background.png', 512, { bg: TURMERIC, scale: 0, heart: 'none', pot: 'none' });
png('android-icon-monochrome.png', 432, { heart: '#FFFFFF', pot: '#FFFFFF', scale: 0.62 });
png('splash-icon.png', 512, { heart: SAFFRON }); // on cream splash background, so heart can't be cream
png('favicon.png', 48, { bg: TURMERIC, rx: 22 });
