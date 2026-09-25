/**
 * Builds the normalized CORS allowlist for the API.
 *
 * - Trims whitespace and strips trailing slashes (a trailing slash in
 *   PATIENT_WEB_URL previously caused post-deploy "blocked by CORS policy"
 *   errors that never appeared locally).
 * - https origins automatically cover both apex and www variants.
 * - De-duplicates while preserving order.
 */
export function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

export function withWwwVariant(origin: string): string[] {
  try {
    const u = new URL(origin);
    if (u.protocol !== 'https:') return [origin];
    if (u.hostname.startsWith('www.')) {
      return [origin, `${u.protocol}//${u.hostname.slice(4)}`];
    }
    return [origin, `${u.protocol}//www.${u.hostname}`];
  } catch {
    return [origin];
  }
}

export function buildCorsOrigins(rawOrigins: string[]): string[] {
  return [
    ...new Set(
      rawOrigins.map(normalizeOrigin).filter(Boolean).flatMap(withWwwVariant),
    ),
  ];
}
