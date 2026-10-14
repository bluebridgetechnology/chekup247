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

/**
 * Slot hold: when a patient reaches checkout, the time is reserved for them for this many minutes
 * (admin Platform Setting `slot_hold_minutes`). A live hold waives the lead-time rule for its holder
 * and hides the time from everyone else. Holds expire by the clock; nothing needs to release them.
 */
export const DEFAULT_SLOT_HOLD_MINUTES = 10;

/** Unpaid pending bookings are cancelled (and their slot freed) after this many minutes. */
export const PENDING_PAYMENT_TTL_MINUTES = 15;

/** A slot flagged booked with no booking row is only treated as orphaned after this long (mid-saga safety). */
export const ORPHAN_SLOT_GRACE_MS = 2 * 60 * 1000;

export function resolveSlotHoldMinutes(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_SLOT_HOLD_MINUTES;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : DEFAULT_SLOT_HOLD_MINUTES;
}

/** Only well-formed tokens are accepted from clients. */
export function isValidHoldToken(token: unknown): token is string {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{16,64}$/.test(token);
}

export interface SlotHoldFields {
  hold_token?: string | null;
  hold_expires_at?: Date | string | null;
}

/** True while the slot has an unexpired hold. */
export function hasLiveHold(slot: SlotHoldFields, now: number = Date.now()): boolean {
  return Boolean(slot.hold_token && slot.hold_expires_at && new Date(slot.hold_expires_at).getTime() > now);
}

/** True when the slot is held by someone other than `token`. */
export function isHeldByOther(slot: SlotHoldFields, token: string | undefined, now: number = Date.now()): boolean {
  return hasLiveHold(slot, now) && slot.hold_token !== token;
}
