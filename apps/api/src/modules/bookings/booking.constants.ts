/**
 * Minimum remaining consultation time required for a slot to stay bookable.
 *
 * A slot expires when `end_time - now < SLOT_BOOKING_MIN_REMAINING_MS`.
 * E.g. with a 15-minute minimum, a 30-min 18:00–18:30 slot stays bookable
 * until 18:15; at 18:01 it still has 29 minutes left, so it can be booked.
 *
 * Frontend duplicates this threshold (patient-web cannot import from the API).
 * Keep `SLOT_BOOKING_MIN_REMAINING_MINUTES` in sync in:
 * - apps/patient-web/src/components/DoctorBookingCalendar.tsx
 * - apps/patient-web/src/app/bookings/checkout/page.tsx
 * - apps/patient-web/src/components/RescheduleModal.tsx
 */
export const SLOT_BOOKING_MIN_REMAINING_MINUTES = 15;

export const SLOT_BOOKING_MIN_REMAINING_MS =
  SLOT_BOOKING_MIN_REMAINING_MINUTES * 60 * 1000;

export function slotRemainingMs(
  endTime: Date | string | number,
  now: number = Date.now(),
): number {
  return new Date(endTime).getTime() - now;
}

export function isSlotBookable(
  endTime: Date | string | number,
  now: number = Date.now(),
): boolean {
  return slotRemainingMs(endTime, now) >= SLOT_BOOKING_MIN_REMAINING_MS;
}
