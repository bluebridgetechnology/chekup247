import { DoctorProfile, VerificationSource } from '../../database/operational/entities';

/** The rate is always quoted per this many minutes; longer sessions are charged in proportion. */
export const PRICING_BLOCK_MINUTES = 30;

/** Used only if platform settings can't be read. */
export const DEFAULT_PLATFORM_CONSULTATION_RATE = 850;

export type ConsultationRateSource = 'platform' | 'doctor';

export interface ConsultationRate {
  /** Price per PRICING_BLOCK_MINUTES (30 minutes). */
  rate: number;
  source: ConsultationRateSource;
}

/**
 * The rate (per 30 minutes) that applies to a doctor.
 *
 * - LocumStaff doctors: always the platform-wide rate the admin sets in Platform Settings.
 * - Doctors who run their own practice (not LocumStaff): the rate they set themselves,
 *   falling back to the platform rate if they haven't set one.
 */
export function resolveConsultationRate(
  doctor: Pick<DoctorProfile, 'verification_source' | 'rate_per_hour'> | null | undefined,
  platformRate: number,
): ConsultationRate {
  const platform = Number(platformRate) > 0 ? Number(platformRate) : DEFAULT_PLATFORM_CONSULTATION_RATE;
  if (!doctor || doctor.verification_source === VerificationSource.LOCUMSTAFF) {
    return { rate: platform, source: 'platform' };
  }
  const own = Number(doctor.rate_per_hour);
  if (own > 0) {
    return { rate: own, source: 'doctor' };
  }
  return { rate: platform, source: 'platform' };
}

/** Total price for a session: the per-30-minute rate x (session length / 30), to the cent. */
export function priceForDuration(rate: number, durationMinutes: number): number {
  const minutes = Number(durationMinutes) > 0 ? Number(durationMinutes) : PRICING_BLOCK_MINUTES;
  return Math.round(Number(rate) * (minutes / PRICING_BLOCK_MINUTES) * 100) / 100;
}

/** Length of a slot in whole minutes. */
export function slotMinutes(start: Date | string, end: Date | string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}
