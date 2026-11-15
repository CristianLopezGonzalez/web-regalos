/** "Papelería" → "papeleria": lower case, without accents. */
export const foldAccents = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** URL-safe slug: "Té y café" → "te-y-cafe". Falls back to "categoria" when nothing is left. */
export const slugify = (s: string, maxLength = 40) =>
  foldAccents(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength) || 'categoria';
