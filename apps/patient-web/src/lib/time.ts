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
