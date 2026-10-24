const loanwords: Record<string, string> = {
  mancozeb: 'mankozeb', onion: 'aniyan', ph: 'pi-eich', gps: 'ji-pi-es',
};
const numbers = ['sifili', 'ɗaya', 'biyu', 'uku', 'huɗu', 'biyar', 'shida', 'bakwai', 'takwas', 'tara', 'goma'];

/** Larger numbers are read digit by digit rather than silently dropped. */
export function preprocessHausaText(text: string): string {
  return text.normalize('NFC').toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/\b(mancozeb|onion|ph|gps)\b/g, word => loanwords[word])
    .replace(/\d+/g, value => Number(value) <= 10
      ? numbers[Number(value)] : [...value].map(digit => numbers[Number(digit)]).join(' '))
    .replace(/[-‐‑–—]/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

/** Bound inference memory on low-end phones, retaining sentence punctuation. */
export function splitSpeechChunks(text: string, limit = 180): string[] {
  const chunks: string[] = [];
  for (const sentence of text.match(/[^.!?]+[.!?]*|[.!?]+/g) ?? []) {
    let chunk = '';
    for (const word of sentence.trim().split(/\s+/)) {
      if (chunk && chunk.length + word.length + 1 > limit) {
        chunks.push(chunk);
        chunk = '';
      }
      // Unbroken oversized tokens are handled by the system engine.
      chunk += (chunk ? ' ' : '') + word;
    }
    if (chunk) chunks.push(chunk);
  }
  return chunks;
}
