'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../../components/common/SolarIcon';
import { PatientChartSheet } from '../../components/patients/PatientChartSheet';
import { API_BASE, ageOf, fmtDate, initials } from '../../components/patients/format';

interface PatientRow {
  patient_id: string;
  full_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  visits: number;
  last_visit_at: string | null;
  next_appointment_at: string | null;
}

type SortKey = 'name' | 'visits' | 'last' | 'next';

export default function PatientsLayout({ children }: { children: React.ReactNode }) {
  const { token } = useDoctorAuth();
  const router = useRouter();
  const params = useParams();
  const selectedId = typeof params?.patientId === 'string' ? params.patientId : null;

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; dir: 'asc' | 'desc' }>({ key: 'last', dir: 'desc' });

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/ehr/patients`, { headers: { Authorization: `Bearer ${token}` }, credentials: 'include' });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Could not load patients');
      setPatients(await res.json());
    } catch (e: any) {
      setError(e?.message || 'Could not load patients');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = patients.filter(
      (p) => !q || p.full_name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q) || (p.phone || '').includes(q),
    );
    const time = (v: string | null, empty: number) => (v ? new Date(v).getTime() : empty);
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return a.full_name.localeCompare(b.full_name) * dir;
        case 'visits':
          return (a.visits - b.visits) * dir;
        case 'next':
          // Patients without an upcoming appointment always sink to the bottom
          return (time(a.next_appointment_at, dir === 1 ? Infinity : -Infinity) - time(b.next_appointment_at, dir === 1 ? Infinity : -Infinity)) * dir;
        default:
          return (time(a.last_visit_at, 0) - time(b.last_visit_at, 0)) * dir;
      }
    });
  }, [patients, query, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'name' || key === 'next' ? 'asc' : 'desc' }));

  const SortHeader = ({ k, label, className }: { k: SortKey; label: string; className?: string }) => {
    const active = sort.key === k;
    return (
      <th className={className} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={`pt-sort ${active ? 'on' : ''}`} onClick={() => toggleSort(k)}>
          {label}
          <SolarIcon name={active ? (sort.dir === 'asc' ? 'alt-arrow-up-linear' : 'alt-arrow-down-linear') : 'sort-vertical-linear'} size={13} />
        </button>
      </th>
    );
  };

  const open = (id: string) => router.push(`/patients/${id}`, { scroll: false });

  return (
    <div className="pt-page">
      <style>{PATIENTS_CSS}</style>
      <div className="pt-wrap">
        <header className="pt-head">
          <div>
            <h1>My Patients</h1>
            <p>Patients you have a confirmed or completed consultation with.</p>
          </div>
          <label className="pt-search">
            <SolarIcon name="magnifier-linear" size={17} color="#8A7B72" />
            <input type="search" placeholder="Search name, email or phone" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search patients" />
          </label>
        </header>

        {error && (
          <div className="pt-alert" role="alert">
            {error}{' '}
            <button type="button" onClick={load}>
              Try again
            </button>
          </div>
        )}

        <div className="pt-table-card">
          <table className="pt-table">
            <thead>
              <tr>
                <SortHeader k="name" label="Patient" />
                <th className="pt-col-age">Age</th>
                <th className="pt-col-phone">Phone</th>
                <SortHeader k="visits" label="Visits" className="pt-col-num" />
                <SortHeader k="last" label="Last visit" className="pt-col-date" />
                <SortHeader k="next" label="Next appointment" className="pt-col-date pt-col-next" />
                <th className="pt-col-go" aria-label="Open chart" />
              </tr>
            </thead>
            <tbody>
              {loading && patients.length === 0
                ? Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="pt-skel">
                      <td colSpan={7}>
                        <span />
                      </td>
                    </tr>
                  ))
                : rows.map((p) => {
                    const age = ageOf(p.date_of_birth);
                    return (
                      <tr
                        key={p.patient_id}
                        className={selectedId === p.patient_id ? 'selected' : ''}
                        onClick={() => open(p.patient_id)}
                        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), open(p.patient_id))}
                        tabIndex={0}
                        aria-label={`Open chart for ${p.full_name}`}
                      >
                        <td>
                          <span className="pt-person">
                            <span className="pt-avatar" aria-hidden>
                              {initials(p.full_name)}
                            </span>
                            <span className="pt-person-text">
                              <span className="pt-name">{p.full_name}</span>
                              <span className="pt-email">{p.email}</span>
                            </span>
                          </span>
                        </td>
                        <td className="pt-col-age">{age !== null ? age : '—'}</td>
                        <td className="pt-col-phone">{p.phone || '—'}</td>
                        <td className="pt-col-num">{p.visits}</td>
                        <td className="pt-col-date">{fmtDate(p.last_visit_at)}</td>
                        <td className="pt-col-date pt-col-next">
                          {p.next_appointment_at ? <span className="pt-next">{fmtDate(p.next_appointment_at)}</span> : <span className="pt-dim">—</span>}
                        </td>
                        <td className="pt-col-go">
                          <SolarIcon name="alt-arrow-right-linear" size={18} color="#B88647" />
                        </td>
                      </tr>
                    );
                  })}
            </tbody>
          </table>

          {!loading && rows.length === 0 && (
            <div className="pt-empty">
              <SolarIcon name="users-group-rounded-linear" size={30} color="#B88647" />
              <p>{query ? 'No patients match your search.' : 'No patients yet. They appear here once a booking is confirmed.'}</p>
            </div>
          )}
        </div>
        {!loading && rows.length > 0 && (
          <p className="pt-foot">
            {rows.length} {rows.length === 1 ? 'patient' : 'patients'}
            {query && ` matching “${query}”`}
          </p>
        )}
      </div>

      {selectedId && token && (
        <PatientChartSheet patientId={selectedId} token={token} onClose={() => router.push('/patients', { scroll: false })} />
      )}
      {children}
    </div>
  );
}

const PATIENTS_CSS = `
  .pt-page { min-height: 100vh; background: #FAF6EE; padding: 24px 16px 60px; box-sizing: border-box; color: #2A170F; }
  .pt-wrap { max-width: 1120px; margin: 0 auto; }
  .pt-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
  .pt-head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em; }
  .pt-head p { margin: 4px 0 0; color: #6B5E55; font-size: 0.9rem; }
  .pt-search { display: flex; align-items: center; gap: 8px; background: #fff; border: 1.5px solid #DDD0BC; border-radius: 12px; padding: 0 12px; min-width: 280px; }
  .pt-search:focus-within { border-color: #DFAB62; }
  .pt-search input { border: none; outline: none; background: transparent; padding: 10px 0; font: inherit; font-size: 0.9rem; color: #2A170F; width: 100%; }
  .pt-alert { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.88rem; }
  .pt-alert button { background: none; border: none; color: #991B1B; font-weight: 600; text-decoration: underline; cursor: pointer; }
  .pt-table-card { background: #fff; border: 1.5px solid #E8DCC8; border-radius: 16px; overflow: hidden; }
  .pt-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
  .pt-table thead th { position: sticky; top: 0; background: #FAF6EE; text-align: left; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #6B5E55; padding: 11px 16px; border-bottom: 1px solid #E8DCC8; white-space: nowrap; }
  .pt-sort { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
  .pt-sort.on { color: #2A170F; }
  .pt-sort:focus-visible { outline: 2px solid #DFAB62; outline-offset: 2px; border-radius: 4px; }
  .pt-table tbody tr { cursor: pointer; transition: background .12s; }
  .pt-table tbody tr:not(:last-child) td { border-bottom: 1px solid #F0EAE1; }
  .pt-table tbody tr:hover { background: #FDFAF4; }
  .pt-table tbody tr:focus-visible { outline: 2px solid #DFAB62; outline-offset: -2px; }
  .pt-table tbody tr.selected { background: #FAF2E4; }
  .pt-table td { padding: 12px 16px; vertical-align: middle; }
  .pt-person { display: flex; align-items: center; gap: 12px; min-width: 0; }
  .pt-avatar { width: 36px; height: 36px; border-radius: 50%; background: #2A170F; color: #DFAB62; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; flex-shrink: 0; }
  .pt-person-text { display: flex; flex-direction: column; min-width: 0; }
  .pt-name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pt-email { color: #8A7B72; font-size: 0.78rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .pt-col-num { text-align: right; width: 80px; font-variant-numeric: tabular-nums; }
  .pt-table th.pt-col-num { text-align: right; }
  .pt-col-age { width: 60px; font-variant-numeric: tabular-nums; }
  .pt-col-date { width: 150px; white-space: nowrap; }
  .pt-col-go { width: 40px; text-align: right; }
  .pt-next { display: inline-block; background: #FAF2E4; color: #A86C38; border: 1px solid #EBD3A8; border-radius: 999px; padding: 2px 10px; font-size: 0.8rem; font-weight: 500; }
  .pt-dim { color: #B5A99F; }
  .pt-skel td span { display: block; height: 16px; border-radius: 6px; background: linear-gradient(90deg, #F3ECE0, #FAF6EE, #F3ECE0); background-size: 200% 100%; animation: pt-shimmer 1.2s infinite; }
  @keyframes pt-shimmer { to { background-position: -200% 0; } }
  .pt-empty { padding: 48px 20px; text-align: center; color: #6B5E55; display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .pt-foot { color: #8A7B72; font-size: 0.78rem; margin: 10px 4px 0; }
  @media (max-width: 960px) { .pt-col-phone, .pt-col-age { display: none; } }
  @media (max-width: 640px) {
    .pt-search { min-width: 0; width: 100%; }
    .pt-col-num, .pt-col-next { display: none; }
    .pt-col-date { width: auto; font-size: 0.8rem; }
    .pt-table td, .pt-table thead th { padding-left: 12px; padding-right: 12px; }
  }
  @media (prefers-reduced-motion: reduce) { .pt-skel td span { animation: none; } }
`;
