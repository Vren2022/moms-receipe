// Pure helpers for the typewriter input (see components/Typewriter.tsx and typewriter.check.ts).

export type Key = 'type' | 'newline' | 'erase' | 'burst' | 'none';

// What just happened, from the text before and after one change.
// 'burst' = paste, autocorrect, or an Indian-language keyboard committing a whole word: one clack, not dozens.
export function keyKind(prev: string, next: string): Key {
  const d = next.length - prev.length;
  if (d === 0) return 'none';
  if (d < 0) return 'erase';
  if (d > 1) return 'burst';
  return next.endsWith('\n') ? 'newline' : 'type';
}

// Width (in chars) of the last visual line, for placing the carriage.
// ponytail: wraps by char count, not by word like the real Text does; used only on web where onTextLayout is missing.
export function lastLineChars(text: string, charsPerLine: number) {
  const para = text.slice(text.lastIndexOf('\n') + 1).length;
  if (para === 0 || charsPerLine < 1) return 0;
  return para % charsPerLine || charsPerLine;
}

// "20000" -> "20 000"
export const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
