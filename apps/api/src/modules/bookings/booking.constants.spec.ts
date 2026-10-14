import {
  hasLiveHold,
  isHeldByOther,
  isSlotBookable,
  isValidHoldToken,
  resolveBookingLeadMinutes,
  resolveSlotHoldMinutes,
} from './booking.constants';

describe('isSlotBookable', () => {
  const now = new Date('2026-10-14T17:00:00Z').getTime();
  const at = (hhmm: string) => new Date(`2026-10-14T${hhmm}:00Z`);

  it('is bookable when the start is at least the lead time away', () => {
    expect(isSlotBookable(at('17:15'), 15, now)).toBe(true);
    expect(isSlotBookable(at('17:40'), 15, now)).toBe(true);
  });
  it('closes once the start is closer than the lead time', () => {
    expect(isSlotBookable(at('17:14'), 15, now)).toBe(false);
    expect(isSlotBookable(at('17:00'), 15, now)).toBe(false);
  });
  it('a started slot is not bookable, however long it is', () => {
    expect(isSlotBookable(at('16:57'), 15, now)).toBe(false);
  });
  it('lead time is configurable, 0 = until the start', () => {
    expect(isSlotBookable(at('17:20'), 30, now)).toBe(false);
    expect(isSlotBookable(at('17:00'), 0, now)).toBe(true);
    expect(isSlotBookable(at('16:59'), 0, now)).toBe(false);
  });
});

describe('resolveBookingLeadMinutes', () => {
  it('defaults to 15 when unset or invalid', () => {
    expect(resolveBookingLeadMinutes(undefined)).toBe(15);
    expect(resolveBookingLeadMinutes('x')).toBe(15);
    expect(resolveBookingLeadMinutes(-1)).toBe(15);
  });
  it('uses the configured value including 0', () => {
    expect(resolveBookingLeadMinutes(30)).toBe(30);
    expect(resolveBookingLeadMinutes(0)).toBe(0);
  });
});

describe('slot hold helpers', () => {
  const now = new Date('2026-10-14T17:00:00Z').getTime();
  const live = { hold_token: 'a'.repeat(32), hold_expires_at: new Date(now + 60000) };
  const expired = { hold_token: 'a'.repeat(32), hold_expires_at: new Date(now - 1) };

  it('a hold is live only before it expires', () => {
    expect(hasLiveHold(live, now)).toBe(true);
    expect(hasLiveHold(expired, now)).toBe(false);
    expect(hasLiveHold({}, now)).toBe(false);
  });
  it('held by other: only while live and for a different token', () => {
    expect(isHeldByOther(live, 'b'.repeat(32), now)).toBe(true);
    expect(isHeldByOther(live, undefined, now)).toBe(true);
    expect(isHeldByOther(live, 'a'.repeat(32), now)).toBe(false);
    expect(isHeldByOther(expired, 'b'.repeat(32), now)).toBe(false);
  });
  it('only well-formed tokens are valid', () => {
    expect(isValidHoldToken('a'.repeat(32))).toBe(true);
    expect(isValidHoldToken('short')).toBe(false);
    expect(isValidHoldToken('bad token with spaces!!!!!!!')).toBe(false);
    expect(isValidHoldToken(undefined)).toBe(false);
  });
  it('hold minutes default to 10 and must be positive', () => {
    expect(resolveSlotHoldMinutes(undefined)).toBe(10);
    expect(resolveSlotHoldMinutes(0)).toBe(10);
    expect(resolveSlotHoldMinutes(15)).toBe(15);
  });
});
