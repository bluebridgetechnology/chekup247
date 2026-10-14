/**
 * A slot can be booked only while it still starts at least `lead` minutes from now, so the
 * patient and doctor have time to get ready. The lead is the admin's "Booking lead time"
 * Platform Setting; this default applies only if settings can't be read.
 *
 * E.g. with a 15-minute lead, the 17:40 slot closes at 17:25.
 *
 * Patient-web applies the same rule using the `bookingLeadMinutes` the availability endpoint
 * returns, so there is no duplicated constant on the frontend.
 */
export const DEFAULT_BOOKING_LEAD_MINUTES = 15;

/** Normalises the admin's lead-time setting (0 = bookable right up to the start). */
export function resolveBookingLeadMinutes(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_BOOKING_LEAD_MINUTES;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : DEFAULT_BOOKING_LEAD_MINUTES;
}

export function isSlotBookable(
  startTime: Date | string | number,
  leadMinutes: number = DEFAULT_BOOKING_LEAD_MINUTES,
  now: number = Date.now(),
): boolean {
  return new Date(startTime).getTime() - now >= leadMinutes * 60 * 1000;
}
