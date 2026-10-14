import { VerificationSource } from '../../database/operational/entities';
import { priceForDuration, resolveConsultationRate, slotMinutes } from './consultation-fee';

describe('resolveConsultationRate', () => {
  it('locum doctors always get the platform rate, whatever their stored rate', () => {
    expect(resolveConsultationRate({ verification_source: VerificationSource.LOCUMSTAFF, rate_per_hour: 450 }, 800)).toEqual({
      rate: 800,
      source: 'platform',
    });
  });

  it('follows the admin rate when it changes', () => {
    const locum = { verification_source: VerificationSource.LOCUMSTAFF, rate_per_hour: 800 };
    expect(resolveConsultationRate(locum, 950).rate).toBe(950);
  });

  it('own-practice doctors get their own rate', () => {
    expect(resolveConsultationRate({ verification_source: VerificationSource.PLATFORM, rate_per_hour: 600 }, 800)).toEqual({
      rate: 600,
      source: 'doctor',
    });
  });

  it('own-practice doctors without a rate fall back to the platform rate', () => {
    expect(resolveConsultationRate({ verification_source: VerificationSource.PLATFORM, rate_per_hour: 0 }, 800)).toEqual({
      rate: 800,
      source: 'platform',
    });
  });

  it('unknown doctor or unusable platform rate falls back to the default', () => {
    expect(resolveConsultationRate(null, 0)).toEqual({ rate: 850, source: 'platform' });
  });
});

describe('priceForDuration', () => {
  it('30 minutes costs the rate', () => expect(priceForDuration(800, 30)).toBe(800));
  it('1 hour costs double', () => expect(priceForDuration(800, 60)).toBe(1600));
  it('45 minutes costs 1.5x', () => expect(priceForDuration(800, 45)).toBe(1200));
  it('rounds to the cent', () => expect(priceForDuration(850, 10)).toBe(283.33));
  it('missing duration is treated as one 30-minute block', () => expect(priceForDuration(800, 0)).toBe(800));
});

describe('slotMinutes', () => {
  it('measures a slot in minutes', () => {
    expect(slotMinutes('2026-10-15T10:00:00Z', '2026-10-15T11:00:00Z')).toBe(60);
  });
});
