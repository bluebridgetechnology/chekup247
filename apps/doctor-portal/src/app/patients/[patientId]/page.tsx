'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useDoctorAuth } from '../../../context/DoctorAuthContext';
import { SolarIcon } from '../../../components/common/SolarIcon';
import { toastError, toastSuccess } from '../../../lib/toast';

interface Medication {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
}

interface Chart {
  patient: { id: string; full_name: string; email: string; phone: string; date_of_birth: string | null; gender: string | null };
  profile: { blood_group: string | null; genotype: string | null; allergies: string | null; chronic_conditions: string | null; updated_at: string | null };
  problems: Array<{
    id: string;
    description: string;
    icd10_code: string | null;
    status: 'active' | 'resolved';
    onset_date: string | null;
    notes: string | null;
    created_at: string;
  }>;
  vitals: Array<{
    id: string;
    recorded_by: string;
    recorded_at: string;
    bp_systolic: number | null;
    bp_diastolic: number | null;
    heart_rate: number | null;
    respiratory_rate: number | null;
    temperature_c: string | number | null;
    spo2: number | null;
    weight_kg: string | number | null;
    height_cm: string | number | null;
    glucose_mmol: string | number | null;
    notes: string | null;
  }>;
  encounters: Array<{
    booking_id: string;
    at: string;
    status: string;
    mode: string;
    reason: string | null;
    patient_note: string | null;
    notes: { chief_complaint: string; history: string; assessment: string; plan: string; patient_instructions: string } | null;
    prescriptions: Array<{ id: string; icd10_code: string; issued_at: string; schedule_flag: string | null; medications: Medication[] }>;
  }>;
  documents: Array<{ id: string; title: string; category: string; original_filename: string; created_at: string; downloadUrl: string | null }>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

const fmtDate = (v?: string | null) =>
  v ? new Date(v).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
const fmtDateTime = (v?: string | null) =>
  v ? new Date(v).toLocaleString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
const ageOf = (dob: string | null) => {
  if (!dob) return null;
  const d = new Date(dob);
  return Number.isNaN(d.getTime()) ? null : Math.floor((Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
};
const num = (v: string) => (v.trim() === '' ? undefined : Number(v));

const EMPTY_VITALS = {
  bp_systolic: '',
  bp_diastolic: '',
  heart_rate: '',
  respiratory_rate: '',
  temperature_c: '',
  spo2: '',
  weight_kg: '',
  height_cm: '',
  glucose_mmol: '',
  notes: '',
};

export default function PatientChartPage() {
  const params = useParams();
  const patientId = typeof params?.patientId === 'string' ? params.patientId : '';
  const { token, doctor } = useDoctorAuth();

  const [chart, setChart] = useState<Chart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ blood_group: '', genotype: '', allergies: '', chronic_conditions: '' });
  const [showProblemForm, setShowProblemForm] = useState(false);
  const [problemForm, setProblemForm] = useState({ description: '', icd10_code: '', onset_date: '' });
  const [showVitalsForm, setShowVitalsForm] = useState(false);
  const [vitalsForm, setVitalsForm] = useState(EMPTY_VITALS);
  const [showResolved, setShowResolved] = useState(false);
  const [openEncounter, setOpenEncounter] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const headers = useCallback(
    () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }),
    [token],
  );

  const load = useCallback(async () => {
    if (!token || !patientId) return;
    try {
      const res = await fetch(`${API_BASE}/ehr/patients/${patientId}/chart`, { headers: headers(), credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(res.status === 403 ? 'You can only open charts of patients you have a confirmed or completed consultation with.' : body.message || 'Could not load the chart');
      }
      const data: Chart = await res.json();
      setChart(data);
      setProfileForm({
        blood_group: data.profile.blood_group || '',
        genotype: data.profile.genotype || '',
        allergies: data.profile.allergies || '',
        chronic_conditions: data.profile.chronic_conditions || '',
      });
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load the chart');
    } finally {
      setLoading(false);
    }
  }, [token, patientId, headers]);

  useEffect(() => {
    load();
  }, [load]);

  const send = async (path: string, method: string, body: unknown, success: string) => {
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/ehr/patients/${patientId}${path}`, {
        method,
        headers: headers(),
        credentials: 'include',
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = Array.isArray(data.message) ? data.message.join(', ') : data.message;
        throw new Error(data.errors?.[0] ? `${data.errors[0].property}: ${Object.values(data.errors[0].constraints || {})[0]}` : msg || 'Request failed');
      }
      toastSuccess(success);
      await load();
      return true;
    } catch (e: any) {
      toastError('Could not save', e?.message);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveProfile = async () => {
    if (await send('/profile', 'PUT', profileForm, 'Health profile updated')) setEditingProfile(false);
  };

  const addProblem = async () => {
    if (!problemForm.description.trim()) return toastError('Add a description');
    const ok = await send(
      '/problems',
      'POST',
      {
        description: problemForm.description.trim(),
        ...(problemForm.icd10_code.trim() ? { icd10_code: problemForm.icd10_code.trim() } : {}),
        ...(problemForm.onset_date ? { onset_date: problemForm.onset_date } : {}),
      },
      'Problem added',
    );
    if (ok) {
      setProblemForm({ description: '', icd10_code: '', onset_date: '' });
      setShowProblemForm(false);
    }
  };

  const addVitals = async () => {
    const body: Record<string, unknown> = {};
    (['bp_systolic', 'bp_diastolic', 'heart_rate', 'respiratory_rate', 'temperature_c', 'spo2', 'weight_kg', 'height_cm', 'glucose_mmol'] as const).forEach((k) => {
      const v = num(vitalsForm[k]);
      if (v !== undefined && !Number.isNaN(v)) body[k] = v;
    });
    if (vitalsForm.notes.trim()) body.notes = vitalsForm.notes.trim();
    if (Object.keys(body).filter((k) => k !== 'notes').length === 0) return toastError('Enter at least one measurement');
    const ok = await send('/vitals', 'POST', body, 'Vitals recorded');
    if (ok) {
      setVitalsForm(EMPTY_VITALS);
      setShowVitalsForm(false);
    }
  };

  if (loading) {
    return (
      <div className="chart-page">
        <style>{CHART_CSS}</style>
        <div className="chart-wrap chart-muted">Loading chart…</div>
      </div>
    );
  }

  if (error || !chart) {
    return (
      <div className="chart-page">
        <style>{CHART_CSS}</style>
        <div className="chart-wrap">
          <Link href="/patients" className="chart-back">
            <SolarIcon name="arrow-left-linear" size={16} /> My Patients
          </Link>
          <div className="chart-alert">{error || 'Chart unavailable'}</div>
        </div>
      </div>
    );
  }

  const { patient, profile, problems, vitals, encounters, documents } = chart;
  const age = ageOf(patient.date_of_birth);
  const active = problems.filter((p) => p.status === 'active');
  const resolved = problems.filter((p) => p.status === 'resolved');
  const latest = vitals[0];

  return (
    <div className="chart-page">
      <style>{CHART_CSS}</style>
      <div className="chart-wrap">
        <Link href="/patients" className="chart-back">
          <SolarIcon name="arrow-left-linear" size={16} /> My Patients
        </Link>

        <header className="chart-head">
          <div>
            <h1>{patient.full_name}</h1>
            <p>
              {[age !== null ? `${age} years` : null, patient.gender, patient.phone, patient.email].filter(Boolean).join(' · ')}
            </p>
          </div>
        </header>

        {profile.allergies && (
          <div className="chart-allergy" role="alert">
            <SolarIcon name="danger-triangle-linear" size={20} color="#B91C1C" />
            <div>
              <strong>Allergies</strong>
              <div>{profile.allergies}</div>
            </div>
          </div>
        )}

        <div className="chart-grid">
          <div className="chart-col">
            {/* Encounters */}
            <section className="chart-card">
              <h2>
                <SolarIcon name="stethoscope-linear" size={18} color="#B88647" /> Your consultations
                <span className="chart-count">{encounters.length}</span>
              </h2>
              {encounters.length === 0 && <p className="chart-muted">No consultations yet.</p>}
              <ul className="chart-timeline">
                {encounters.map((enc) => {
                  const open = openEncounter === enc.booking_id;
                  const dx = enc.prescriptions[0]?.icd10_code;
                  return (
                    <li key={enc.booking_id} className="chart-enc">
                      <button type="button" className="chart-enc-head" onClick={() => setOpenEncounter(open ? null : enc.booking_id)} aria-expanded={open}>
                        <span>
                          <span className="chart-enc-date">{fmtDateTime(enc.at)}</span>
                          <span className="chart-enc-sub">
                            {[enc.mode, enc.reason, dx ? `ICD-10 ${dx}` : null].filter(Boolean).join(' · ')}
                          </span>
                        </span>
                        <span className={`chart-pill ${enc.status === 'completed' ? 'done' : ''}`}>{enc.status}</span>
                      </button>
                      {open && (
                        <div className="chart-enc-body">
                          {enc.patient_note && <Field label="Patient's note" value={enc.patient_note} />}
                          {enc.notes ? (
                            <>
                              <Field label="Chief complaint" value={enc.notes.chief_complaint} />
                              <Field label="History" value={enc.notes.history} />
                              <Field label="Assessment" value={enc.notes.assessment} />
                              <Field label="Plan" value={enc.notes.plan} />
                              <Field label="Patient instructions" value={enc.notes.patient_instructions} />
                            </>
                          ) : (
                            <p className="chart-muted">No clinical notes were saved for this consultation.</p>
                          )}
                          {enc.prescriptions.map((rx) => (
                            <div key={rx.id} className="chart-rx">
                              <div className="chart-rx-head">
                                <span>
                                  <SolarIcon name="pill-linear" size={15} color="#B88647" /> Prescription · {fmtDate(rx.issued_at)}
                                  {rx.schedule_flag ? ` · ${rx.schedule_flag}` : ''}
                                </span>
                                <a href={`${API_BASE}/prescriptions/${rx.id}/download`} className="chart-link">
                                  PDF
                                </a>
                              </div>
                              <ul>
                                {rx.medications.map((m, i) => (
                                  <li key={i}>
                                    <strong>{m.name}</strong>
                                    {[m.dosage, m.frequency, m.duration].filter(Boolean).length > 0 && (
                                      <span className="chart-muted"> — {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="chart-note">Clinical notes and prescriptions from other doctors are private to them.</p>
            </section>

            {/* Documents */}
            <section className="chart-card">
              <h2>
                <SolarIcon name="folder-with-files-linear" size={18} color="#B88647" /> Patient documents
                <span className="chart-count">{documents.length}</span>
              </h2>
              {documents.length === 0 && <p className="chart-muted">The patient has not uploaded any documents.</p>}
              <ul className="chart-docs">
                {documents.map((d) => (
                  <li key={d.id}>
                    <span>
                      <strong>{d.title}</strong>
                      <span className="chart-muted">
                        {' '}
                        · {d.category.replace(/_/g, ' ')} · {fmtDate(d.created_at)}
                      </span>
                    </span>
                    {d.downloadUrl ? (
                      <a href={d.downloadUrl} target="_blank" rel="noreferrer" className="chart-link">
                        Open
                      </a>
                    ) : (
                      <span className="chart-muted">Unavailable</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <div className="chart-col">
            {/* Health profile */}
            <section className="chart-card">
              <h2>
                <SolarIcon name="heart-pulse-linear" size={18} color="#B88647" /> Health profile
                {!editingProfile && (
                  <button type="button" className="chart-ghost" onClick={() => setEditingProfile(true)}>
                    Edit
                  </button>
                )}
              </h2>
              {editingProfile ? (
                <div className="chart-form">
                  <div className="chart-row2">
                    <label>
                      Blood group
                      <input value={profileForm.blood_group} maxLength={10} onChange={(e) => setProfileForm({ ...profileForm, blood_group: e.target.value })} />
                    </label>
                    <label>
                      Genotype
                      <input value={profileForm.genotype} maxLength={10} onChange={(e) => setProfileForm({ ...profileForm, genotype: e.target.value })} />
                    </label>
                  </div>
                  <label>
                    Allergies
                    <textarea rows={2} value={profileForm.allergies} onChange={(e) => setProfileForm({ ...profileForm, allergies: e.target.value })} />
                  </label>
                  <label>
                    Chronic conditions
                    <textarea rows={2} value={profileForm.chronic_conditions} onChange={(e) => setProfileForm({ ...profileForm, chronic_conditions: e.target.value })} />
                  </label>
                  <div className="chart-actions">
                    <button type="button" className="chart-btn" disabled={busy} onClick={saveProfile}>
                      Save
                    </button>
                    <button type="button" className="chart-btn secondary" onClick={() => setEditingProfile(false)}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <dl className="chart-dl">
                  <div>
                    <dt>Blood group</dt>
                    <dd>{profile.blood_group || '—'}</dd>
                  </div>
                  <div>
                    <dt>Genotype</dt>
                    <dd>{profile.genotype || '—'}</dd>
                  </div>
                  <div className="wide">
                    <dt>Allergies</dt>
                    <dd>{profile.allergies || 'None recorded'}</dd>
                  </div>
                  <div className="wide">
                    <dt>Chronic conditions</dt>
                    <dd>{profile.chronic_conditions || 'None recorded'}</dd>
                  </div>
                </dl>
              )}
            </section>

            {/* Problem list */}
            <section className="chart-card">
              <h2>
                <SolarIcon name="clipboard-list-linear" size={18} color="#B88647" /> Problem list
                <button type="button" className="chart-ghost" onClick={() => setShowProblemForm((v) => !v)}>
                  {showProblemForm ? 'Close' : 'Add'}
                </button>
              </h2>
              {showProblemForm && (
                <div className="chart-form">
                  <label>
                    Problem / diagnosis
                    <input value={problemForm.description} maxLength={255} onChange={(e) => setProblemForm({ ...problemForm, description: e.target.value })} />
                  </label>
                  <div className="chart-row2">
                    <label>
                      ICD-10 code
                      <input value={problemForm.icd10_code} maxLength={20} onChange={(e) => setProblemForm({ ...problemForm, icd10_code: e.target.value })} />
                    </label>
                    <label>
                      Onset date
                      <input type="date" value={problemForm.onset_date} onChange={(e) => setProblemForm({ ...problemForm, onset_date: e.target.value })} />
                    </label>
                  </div>
                  <div className="chart-actions">
                    <button type="button" className="chart-btn" disabled={busy} onClick={addProblem}>
                      Add problem
                    </button>
                  </div>
                </div>
              )}
              {active.length === 0 && !showProblemForm && <p className="chart-muted">No active problems.</p>}
              <ul className="chart-problems">
                {active.map((p) => (
                  <li key={p.id}>
                    <span>
                      <strong>{p.description}</strong>
                      <span className="chart-muted">
                        {[p.icd10_code, p.onset_date ? `since ${fmtDate(p.onset_date)}` : null].filter(Boolean).length > 0 &&
                          ` · ${[p.icd10_code, p.onset_date ? `since ${fmtDate(p.onset_date)}` : null].filter(Boolean).join(' · ')}`}
                      </span>
                    </span>
                    <button type="button" className="chart-ghost" disabled={busy} onClick={() => send(`/problems/${p.id}`, 'PUT', { status: 'resolved' }, 'Marked as resolved')}>
                      Resolve
                    </button>
                  </li>
                ))}
              </ul>
              {resolved.length > 0 && (
                <>
                  <button type="button" className="chart-ghost" onClick={() => setShowResolved((v) => !v)}>
                    {showResolved ? 'Hide' : 'Show'} resolved ({resolved.length})
                  </button>
                  {showResolved && (
                    <ul className="chart-problems resolved">
                      {resolved.map((p) => (
                        <li key={p.id}>
                          <span>
                            {p.description}
                            {p.icd10_code ? <span className="chart-muted"> · {p.icd10_code}</span> : null}
                          </span>
                          <button type="button" className="chart-ghost" disabled={busy} onClick={() => send(`/problems/${p.id}`, 'PUT', { status: 'active' }, 'Reopened')}>
                            Reopen
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </section>

            {/* Vitals */}
            <section className="chart-card">
              <h2>
                <SolarIcon name="thermometer-linear" size={18} color="#B88647" /> Vitals
                <button type="button" className="chart-ghost" onClick={() => setShowVitalsForm((v) => !v)}>
                  {showVitalsForm ? 'Close' : 'Record'}
                </button>
              </h2>
              {showVitalsForm && (
                <div className="chart-form">
                  <div className="chart-row3">
                    <Num label="BP systolic" unit="mmHg" v={vitalsForm.bp_systolic} on={(v) => setVitalsForm({ ...vitalsForm, bp_systolic: v })} />
                    <Num label="BP diastolic" unit="mmHg" v={vitalsForm.bp_diastolic} on={(v) => setVitalsForm({ ...vitalsForm, bp_diastolic: v })} />
                    <Num label="Heart rate" unit="bpm" v={vitalsForm.heart_rate} on={(v) => setVitalsForm({ ...vitalsForm, heart_rate: v })} />
                    <Num label="Resp. rate" unit="/min" v={vitalsForm.respiratory_rate} on={(v) => setVitalsForm({ ...vitalsForm, respiratory_rate: v })} />
                    <Num label="Temperature" unit="°C" step="0.1" v={vitalsForm.temperature_c} on={(v) => setVitalsForm({ ...vitalsForm, temperature_c: v })} />
                    <Num label="SpO₂" unit="%" v={vitalsForm.spo2} on={(v) => setVitalsForm({ ...vitalsForm, spo2: v })} />
                    <Num label="Weight" unit="kg" step="0.1" v={vitalsForm.weight_kg} on={(v) => setVitalsForm({ ...vitalsForm, weight_kg: v })} />
                    <Num label="Height" unit="cm" step="0.1" v={vitalsForm.height_cm} on={(v) => setVitalsForm({ ...vitalsForm, height_cm: v })} />
                    <Num label="Glucose" unit="mmol/L" step="0.1" v={vitalsForm.glucose_mmol} on={(v) => setVitalsForm({ ...vitalsForm, glucose_mmol: v })} />
                  </div>
                  <label>
                    Notes
                    <input value={vitalsForm.notes} maxLength={2000} onChange={(e) => setVitalsForm({ ...vitalsForm, notes: e.target.value })} />
                  </label>
                  <div className="chart-actions">
                    <button type="button" className="chart-btn" disabled={busy} onClick={addVitals}>
                      Save vitals
                    </button>
                  </div>
                </div>
              )}
              {latest ? (
                <>
                  <p className="chart-muted">Latest · {fmtDateTime(latest.recorded_at)}</p>
                  <div className="chart-tiles">
                    <Tile label="BP" value={latest.bp_systolic ? `${latest.bp_systolic}/${latest.bp_diastolic}` : null} unit="mmHg" />
                    <Tile label="Heart rate" value={latest.heart_rate} unit="bpm" />
                    <Tile label="Temp" value={latest.temperature_c} unit="°C" />
                    <Tile label="SpO₂" value={latest.spo2} unit="%" />
                    <Tile label="Weight" value={latest.weight_kg} unit="kg" />
                    <Tile label="Glucose" value={latest.glucose_mmol} unit="mmol/L" />
                  </div>
                </>
              ) : (
                !showVitalsForm && <p className="chart-muted">No vitals recorded.</p>
              )}
              {vitals.length > 1 && (
                <details className="chart-history">
                  <summary>History ({vitals.length})</summary>
                  <ul>
                    {vitals.map((v) => (
                      <li key={v.id}>
                        <span>
                          {fmtDate(v.recorded_at)} ·{' '}
                          {[
                            v.bp_systolic ? `BP ${v.bp_systolic}/${v.bp_diastolic}` : null,
                            v.heart_rate ? `HR ${v.heart_rate}` : null,
                            v.temperature_c ? `${v.temperature_c}°C` : null,
                            v.spo2 ? `SpO₂ ${v.spo2}%` : null,
                            v.weight_kg ? `${v.weight_kg}kg` : null,
                          ]
                            .filter(Boolean)
                            .join(' · ') || 'Recorded'}
                        </span>
                        {v.recorded_by === doctor?.id && (
                          <button
                            type="button"
                            className="chart-ghost danger"
                            disabled={busy}
                            aria-label="Delete vitals entry"
                            onClick={() => window.confirm('Delete this vitals entry?') && send(`/vitals/${v.id}`, 'DELETE', undefined, 'Vitals removed')}
                          >
                            <SolarIcon name="trash-bin-trash-linear" size={15} />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="chart-field">
      <div className="chart-k">{label}</div>
      <div className="chart-text">{value}</div>
    </div>
  );
}

function Tile({ label, value, unit }: { label: string; value: string | number | null; unit: string }) {
  return (
    <div className="chart-tile">
      <div className="chart-k">{label}</div>
      <div className="chart-tv">{value !== null && value !== undefined && value !== '' ? value : '—'}</div>
      {value !== null && value !== undefined && value !== '' && <div className="chart-unit">{unit}</div>}
    </div>
  );
}

function Num({ label, unit, v, on, step }: { label: string; unit: string; v: string; on: (v: string) => void; step?: string }) {
  return (
    <label>
      {label} <span className="chart-muted">({unit})</span>
      <input type="number" inputMode="decimal" step={step || '1'} value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );
}

const CHART_CSS = `
  .chart-page { min-height: 100vh; background: #FAF6EE; padding: 20px 16px 60px; box-sizing: border-box; color: #2A170F; }
  .chart-wrap { max-width: 1100px; margin: 0 auto; }
  .chart-back { display: inline-flex; align-items: center; gap: 6px; color: #6B5E55; text-decoration: none; font-size: 0.85rem; font-weight: 500; margin-bottom: 10px; }
  .chart-head h1 { margin: 0; font-size: 1.6rem; font-weight: 600; letter-spacing: -0.02em; }
  .chart-head p { margin: 4px 0 16px; color: #6B5E55; font-size: 0.9rem; }
  .chart-alert { background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; border-radius: 12px; padding: 12px 16px; font-size: 0.9rem; }
  .chart-allergy { display: flex; gap: 12px; align-items: flex-start; background: #FEF2F2; border: 1.5px solid #FECACA; color: #7F1D1D; border-radius: 14px; padding: 12px 16px; margin-bottom: 16px; font-size: 0.9rem; }
  .chart-grid { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; align-items: start; }
  .chart-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .chart-card { background: #fff; border: 1.5px solid #E8DCC8; border-radius: 16px; padding: 18px 20px; }
  .chart-card h2 { margin: 0 0 12px; font-size: 0.95rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
  .chart-count { background: #2A170F; color: #fff; border-radius: 999px; font-size: 0.68rem; padding: 1px 8px; font-weight: 500; }
  .chart-card h2 .chart-ghost { margin-left: auto; }
  .chart-muted { color: #6B5E55; font-size: 0.85rem; }
  .chart-note { color: #8A7B72; font-size: 0.74rem; margin: 12px 0 0; }
  .chart-ghost { background: none; border: none; color: #A86C38; font-weight: 600; font-size: 0.8rem; cursor: pointer; padding: 2px 4px; }
  .chart-ghost.danger { color: #B91C1C; }
  .chart-ghost:disabled { opacity: .5; cursor: default; }
  .chart-link { color: #A86C38; font-weight: 600; font-size: 0.82rem; text-decoration: none; }
  .chart-timeline, .chart-docs, .chart-problems { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .chart-enc { border: 1px solid #EDE4D4; border-radius: 12px; overflow: hidden; }
  .chart-enc-head { width: 100%; display: flex; justify-content: space-between; align-items: center; gap: 10px; background: #FAF6EE; border: none; padding: 10px 14px; cursor: pointer; text-align: left; color: inherit; font: inherit; }
  .chart-enc-date { display: block; font-weight: 600; font-size: 0.88rem; }
  .chart-enc-sub { display: block; color: #6B5E55; font-size: 0.78rem; margin-top: 2px; text-transform: capitalize; }
  .chart-pill { font-size: 0.7rem; font-weight: 600; text-transform: capitalize; padding: 2px 10px; border-radius: 999px; background: #F0E7D8; color: #5C4F46; }
  .chart-pill.done { background: #FAF2E4; color: #A86C38; border: 1px solid #EBD3A8; }
  .chart-enc-body { padding: 12px 14px 14px; display: flex; flex-direction: column; gap: 10px; }
  .chart-field .chart-k, .chart-k { font-size: 0.66rem; text-transform: uppercase; letter-spacing: .06em; color: #8A7B72; font-weight: 600; }
  .chart-text { font-size: 0.88rem; white-space: pre-wrap; margin-top: 2px; }
  .chart-rx { background: #FFFBF3; border-left: 3px solid #DFAB62; border-radius: 6px; padding: 8px 12px; font-size: 0.85rem; }
  .chart-rx-head { display: flex; justify-content: space-between; align-items: center; font-weight: 600; margin-bottom: 4px; }
  .chart-rx ul { margin: 4px 0 0; padding-left: 18px; }
  .chart-docs li, .chart-problems li { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 0.88rem; padding: 8px 0; border-bottom: 1px solid #F0EAE1; }
  .chart-docs li:last-child, .chart-problems li:last-child { border-bottom: none; }
  .chart-problems.resolved { opacity: .75; margin-top: 6px; }
  .chart-dl { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0; }
  .chart-dl dt { font-size: 0.66rem; text-transform: uppercase; letter-spacing: .06em; color: #8A7B72; font-weight: 600; }
  .chart-dl dd { margin: 2px 0 0; font-size: 0.9rem; font-weight: 500; white-space: pre-wrap; }
  .chart-dl .wide { grid-column: 1 / -1; }
  .chart-form { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
  .chart-form label { display: flex; flex-direction: column; gap: 4px; font-size: 0.78rem; font-weight: 600; color: #4A3B32; }
  .chart-form input, .chart-form textarea { padding: 8px 10px; border-radius: 10px; border: 1.5px solid #DDD0BC; font: inherit; font-size: 0.88rem; font-weight: 400; color: #2A170F; background: #fff; width: 100%; box-sizing: border-box; }
  .chart-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .chart-row3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .chart-actions { display: flex; gap: 8px; }
  .chart-btn { background: #DFAB62; border: 1.5px solid #DFAB62; color: #2A170F; font-weight: 600; font-size: 0.85rem; padding: 8px 16px; border-radius: 10px; cursor: pointer; }
  .chart-btn.secondary { background: #fff; border-color: #DDD0BC; }
  .chart-btn:disabled { opacity: .6; cursor: default; }
  .chart-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .chart-tile { background: #FAF6EE; border: 1px solid #EDE4D4; border-radius: 12px; padding: 8px 10px; }
  .chart-tv { font-size: 1.05rem; font-weight: 600; margin-top: 2px; }
  .chart-unit { font-size: 0.68rem; color: #8A7B72; }
  .chart-history { margin-top: 12px; font-size: 0.85rem; }
  .chart-history summary { cursor: pointer; color: #A86C38; font-weight: 600; }
  .chart-history ul { list-style: none; margin: 8px 0 0; padding: 0; }
  .chart-history li { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #F0EAE1; }
  @media (max-width: 900px) {
    .chart-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 520px) {
    .chart-row3 { grid-template-columns: 1fr 1fr; }
    .chart-tiles { grid-template-columns: 1fr 1fr; }
  }
`;
