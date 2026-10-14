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

/** Joining opens this long before the start and closes this long after the slot ends. */
export const JOIN_OPENS_BEFORE_MS = 60 * 60 * 1000;
export const JOIN_CLOSES_AFTER_MS = 12 * 60 * 60 * 1000;
