/**
 * Consultation pricing (mirrors the API's consultation-fee.ts).
 * A doctor's rate is quoted per 30 minutes; a longer session costs in proportion,
 * so with R800 per 30 minutes a 1-hour slot is R1,600.
 */
export const PRICING_BLOCK_MINUTES = 30;

export function priceForDuration(rate: number, durationMinutes: number): number {
  const minutes = Number(durationMinutes) > 0 ? Number(durationMinutes) : PRICING_BLOCK_MINUTES;
  return Math.round(Number(rate) * (minutes / PRICING_BLOCK_MINUTES) * 100) / 100;
}

/** "R800" for whole amounts, "R283.33" otherwise. */
export function formatRand(amount: number): string {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005;
  return `R${amount.toLocaleString('en-US', { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 })}`;
}

/** "30 min", "1 hr", "1 hr 30 min". */
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}
