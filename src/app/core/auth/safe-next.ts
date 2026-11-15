/** Only same-site paths are accepted as a post-login destination (no open redirects). */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/\\') ? next : null;
