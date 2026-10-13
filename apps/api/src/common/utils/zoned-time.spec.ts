import { isValidTimeZone, zonedWallTimeToUtc } from './zoned-time';

describe('zoned-time', () => {
  it('validates IANA zones', () => {
    expect(isValidTimeZone('Africa/Johannesburg')).toBe(true);
    expect(isValidTimeZone('Not/AZone')).toBe(false);
    expect(isValidTimeZone(undefined)).toBe(false);
  });

  it('08:00 in Johannesburg (UTC+2) is 06:00Z', () => {
    expect(zonedWallTimeToUtc(2026, 10, 14, 8, 0, 'Africa/Johannesburg').toISOString()).toBe('2026-10-14T06:00:00.000Z');
  });

  it('09:00 in Lagos (UTC+1) is 08:00Z', () => {
    expect(zonedWallTimeToUtc(2026, 10, 14, 9, 0, 'Africa/Lagos').toISOString()).toBe('2026-10-14T08:00:00.000Z');
  });

  it('respects DST (New York: EDT in July, EST in January)', () => {
    expect(zonedWallTimeToUtc(2026, 7, 1, 9, 0, 'America/New_York').toISOString()).toBe('2026-07-01T13:00:00.000Z');
    expect(zonedWallTimeToUtc(2026, 1, 15, 9, 0, 'America/New_York').toISOString()).toBe('2026-01-15T14:00:00.000Z');
  });
});
