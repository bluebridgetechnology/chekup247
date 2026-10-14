/**
 * Booking window (mirrors the API's booking.constants.ts).
 * A time can be booked only while it starts at least `leadMinutes` from now; the real value is the
 * admin's "Booking lead time" setting, returned by the availability endpoint as `bookingLeadMinutes`.
 */
export const DEFAULT_BOOKING_LEAD_MINUTES = 15;

export function isSlotBookable(
  startTime: string | number | Date,
  leadMinutes: number = DEFAULT_BOOKING_LEAD_MINUTES,
  now: number = Date.now(),
): boolean {
  return new Date(startTime).getTime() - now >= leadMinutes * 60 * 1000;
}
