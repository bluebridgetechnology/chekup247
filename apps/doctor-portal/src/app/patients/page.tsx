'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../../components/common/SolarIcon';

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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const ageOf = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');

export default function MyPatientsPage() {
  const { token } = useDoctorAuth();
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (q: string) => {
      if (!token) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/ehr/patients${q ? `?q=${encodeURIComponent(q)}` : ''}`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Could not load patients');
        setPatients(await res.json());
      } catch (e: any) {
        setError(e?.message || 'Could not load patients');
      } finally {
        setLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const t = setTimeout(() => load(query), 250);
    return () => clearTimeout(t);
  }, [query, load]);

  return (
    <div className="ehr-page">
      <style>{EHR_LIST_CSS}</style>
      <div className="ehr-wrap">
        <header className="ehr-head">
          <div>
            <h1>My Patients</h1>
            <p>Everyone you have a confirmed or completed consultation with. Open a chart to see their health record.</p>
          </div>
          <input
            className="ehr-search"
            type="search"
            placeholder="Search by name, email or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search patients"
          />
        </header>

        {error && <div className="ehr-alert">{error}</div>}

        {loading && patients.length === 0 ? (
          <div className="ehr-empty">Loading patients…</div>
        ) : patients.length === 0 ? (
          <div className="ehr-empty">
            <SolarIcon name="users-group-rounded-linear" size={32} color="#B88647" />
            <p>{query ? 'No patients match your search.' : 'No patients yet. They appear here after a booking is confirmed.'}</p>
          </div>
        ) : (
          <ul className="ehr-list">
            {patients.map((p) => {
              const age = ageOf(p.date_of_birth);
              return (
                <li key={p.patient_id}>
                  <Link href={`/patients/${p.patient_id}`} className="ehr-row">
                    <span className="ehr-avatar" aria-hidden>
                      {initials(p.full_name)}
                    </span>
                    <span className="ehr-main">
                      <span className="ehr-name">{p.full_name}</span>
                      <span className="ehr-sub">
                        {[age !== null ? `${age} yrs` : null, p.phone || p.email].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                    <span className="ehr-stat">
                      <span className="ehr-k">Visits</span>
                      <span className="ehr-v">{p.visits}</span>
                    </span>
                    <span className="ehr-stat">
                      <span className="ehr-k">Last visit</span>
                      <span className="ehr-v">{fmtDate(p.last_visit_at)}</span>
                    </span>
                    <span className="ehr-stat">
                      <span className="ehr-k">Next</span>
                      <span className="ehr-v">{fmtDate(p.next_appointment_at)}</span>
                    </span>
                    <SolarIcon name="alt-arrow-right-linear" size={18} color="#B88647" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

const EHR_LIST_CSS = `
  .ehr-page { min-height: 100vh; background: #FAF6EE; padding: 24px 16px 60px; box-sizing: border-box; color: #2A170F; }
  .ehr-wrap { max-width: 980px; margin: 0 auto; }
  .ehr-head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
  .ehr-head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em; }
  .ehr-head p { margin: 4px 0 0; color: #6B5E55; font-size: 0.9rem; max-width: 520px; }
  .ehr-search { padding: 10px 14px; border-radius: 12px; border: 1.5px solid #DDD0BC; background: #fff; font-size: 0.9rem; min-width: 260px; max-width: 100%; color: #2A170F; }
  .ehr-alert { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; border-radius: 12px; padding: 10px 14px; margin-bottom: 14px; font-size: 0.88rem; }
  .ehr-empty { background: #fff; border: 1.5px dashed #DDD0BC; border-radius: 16px; padding: 48px 20px; text-align: center; color: #6B5E55; display: flex; flex-direction: column; align-items: center; gap: 8px; }
  .ehr-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .ehr-row { display: flex; align-items: center; gap: 16px; background: #fff; border: 1.5px solid #E8DCC8; border-radius: 14px; padding: 14px 16px; text-decoration: none; color: inherit; }
  .ehr-row:hover { border-color: #DFAB62; }
  .ehr-avatar { width: 42px; height: 42px; border-radius: 50%; background: #2A170F; color: #DFAB62; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; flex-shrink: 0; }
  .ehr-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .ehr-name { font-weight: 600; font-size: 0.98rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ehr-sub { color: #6B5E55; font-size: 0.8rem; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .ehr-stat { display: flex; flex-direction: column; min-width: 86px; }
  .ehr-k { font-size: 0.66rem; text-transform: uppercase; letter-spacing: .06em; color: #8A7B72; font-weight: 600; }
  .ehr-v { font-size: 0.86rem; font-weight: 500; margin-top: 2px; }
  @media (max-width: 720px) {
    .ehr-stat { display: none; }
    .ehr-search { width: 100%; min-width: 0; }
  }
`;
