/**
 * Viewer-timezone helpers. Slots arrive from the API as UTC ISO strings; every
 * display goes through here so the patient always sees their own local time
 * (12-hour with AM/PM) together with an explicit timezone label.
 */

export function getViewerTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Johannesburg';
  } catch {
    return 'Africa/Johannesburg';
  }
}

/** "9:00 PM" in the viewer's timezone. */
export function formatClockTime(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone });
}

/** Short zone name such as "WAT" / "SAST" / "GMT+1". */
export function formatZoneAbbr(iso?: string, timeZone?: string): string {
  const d = iso ? new Date(iso) : new Date();
  try {
    const parts = new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone }).formatToParts(d);
    return parts.find((p) => p.type === 'timeZoneName')?.value || '';
  } catch {
    return '';
  }
}

/** Local YYYY-MM-DD key (not UTC) so late-evening slots land on the viewer's date. */
export function localDateKey(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** "UTC+1" / "UTC+5:30" for the viewer's current offset. */
export function formatUtcOffset(d: Date = new Date()): string {
  const total = -d.getTimezoneOffset();
  const sign = total >= 0 ? '+' : '-';
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, '0')}` : ''}`;
}

/** Hour-row gutter label, e.g. 9 -> "9 AM", 0 -> "12 AM". */
export function formatHourLabel(hour24: number): string {
  const h = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h} ${hour24 < 12 ? 'AM' : 'PM'}`;
}

/** Compact range for narrow cells: "9:00–9:30 AM" (or "11:30 AM–12:00 PM" across noon). */
export function formatClockRange(startIso: string, endIso: string, timeZone?: string): string {
  const s = formatClockTime(startIso, timeZone);
  const e = formatClockTime(endIso, timeZone);
  const sMer = s.slice(-2);
  const eMer = e.slice(-2);
  return sMer === eMer ? `${s.slice(0, -3)}–${e}` : `${s}–${e}`;
}
