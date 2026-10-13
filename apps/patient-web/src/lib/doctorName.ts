/** Returns "Dr. First Last" without doubling the title when the stored name already starts with "Dr". */
export function formatDoctorName(name?: string | null): string {
  const trimmed = (name || '').trim();
  if (!trimmed) return '';
  return /^dr\.?(\s|$)/i.test(trimmed) ? trimmed : `Dr. ${trimmed}`;
}
