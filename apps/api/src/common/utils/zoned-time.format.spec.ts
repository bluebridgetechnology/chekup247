import { formatInZone, DEFAULT_TIMEZONE } from './zoned-time';

describe('formatInZone', () => {
  const instant = '2026-10-20T16:40:00Z';

  it('renders the same instant in each recipient timezone', () => {
    expect(formatInZone(instant, 'Africa/Johannesburg')).toMatchObject({ time: '18:40', zone: 'SAST' });
    expect(formatInZone(instant, 'Africa/Lagos').time).toBe('17:40');
    expect(formatInZone(instant, 'Europe/London').time).toBe('17:40');
  });

  it('falls back to South Africa when the timezone is unknown or invalid', () => {
    expect(DEFAULT_TIMEZONE).toBe('Africa/Johannesburg');
    expect(formatInZone(instant, null).time).toBe('18:40');
    expect(formatInZone(instant, 'Not/AZone').time).toBe('18:40');
  });
});
