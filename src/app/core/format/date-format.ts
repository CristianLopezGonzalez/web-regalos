const longDate = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});
const shortDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' });

/** "14 de noviembre de 2026" */
export const formatDate = (iso: string) => longDate.format(new Date(iso));
/** "14 nov" */
export const formatShortDate = (iso: string) => shortDate.format(new Date(iso));
