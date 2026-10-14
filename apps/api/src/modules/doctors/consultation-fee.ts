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

/** Used only if platform settings can't be read. The real value is a Platform Setting. */
export const DEFAULT_MINIMUM_BILLABLE_MINUTES = 30;

/** Normalises the admin's minimum-billable-minutes setting (0 means no minimum). */
export function resolveMinimumBillableMinutes(value: unknown): number {
  if (value === null || value === undefined || value === '') return DEFAULT_MINIMUM_BILLABLE_MINUTES;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : DEFAULT_MINIMUM_BILLABLE_MINUTES;
}

/**
 * Total price for a session: the per-30-minute rate x (billable length / 30), to the cent.
 * Sessions shorter than `minimumBillableMinutes` are charged as if they were that long.
 */
export function priceForDuration(
  rate: number,
  durationMinutes: number,
  minimumBillableMinutes: number = DEFAULT_MINIMUM_BILLABLE_MINUTES,
): number {
  const minutes = Number(durationMinutes) > 0 ? Number(durationMinutes) : PRICING_BLOCK_MINUTES;
  const billable = Math.max(minutes, Number(minimumBillableMinutes) || 0);
  return Math.round(Number(rate) * (billable / PRICING_BLOCK_MINUTES) * 100) / 100;
}

/** Length of a slot in whole minutes. */
export function slotMinutes(start: Date | string, end: Date | string): number {
  return Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000);
}
