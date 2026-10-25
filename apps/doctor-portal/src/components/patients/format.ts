export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const ageOf = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  return Number.isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

/** "Penicillin (rash, hives), sulfa; latex" → ["Penicillin (rash, hives)", "sulfa", "latex"]; commas inside brackets are kept. */
export const splitList = (v: string | null | undefined): string[] => {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of v || '') {
    if (ch === '(' || ch === '[') depth++;
    if ((ch === ')' || ch === ']') && depth > 0) depth--;
    if ((ch === ';' || ch === '\n' || (ch === ',' && depth === 0))) {
      if (cur.trim()) out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
};
