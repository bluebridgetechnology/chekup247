/**
 * Slot hold (client side). When a patient reaches checkout, the API reserves their chosen time for a
 * few minutes (admin Platform Setting) and returns an anonymous token. The token lives in
 * sessionStorage, is sent when booking, and lets the patient keep seeing their own held time.
 */
const KEY = 'chekup_slot_hold';

export interface StoredHold {
  token: string;
  slotId: string;
  /** ISO time the hold ends. */
  expiresAt: string;
}

export function readHold(): StoredHold | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const h = JSON.parse(raw) as StoredHold;
    return h && h.token && h.slotId && h.expiresAt ? h : null;
  } catch {
    return null;
  }
}

/** The stored hold for this slot, if it exists. `live` says whether it has not yet expired. */
export function holdForSlot(slotId: string | null | undefined, now: number = Date.now()) {
  const h = readHold();
  if (!h || !slotId || h.slotId !== slotId) return null;
  return { ...h, live: new Date(h.expiresAt).getTime() > now };
}

export function storeHold(hold: StoredHold): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(hold));
  } catch {
    // ignore
  }
}

export function clearHold(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

/** Query suffix so the availability endpoint still shows this client's own held time. */
export function holdQuery(): string {
  const h = readHold();
  return h ? `?holdToken=${encodeURIComponent(h.token)}` : '';
}

/** Give a hold back (e.g. the booking could not continue). Best effort. */
export async function releaseHold(apiBase: string, slotId: string): Promise<void> {
  const h = readHold();
  if (!h || h.slotId !== slotId) return;
  clearHold();
  try {
    await fetch(`${apiBase}/bookings/holds/${encodeURIComponent(slotId)}?token=${encodeURIComponent(h.token)}`, {
      method: 'DELETE',
    });
  } catch {
    // it expires on its own
  }
}

export type HoldResult =
  | { status: 'held'; hold: StoredHold; holdMinutes: number }
  | { status: 'rejected'; message: string }
  | { status: 'unavailable' };

/**
 * Ask the API to hold a time. `rejected` means the time is gone or taken (send the patient back to
 * pick another). `unavailable` means we couldn't reach a hold service (offline or an older API), so
 * checkout carries on without a hold, exactly as before.
 */
export async function requestHold(apiBase: string, slotId: string): Promise<HoldResult> {
  try {
    const existing = readHold();
    const res = await fetch(`${apiBase}/bookings/holds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slotId, holdToken: existing?.token }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.holdToken) {
      const hold: StoredHold = { token: data.holdToken, slotId, expiresAt: data.expiresAt };
      storeHold(hold);
      return { status: 'held', hold, holdMinutes: Number(data.holdMinutes) || 0 };
    }
    const message = String(data.message || '');
    if ([400, 409].includes(res.status) || (res.status === 404 && !/^Cannot /i.test(message))) {
      return { status: 'rejected', message: message || 'That time is no longer available. Please pick another time.' };
    }
    return { status: 'unavailable' };
  } catch {
    return { status: 'unavailable' };
  }
}
