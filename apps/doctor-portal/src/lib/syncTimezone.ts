/**
 * Tells the API which timezone this browser is in, so emails and SMS (booking confirmation,
 * reminders…) show appointment times in the user's own zone. Quiet and best-effort; once per
 * session per sign-in.
 */
export function syncTimezone(apiBase: string, token: string | null | undefined): void {
  if (!token || typeof window === 'undefined') return;
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return;
  }
  if (!tz) return;
  const key = `chekup_tz_synced:${tz}:${token.slice(-12)}`;
  try {
    if (window.sessionStorage.getItem(key)) return;
  } catch {
    // storage unavailable: just send it
  }
  fetch(`${apiBase}/auth/me/timezone`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ timeZone: tz }),
  })
    .then((res) => {
      if (!res.ok) return;
      try {
        window.sessionStorage.setItem(key, '1');
      } catch {
        // ignore
      }
    })
    .catch(() => {});
}
