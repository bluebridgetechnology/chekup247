/**
 * "Log in, then continue where you were going" for doctors. A doctor who opens a link from an email
 * (e.g. a new-booking alert) while signed out is sent to /login?next=<that page>, and lands back
 * there after signing in (password or LocumStaff SSO).
 */
const KEY = 'chekup_doctor_next';

/** Only same-site paths are accepted, so a crafted link can't redirect a doctor elsewhere. */
export function sanitizeNext(raw: string | null | undefined): string | null {
  if (!raw || typeof raw !== 'string') return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // keep raw
  }
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('\\') || value.includes('://')) return null;
  if (/^\/(login|register|callback)(\/|\?|#|$)/.test(value)) return null;
  return value;
}

export function loginUrlFor(path: string): string {
  const next = sanitizeNext(path);
  return next && next !== '/' ? `/login?next=${encodeURIComponent(next)}` : '/login';
}

export function rememberNext(next: string | null): void {
  try {
    if (next) sessionStorage.setItem(KEY, next);
  } catch {
    // ignore
  }
}

/** Reads and clears the remembered destination. */
export function consumeNext(): string | null {
  try {
    const v = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return sanitizeNext(v);
  } catch {
    return null;
  }
}
