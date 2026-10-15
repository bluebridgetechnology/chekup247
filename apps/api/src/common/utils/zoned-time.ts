/**
 * Minimal IANA-timezone helpers (no extra dependency).
 * Used to turn a doctor's local wall-clock time into the right UTC instant,
 * independent of the server's own timezone.
 */

export function isValidTimeZone(tz?: string | null): tz is string {
  if (!tz || typeof tz !== 'string') return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Offset (ms) of `tz` from UTC at the given instant: local wall time minus UTC. */
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** UTC instant for a wall-clock time (y, m 1-12, d, h, min) in `tz`. */
export function zonedWallTimeToUtc(y: number, m: number, d: number, h: number, min: number, tz: string): Date {
  const guess = Date.UTC(y, m - 1, d, h, min);
  const off1 = tzOffsetMs(guess, tz);
  let ts = guess - off1;
  const off2 = tzOffsetMs(ts, tz);
  if (off2 !== off1) ts = guess - off2; // crossed a DST boundary
  return new Date(ts);
}

/** Zone used when we don't yet know a recipient's own timezone (our home market). */
export const DEFAULT_TIMEZONE = 'Africa/Johannesburg';

export interface ZonedAppointment {
  date: string;
  time: string;
  /** Short zone name for display next to the time, e.g. "SAST" or "GMT+1". */
  zone: string;
}

/** Format an instant for display in `tz` (falls back to South Africa when unknown/invalid). */
export function formatInZone(instant: Date | string, tz?: string | null): ZonedAppointment {
  const zone = isValidTimeZone(tz) ? tz : DEFAULT_TIMEZONE;
  const d = new Date(instant);
  const date = d.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: zone,
  });
  const time = d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', timeZone: zone });
  const zoneName =
    new Intl.DateTimeFormat('en-ZA', { timeZone: zone, timeZoneName: 'short' })
      .formatToParts(d)
      .find((p) => p.type === 'timeZoneName')?.value || zone;
  return { date, time, zone: zoneName };
}
