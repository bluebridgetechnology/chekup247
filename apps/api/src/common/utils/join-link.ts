import * as jwt from 'jsonwebtoken';
import { envConfig } from '../../config/env.config';

/**
 * "Join your consultation" links for patients (no account, password or code needed).
 *
 * The link carries a signed token naming one booking and its patient. It is signed with a secret
 * derived from JWT_SECRET, so it is NOT accepted as a login token anywhere. Exchanging it
 * (POST /bookings/join-link) checks the booking is live and returns a guest session limited to
 * that booking's consultation (see guest-scope.ts). The token itself is long-lived; the
 * time window for joining is enforced server-side at exchange.
 */
const LINK_TTL = '60d';

function secret(): string {
  return `${envConfig.JWT_SECRET}:consult-join-link`;
}

export function signJoinLinkToken(bookingId: string, patientId: string): string {
  return jwt.sign({ typ: 'consult_join', bid: bookingId, sub: patientId }, secret(), { expiresIn: LINK_TTL });
}

export function verifyJoinLinkToken(token: string): { bookingId: string; patientId: string } | null {
  try {
    const p = jwt.verify(token, secret()) as { typ?: string; bid?: string; sub?: string };
    if (p.typ !== 'consult_join' || !p.bid || !p.sub) return null;
    return { bookingId: p.bid, patientId: p.sub };
  } catch {
    return null;
  }
}

export function buildJoinUrl(bookingId: string, patientId: string): string {
  return `${envConfig.PATIENT_WEB_URL.replace(/\/+$/, '')}/join/${signJoinLinkToken(bookingId, patientId)}`;
}

/** The patient's room opens this long before the booked start... */
export const JOIN_OPENS_BEFORE_MINUTES = 15;
export const JOIN_OPENS_BEFORE_MS = JOIN_OPENS_BEFORE_MINUTES * 60 * 1000;

/**
 * ...and closes when the booked time (plus any paid in-call extensions) is over: the doctor is no
 * longer there, so the room is no longer open to the patient.
 */
export function patientJoinWindow(
  slotStart: Date | string,
  slotEnd: Date | string,
  paidExtraMinutes = 0,
): { opensAt: Date; closesAt: Date } {
  return {
    opensAt: new Date(new Date(slotStart).getTime() - JOIN_OPENS_BEFORE_MS),
    closesAt: new Date(new Date(slotEnd).getTime() + paidExtraMinutes * 60 * 1000),
  };
}
