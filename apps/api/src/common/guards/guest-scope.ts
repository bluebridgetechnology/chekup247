/**
 * Guest sessions (express/Quick Book patients and "join" links) are deliberately narrow: they can
 * book, pay, view that booking and join its consultation, and nothing else. A guest token is issued
 * without a password, so it must never reach the rest of a patient's account (profile, wallet,
 * records, other bookings).
 */
export const GUEST_SCOPE = 'guest';

interface Rule {
  methods: string[];
  pattern: RegExp;
  /** 1-based capture group holding a booking id, checked against the token's `bid` when it has one. */
  bookingGroup?: number;
}

const RULES: Rule[] = [
  { methods: ['GET'], pattern: /^\/auth\/me$/ },
  { methods: ['PUT'], pattern: /^\/auth\/me\/timezone$/ },
  { methods: ['POST'], pattern: /^\/auth\/logout$/ },
  { methods: ['POST'], pattern: /^\/bookings$/ },
  { methods: ['GET'], pattern: /^\/bookings\/([^/]+)$/, bookingGroup: 1 },
  { methods: ['POST'], pattern: /^\/bookings\/([^/]+)\/intake$/, bookingGroup: 1 },
  { methods: ['POST'], pattern: /^\/payments\/initiate$/ },
  { methods: ['POST'], pattern: /^\/storage\/presigned-upload$/ },
  { methods: ['GET', 'POST', 'PUT', 'PATCH'], pattern: /^\/consultations\/([^/]+)(\/.*)?$/, bookingGroup: 1 },
  { methods: ['GET'], pattern: /^\/prescriptions\/booking\/([^/]+)(\/download)?$/, bookingGroup: 1 },
  { methods: ['GET'], pattern: /^\/prescriptions\/[^/]+\/download$/ },
  { methods: ['POST'], pattern: /^\/reviews$/ },
];

function normalise(url: string): string {
  const path = (url || '').split('?')[0].replace(/\/+$/, '');
  return path.replace(/^\/api\/v\d+/, '') || '/';
}

/** Whether a guest token (optionally bound to one booking) may call this route. */
export function guestMayAccess(method: string, url: string, boundBookingId?: string): boolean {
  const path = normalise(url);
  const verb = (method || 'GET').toUpperCase();
  return RULES.some((r) => {
    if (!r.methods.includes(verb)) return false;
    const m = r.pattern.exec(path);
    if (!m) return false;
    if (boundBookingId && r.bookingGroup && m[r.bookingGroup] !== boundBookingId) return false;
    return true;
  });
}
