/** Only https links are stored (also enforced by a CHECK constraint in the database). */
export function isHttpsUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === 'https:' && !!u.hostname && value.length <= 2048;
  } catch {
    return false;
  }
}
