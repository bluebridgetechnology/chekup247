'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { SolarIcon } from '../common/SolarIcon';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastError, toastSuccess } from '../../lib/toast';
import { API_BASE, ageOf, fmtDate, fmtDateTime, initials, splitList } from './format';

interface Medication {
  name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
}

interface Vital {
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
}

interface Chart {
  patient: { id: string; full_name: string; email: string; phone: string; date_of_birth: string | null; gender: string | null };
  profile: { blood_group: string | null; genotype: string | null; allergies: string | null; chronic_conditions: string | null };
  problems: Array<{ id: string; description: string; icd10_code: string | null; status: 'active' | 'resolved'; onset_date: string | null }>;
  vitals: Vital[];
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
  documents: Array<{ id: string; title: string; category: string; created_at: string; downloadUrl: string | null }>;
}

type Tab = 'overview' | 'visits' | 'vitals' | 'documents';

const VITAL_KEYS = ['bp_systolic', 'bp_diastolic', 'heart_rate', 'respiratory_rate', 'temperature_c', 'spo2', 'weight_kg', 'height_cm', 'glucose_mmol'] as const;
const EMPTY_VITALS: Record<(typeof VITAL_KEYS)[number] | 'notes', string> = {
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

const has = (v: unknown) => v !== null && v !== undefined && v !== '';

export function PatientChartSheet({ patientId, token, onClose }: { patientId: string; token: string; onClose: () => void }) {
  const { doctor } = useDoctorAuth();
  const [chart, setChart] = useState<Chart | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('overview');
  const [entered, setEntered] = useState(false);
  const [busy, setBusy] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ blood_group: '', genotype: '', allergies: '', chronic_conditions: '' });
  const [problemOpen, setProblemOpen] = useState(false);
  const [problemForm, setProblemForm] = useState({ description: '', icd10_code: '', onset_date: '' });
  const [showResolved, setShowResolved] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [vitalsForm, setVitalsForm] = useState(EMPTY_VITALS);
  const [openVisit, setOpenVisit] = useState<string | null>(null);

  const headers = useCallback(() => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/ehr/patients/${patientId}/chart`, { headers: headers(), credentials: 'include' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          res.status === 403
            ? 'You can only open charts of patients you have a confirmed or completed consultation with.'
            : body.message || 'Could not load the chart',
        );
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
    }
  }, [patientId, headers]);

  // Reset when switching patients while the sheet stays open
  useEffect(() => {
    setChart(null);
    setError(null);
    setTab('overview');
    setEditingProfile(false);
    setProblemOpen(false);
    setVitalsOpen(false);
    setOpenVisit(null);
    load();
  }, [load]);

  // Enter animation, focus, Escape to close, lock page scroll
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true));
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

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
        const first = data.errors?.[0];
        throw new Error(first ? `${first.property}: ${Object.values(first.constraints || {})[0]}` : data.message || 'Request failed');
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
      setProblemOpen(false);
    }
  };

  const addVitals = async () => {
    const body: Record<string, unknown> = {};
    VITAL_KEYS.forEach((k) => {
      const raw = vitalsForm[k].trim();
      if (raw !== '' && !Number.isNaN(Number(raw))) body[k] = Number(raw);
    });
    if (Object.keys(body).length === 0) return toastError('Enter at least one measurement');
    if (vitalsForm.notes.trim()) body.notes = vitalsForm.notes.trim();
    if (await send('/vitals', 'POST', body, 'Vitals recorded')) {
      setVitalsForm(EMPTY_VITALS);
      setVitalsOpen(false);
    }
  };

  const age = chart ? ageOf(chart.patient.date_of_birth) : null;
  const allergies = splitList(chart?.profile.allergies);
  const conditions = splitList(chart?.profile.chronic_conditions);
  const active = chart?.problems.filter((p) => p.status === 'active') || [];
  const resolved = chart?.problems.filter((p) => p.status === 'resolved') || [];
  const latest = chart?.vitals[0];

  return (
    <div className={`sh-root ${entered ? 'in' : ''}`}>
      <style>{SHEET_CSS}</style>
      <div className="sh-backdrop" onClick={onClose} aria-hidden />
      <aside className="sh-panel" role="dialog" aria-modal="true" aria-labelledby="sh-title">
        <div className="sh-grab" aria-hidden />

        <header className="sh-head">
          <span className="sh-avatar" aria-hidden>
            {chart ? initials(chart.patient.full_name) : ''}
          </span>
          <div className="sh-id">
            <h2 id="sh-title">{chart?.patient.full_name || (error ? 'Patient chart' : 'Loading…')}</h2>
            {chart && (
              <p>{[
                  age !== null ? `${age} yrs` : null,
                  chart.patient.gender ? chart.patient.gender[0].toUpperCase() + chart.patient.gender.slice(1) : null,
                  chart.patient.phone,
                ].filter(Boolean).join(' · ') || chart.patient.email}</p>
            )}
          </div>
          <button ref={closeRef} type="button" className="sh-close" onClick={onClose} aria-label="Close chart">
            <SolarIcon name="close-linear" size={20} />
          </button>
        </header>

        {error && <div className="sh-error">{error}</div>}

        {!chart && !error && (
          <div className="sh-body">
            <div className="sh-skel" />
            <div className="sh-skel short" />
            <div className="sh-skel" />
          </div>
        )}

        {chart && (
          <>
            {/* Safety: what a prescriber must see before anything else */}
            <section className={`sh-allergy ${allergies.length ? 'alert' : 'clear'}`} aria-label="Allergies">
              <span className="sh-allergy-icon">
                <SolarIcon name={allergies.length ? 'danger-triangle-bold' : 'shield-check-linear'} size={20} />
              </span>
              <div className="sh-allergy-text">
                <span className="sh-allergy-label">{allergies.length ? `Allergies (${allergies.length})` : 'Allergies'}</span>
                {allergies.length ? (
                  <ul className="sh-chips">
                    {allergies.map((a) => (
                      <li key={a} className="sh-chip danger">
                        {a}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="sh-allergy-none">None recorded. Confirm with the patient before prescribing.</span>
                )}
              </div>
            </section>

            <nav className="sh-tabs" role="tablist" aria-label="Chart sections">
              {(
                [
                  ['overview', 'Overview', null],
                  ['visits', 'Consultations', chart.encounters.length],
                  ['vitals', 'Vitals', chart.vitals.length],
                  ['documents', 'Documents', chart.documents.length],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={`sh-tab ${tab === key ? 'on' : ''}`}
                  onClick={() => setTab(key)}
                >
                  {label}
                  {count !== null && count > 0 && <span className="sh-tab-count">{count}</span>}
                </button>
              ))}
            </nav>

            <div className="sh-body" role="tabpanel">
              {tab === 'overview' && (
                <>
                  <Section
                    icon="heart-pulse-linear"
                    title="Health profile"
                    action={!editingProfile && { label: 'Edit', icon: 'pen-2-linear', onClick: () => setEditingProfile(true) }}
                  >
                    {editingProfile ? (
                      <div className="sh-form">
                        <div className="sh-grid2">
                          <Field label="Blood group" value={profileForm.blood_group} max={10} onChange={(v) => setProfileForm({ ...profileForm, blood_group: v })} />
                          <Field label="Genotype" value={profileForm.genotype} max={10} onChange={(v) => setProfileForm({ ...profileForm, genotype: v })} />
                        </div>
                        <Field
                          label="Allergies"
                          hint="Separate with commas"
                          multiline
                          value={profileForm.allergies}
                          onChange={(v) => setProfileForm({ ...profileForm, allergies: v })}
                        />
                        <Field
                          label="Chronic conditions"
                          hint="Separate with commas"
                          multiline
                          value={profileForm.chronic_conditions}
                          onChange={(v) => setProfileForm({ ...profileForm, chronic_conditions: v })}
                        />
                        <div className="sh-actions">
                          <button type="button" className="sh-btn" disabled={busy} onClick={saveProfile}>
                            Save
                          </button>
                          <button type="button" className="sh-btn ghost" onClick={() => setEditingProfile(false)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="sh-facts">
                        <Fact icon="dropper-minimalistic-linear" label="Blood group" value={chart.profile.blood_group} />
                        <Fact icon="dna-linear" label="Genotype" value={chart.profile.genotype} />
                        <div className="sh-fact wide">
                          <span className="sh-fact-label">Chronic conditions</span>
                          {conditions.length ? (
                            <ul className="sh-chips">
                              {conditions.map((c) => (
                                <li key={c} className="sh-chip">
                                  {c}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="sh-muted">None recorded</span>
                          )}
                        </div>
                      </div>
                    )}
                  </Section>

                  <Section
                    icon="clipboard-list-linear"
                    title="Active problems"
                    action={{ label: problemOpen ? 'Cancel' : 'Add', icon: problemOpen ? 'close-linear' : 'add-circle-linear', onClick: () => setProblemOpen((v) => !v) }}
                  >
                    {problemOpen && (
                      <div className="sh-form boxed">
                        <Field label="Problem or diagnosis" value={problemForm.description} max={255} onChange={(v) => setProblemForm({ ...problemForm, description: v })} />
                        <div className="sh-grid2">
                          <Field label="ICD-10 code" value={problemForm.icd10_code} max={20} onChange={(v) => setProblemForm({ ...problemForm, icd10_code: v })} />
                          <Field label="Onset" type="date" value={problemForm.onset_date} onChange={(v) => setProblemForm({ ...problemForm, onset_date: v })} />
                        </div>
                        <div className="sh-actions">
                          <button type="button" className="sh-btn" disabled={busy} onClick={addProblem}>
                            Add problem
                          </button>
                        </div>
                      </div>
                    )}
                    {active.length === 0 && !problemOpen && <p className="sh-muted">No active problems.</p>}
                    <ul className="sh-list">
                      {active.map((p) => (
                        <li key={p.id}>
                          <div>
                            <div className="sh-strong">{p.description}</div>
                            <div className="sh-muted small">
                              {[p.icd10_code, p.onset_date ? `Since ${fmtDate(p.onset_date)}` : null].filter(Boolean).join(' · ') || 'No code'}
                            </div>
                          </div>
                          <button type="button" className="sh-link" disabled={busy} onClick={() => send(`/problems/${p.id}`, 'PUT', { status: 'resolved' }, 'Marked as resolved')}>
                            Resolve
                          </button>
                        </li>
                      ))}
                    </ul>
                    {resolved.length > 0 && (
                      <>
                        <button type="button" className="sh-link subtle" onClick={() => setShowResolved((v) => !v)}>
                          {showResolved ? 'Hide' : 'Show'} resolved ({resolved.length})
                        </button>
                        {showResolved && (
                          <ul className="sh-list dim">
                            {resolved.map((p) => (
                              <li key={p.id}>
                                <div>
                                  <div>{p.description}</div>
                                  {p.icd10_code && <div className="sh-muted small">{p.icd10_code}</div>}
                                </div>
                                <button type="button" className="sh-link" disabled={busy} onClick={() => send(`/problems/${p.id}`, 'PUT', { status: 'active' }, 'Reopened')}>
                                  Reopen
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </Section>

                  <Section icon="thermometer-linear" title="Latest vitals" action={{ label: 'All vitals', icon: 'alt-arrow-right-linear', onClick: () => setTab('vitals') }}>
                    {latest ? <VitalTiles v={latest} compact /> : <p className="sh-muted">No vitals recorded yet.</p>}
                  </Section>
                </>
              )}

              {tab === 'visits' && (
                <>
                  {chart.encounters.length === 0 && <Empty icon="stethoscope-linear" text="No consultations with you yet." />}
                  <ul className="sh-visits">
                    {chart.encounters.map((enc) => {
                      const isOpen = openVisit === enc.booking_id;
                      const dx = enc.prescriptions[0]?.icd10_code;
                      return (
                        <li key={enc.booking_id} className={`sh-visit ${isOpen ? 'open' : ''}`}>
                          <button type="button" className="sh-visit-head" aria-expanded={isOpen} onClick={() => setOpenVisit(isOpen ? null : enc.booking_id)}>
                            <span className="sh-visit-date">
                              <span className="day">{new Date(enc.at).getDate()}</span>
                              <span className="mon">{new Date(enc.at).toLocaleDateString('en-ZA', { month: 'short' })}</span>
                            </span>
                            <span className="sh-visit-main">
                              <span className="sh-strong">{enc.notes?.chief_complaint || enc.reason || 'Consultation'}</span>
                              <span className="sh-muted small">
                                {[fmtDateTime(enc.at), enc.mode, dx ? `ICD-10 ${dx}` : null].filter(Boolean).join(' · ')}
                              </span>
                            </span>
                            <SolarIcon name={isOpen ? 'alt-arrow-up-linear' : 'alt-arrow-down-linear'} size={18} color="#8A7B72" />
                          </button>
                          {isOpen && (
                            <div className="sh-visit-body">
                              {enc.patient_note && <Note label="Patient's note" text={enc.patient_note} />}
                              {enc.notes ? (
                                <>
                                  <Note label="History" text={enc.notes.history} />
                                  <Note label="Assessment" text={enc.notes.assessment} />
                                  <Note label="Plan" text={enc.notes.plan} />
                                  <Note label="Patient instructions" text={enc.notes.patient_instructions} />
                                </>
                              ) : (
                                <p className="sh-muted">No clinical notes were saved for this consultation.</p>
                              )}
                              {enc.prescriptions.map((rx) => (
                                <div key={rx.id} className="sh-rx">
                                  <div className="sh-rx-head">
                                    <SolarIcon name="pill-linear" size={16} color="#A86C38" />
                                    <span className="sh-strong">Prescription</span>
                                    <span className="sh-muted small">
                                      {fmtDate(rx.issued_at)}
                                      {rx.schedule_flag ? ` · ${rx.schedule_flag}` : ''}
                                    </span>
                                    <a className="sh-link" href={`${API_BASE}/prescriptions/${rx.id}/download`}>
                                      <SolarIcon name="download-minimalistic-linear" size={15} /> PDF
                                    </a>
                                  </div>
                                  <ul>
                                    {rx.medications.map((m, i) => (
                                      <li key={i}>
                                        {m.name}
                                        {[m.dosage, m.frequency, m.duration].some(Boolean) && (
                                          <span className="sh-muted"> · {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ')}</span>
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
                  <p className="sh-footnote">
                    <SolarIcon name="shield-check-linear" size={14} /> Notes and prescriptions written by other doctors stay private to them.
                  </p>
                </>
              )}

              {tab === 'vitals' && (
                <>
                  <div className="sh-row-between">
                    <span className="sh-muted">{latest ? `Last recorded ${fmtDateTime(latest.recorded_at)}` : 'No vitals recorded yet.'}</span>
                    <button type="button" className="sh-btn small" onClick={() => setVitalsOpen((v) => !v)}>
                      <SolarIcon name={vitalsOpen ? 'close-linear' : 'add-circle-linear'} size={16} /> {vitalsOpen ? 'Cancel' : 'Record vitals'}
                    </button>
                  </div>

                  {vitalsOpen && (
                    <div className="sh-form boxed">
                      <div className="sh-grid3">
                        <Field label="Systolic" unit="mmHg" type="number" value={vitalsForm.bp_systolic} onChange={(v) => setVitalsForm({ ...vitalsForm, bp_systolic: v })} />
                        <Field label="Diastolic" unit="mmHg" type="number" value={vitalsForm.bp_diastolic} onChange={(v) => setVitalsForm({ ...vitalsForm, bp_diastolic: v })} />
                        <Field label="Heart rate" unit="bpm" type="number" value={vitalsForm.heart_rate} onChange={(v) => setVitalsForm({ ...vitalsForm, heart_rate: v })} />
                        <Field label="Temperature" unit="°C" type="number" step="0.1" value={vitalsForm.temperature_c} onChange={(v) => setVitalsForm({ ...vitalsForm, temperature_c: v })} />
                        <Field label="SpO₂" unit="%" type="number" value={vitalsForm.spo2} onChange={(v) => setVitalsForm({ ...vitalsForm, spo2: v })} />
                        <Field label="Resp. rate" unit="/min" type="number" value={vitalsForm.respiratory_rate} onChange={(v) => setVitalsForm({ ...vitalsForm, respiratory_rate: v })} />
                        <Field label="Weight" unit="kg" type="number" step="0.1" value={vitalsForm.weight_kg} onChange={(v) => setVitalsForm({ ...vitalsForm, weight_kg: v })} />
                        <Field label="Height" unit="cm" type="number" step="0.1" value={vitalsForm.height_cm} onChange={(v) => setVitalsForm({ ...vitalsForm, height_cm: v })} />
                        <Field label="Glucose" unit="mmol/L" type="number" step="0.1" value={vitalsForm.glucose_mmol} onChange={(v) => setVitalsForm({ ...vitalsForm, glucose_mmol: v })} />
                      </div>
                      <Field label="Notes" value={vitalsForm.notes} max={2000} onChange={(v) => setVitalsForm({ ...vitalsForm, notes: v })} />
                      <div className="sh-actions">
                        <button type="button" className="sh-btn" disabled={busy} onClick={addVitals}>
                          Save vitals
                        </button>
                      </div>
                    </div>
                  )}

                  {latest && <VitalTiles v={latest} />}

                  {chart.vitals.length > 0 && (
                    <div className="sh-table-wrap">
                      <table className="sh-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>BP</th>
                            <th>HR</th>
                            <th>Temp</th>
                            <th>SpO₂</th>
                            <th>Weight</th>
                            <th aria-label="Actions" />
                          </tr>
                        </thead>
                        <tbody>
                          {chart.vitals.map((v) => (
                            <tr key={v.id}>
                              <td>{fmtDate(v.recorded_at)}</td>
                              <td>{v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic}` : '—'}</td>
                              <td>{has(v.heart_rate) ? v.heart_rate : '—'}</td>
                              <td>{has(v.temperature_c) ? `${v.temperature_c}°` : '—'}</td>
                              <td>{has(v.spo2) ? `${v.spo2}%` : '—'}</td>
                              <td>{has(v.weight_kg) ? `${v.weight_kg} kg` : '—'}</td>
                              <td className="sh-td-act">
                                {v.recorded_by === doctor?.id && (
                                  <button
                                    type="button"
                                    className="sh-icon-btn"
                                    disabled={busy}
                                    aria-label={`Delete vitals from ${fmtDate(v.recorded_at)}`}
                                    onClick={() => window.confirm('Delete this vitals entry?') && send(`/vitals/${v.id}`, 'DELETE', undefined, 'Vitals removed')}
                                  >
                                    <SolarIcon name="trash-bin-minimalistic-linear" size={16} />
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {tab === 'documents' && (
                <>
                  {chart.documents.length === 0 && <Empty icon="folder-with-files-linear" text="The patient has not uploaded any documents." />}
                  <ul className="sh-docs">
                    {chart.documents.map((d) => (
                      <li key={d.id}>
                        <span className="sh-doc-icon">
                          <SolarIcon name="file-text-linear" size={20} color="#A86C38" />
                        </span>
                        <span className="sh-doc-main">
                          <span className="sh-strong">{d.title}</span>
                          <span className="sh-muted small">
                            {d.category.replace(/_/g, ' ')} · {fmtDate(d.created_at)}
                          </span>
                        </span>
                        {d.downloadUrl ? (
                          <a className="sh-btn ghost small" href={d.downloadUrl} target="_blank" rel="noreferrer">
                            Open
                          </a>
                        ) : (
                          <span className="sh-muted small">Unavailable</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        )}
      </aside>
    </div>
  );
}

function Section({
  icon,
  title,
  action,
  children,
}: {
  icon: string;
  title: string;
  action?: false | { label: string; icon: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <section className="sh-section">
      <div className="sh-section-head">
        <SolarIcon name={icon} size={18} color="#B88647" />
        <h3>{title}</h3>
        {action && (
          <button type="button" className="sh-link" onClick={action.onClick}>
            <SolarIcon name={action.icon} size={15} /> {action.label}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

function Fact({ icon, label, value }: { icon: string; label: string; value: string | null }) {
  return (
    <div className="sh-fact">
      <span className="sh-fact-icon">
        <SolarIcon name={icon} size={18} color="#A86C38" />
      </span>
      <span>
        <span className="sh-fact-label">{label}</span>
        <span className={value ? 'sh-fact-value' : 'sh-muted'}>{value || 'Not recorded'}</span>
      </span>
    </div>
  );
}

function VitalTiles({ v, compact }: { v: Vital; compact?: boolean }) {
  const tiles = [
    { label: 'Blood pressure', value: v.bp_systolic ? `${v.bp_systolic}/${v.bp_diastolic}` : null, unit: 'mmHg' },
    { label: 'Heart rate', value: v.heart_rate, unit: 'bpm' },
    { label: 'Temperature', value: v.temperature_c, unit: '°C' },
    { label: 'SpO₂', value: v.spo2, unit: '%' },
    { label: 'Weight', value: v.weight_kg, unit: 'kg' },
    { label: 'Glucose', value: v.glucose_mmol, unit: 'mmol/L' },
  ].filter((t) => !compact || has(t.value));
  if (tiles.length === 0) return <p className="sh-muted">Only notes were recorded last time.</p>;
  return (
    <div className="sh-tiles">
      {tiles.map((t) => (
        <div key={t.label} className="sh-tile">
          <span className="sh-tile-label">{t.label}</span>
          <span className="sh-tile-value">
            {has(t.value) ? t.value : '—'}
            {has(t.value) && <span className="sh-tile-unit"> {t.unit}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

function Note({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="sh-note">
      <span className="sh-fact-label">{label}</span>
      <p>{text}</p>
    </div>
  );
}

function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="sh-empty">
      <SolarIcon name={icon} size={28} color="#C9B9A3" />
      <p>{text}</p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  unit,
  hint,
  max,
  step,
  multiline,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  unit?: string;
  hint?: string;
  max?: number;
  step?: string;
  multiline?: boolean;
}) {
  return (
    <label className="sh-field">
      <span className="sh-field-label">
        {label}
        {unit && <span className="sh-muted"> ({unit})</span>}
      </span>
      {multiline ? (
        <textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input
          type={type}
          inputMode={type === 'number' ? 'decimal' : undefined}
          step={step}
          maxLength={max}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {hint && <span className="sh-hint">{hint}</span>}
    </label>
  );
}

const SHEET_CSS = `
  .sh-root { position: fixed; inset: 0; z-index: 1000; }
  .sh-backdrop { position: absolute; inset: 0; background: rgba(42, 23, 15, 0.32); opacity: 0; transition: opacity .2s ease; }
  .sh-root.in .sh-backdrop { opacity: 1; }
  .sh-panel { position: absolute; top: 0; right: 0; bottom: 0; width: min(560px, 100vw); background: #FFFDF9; border-left: 1px solid #E8DCC8; display: flex; flex-direction: column; transform: translateX(100%); transition: transform .24s cubic-bezier(.2,.8,.2,1); color: #2A170F; }
  .sh-root.in .sh-panel { transform: translateX(0); }
  .sh-grab { display: none; }

  .sh-head { display: flex; align-items: center; gap: 12px; padding: 18px 20px 14px; }
  .sh-avatar { width: 44px; height: 44px; border-radius: 50%; background: #2A170F; color: #DFAB62; display: flex; align-items: center; justify-content: center; font-weight: 600; flex-shrink: 0; }
  .sh-id { min-width: 0; flex: 1; }
  .sh-id h2 { margin: 0; font-size: 1.15rem; font-weight: 600; letter-spacing: -0.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sh-id p { margin: 2px 0 0; color: #6B5E55; font-size: 0.82rem; }
  .sh-close { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #E8DCC8; background: #fff; color: #4A3B32; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; }
  .sh-close:hover { background: #FAF6EE; }
  .sh-close:focus-visible, .sh-tab:focus-visible, .sh-link:focus-visible, .sh-btn:focus-visible { outline: 2px solid #DFAB62; outline-offset: 2px; }

  .sh-error { margin: 0 20px; background: #FEF2F2; border: 1px solid #FECACA; color: #991B1B; border-radius: 12px; padding: 12px 14px; font-size: 0.88rem; }

  .sh-allergy { margin: 0 20px 4px; display: flex; gap: 12px; align-items: flex-start; border-radius: 14px; padding: 12px 14px; }
  .sh-allergy.alert { background: #FEF2F2; border: 1px solid #FCD5D5; }
  .sh-allergy.clear { background: #F7F3EC; border: 1px solid #EDE4D4; }
  .sh-allergy-icon { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sh-allergy.alert .sh-allergy-icon { background: #FEE2E2; color: #B91C1C; }
  .sh-allergy.clear .sh-allergy-icon { background: #EDE4D4; color: #6B5E55; }
  .sh-allergy-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; padding-top: 1px; }
  .sh-allergy-label { font-size: 0.72rem; font-weight: 600; text-transform: uppercase; letter-spacing: .07em; }
  .sh-allergy.alert .sh-allergy-label { color: #991B1B; }
  .sh-allergy.clear .sh-allergy-label { color: #6B5E55; }
  .sh-allergy-none { font-size: 0.84rem; color: #6B5E55; }

  .sh-chips { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
  .sh-chip { font-size: 0.82rem; font-weight: 500; padding: 3px 10px; border-radius: 999px; background: #FAF2E4; color: #7A4F28; border: 1px solid #EBD3A8; }
  .sh-chip.danger { background: #fff; color: #991B1B; border-color: #FCA5A5; }

  .sh-tabs { display: flex; gap: 4px; padding: 12px 20px 0; border-bottom: 1px solid #EDE4D4; overflow-x: auto; scrollbar-width: none; }
  .sh-tabs::-webkit-scrollbar { display: none; }
  .sh-tab { all: unset; cursor: pointer; padding: 10px 12px; font-size: 0.86rem; font-weight: 500; color: #6B5E55; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
  .sh-tab.on { color: #2A170F; border-bottom-color: #DFAB62; font-weight: 600; }
  .sh-tab-count { font-size: 0.7rem; background: #F0E7D8; color: #5C4F46; border-radius: 999px; padding: 0 7px; line-height: 18px; }

  .sh-body { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 22px; overscroll-behavior: contain; }
  .sh-section { display: flex; flex-direction: column; gap: 12px; }
  .sh-section + .sh-section { padding-top: 22px; border-top: 1px solid #F0EAE1; }
  .sh-section-head { display: flex; align-items: center; gap: 8px; }
  .sh-section-head h3 { margin: 0; font-size: 0.92rem; font-weight: 600; }
  .sh-section-head .sh-link { margin-left: auto; }

  .sh-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px 16px; }
  .sh-fact { display: flex; gap: 10px; align-items: flex-start; }
  .sh-fact.wide { grid-column: 1 / -1; flex-direction: column; gap: 6px; }
  .sh-fact-icon { width: 34px; height: 34px; border-radius: 10px; background: #FAF2E4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sh-fact-label { display: block; font-size: 0.7rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #8A7B72; }
  .sh-fact-value { display: block; font-size: 0.95rem; font-weight: 500; margin-top: 1px; }

  .sh-muted { color: #8A7B72; font-size: 0.86rem; }
  .sh-muted.small, .small { font-size: 0.78rem; }
  .sh-strong { font-weight: 600; font-size: 0.9rem; }
  .sh-link { all: unset; cursor: pointer; color: #A86C38; font-weight: 600; font-size: 0.82rem; display: inline-flex; align-items: center; gap: 4px; }
  .sh-link.subtle { color: #8A7B72; font-weight: 500; }
  .sh-link[disabled] { opacity: .5; cursor: default; }

  .sh-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
  .sh-list li { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 10px 0; }
  .sh-list li + li { border-top: 1px solid #F3EEE6; }
  .sh-list.dim { opacity: .7; }

  .sh-tiles { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .sh-tile { background: #fff; border: 1px solid #EDE4D4; border-radius: 12px; padding: 10px 12px; display: flex; flex-direction: column; gap: 2px; }
  .sh-tile-label { font-size: 0.7rem; color: #8A7B72; font-weight: 500; }
  .sh-tile-value { font-size: 1.05rem; font-weight: 600; font-variant-numeric: tabular-nums; }
  .sh-tile-unit { font-size: 0.72rem; color: #8A7B72; font-weight: 400; }

  .sh-visits { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .sh-visit { border: 1px solid #EDE4D4; border-radius: 14px; background: #fff; }
  .sh-visit-head { all: unset; box-sizing: border-box; width: 100%; cursor: pointer; display: flex; align-items: center; gap: 12px; padding: 12px 14px; }
  .sh-visit-head:focus-visible { outline: 2px solid #DFAB62; outline-offset: -2px; border-radius: 14px; }
  .sh-visit-date { width: 42px; height: 46px; border-radius: 10px; background: #FAF2E4; display: flex; flex-direction: column; align-items: center; justify-content: center; flex-shrink: 0; }
  .sh-visit-date .day { font-size: 1rem; font-weight: 600; line-height: 1; }
  .sh-visit-date .mon { font-size: 0.66rem; text-transform: uppercase; color: #A86C38; font-weight: 600; margin-top: 2px; }
  .sh-visit-main { display: flex; flex-direction: column; min-width: 0; flex: 1; gap: 2px; }
  .sh-visit-main .small { text-transform: capitalize; }
  .sh-visit-body { padding: 4px 14px 14px 68px; display: flex; flex-direction: column; gap: 12px; }
  .sh-note p { margin: 2px 0 0; font-size: 0.88rem; line-height: 1.5; white-space: pre-wrap; }
  .sh-rx { background: #FFFBF3; border: 1px solid #F0E2C8; border-radius: 12px; padding: 10px 12px; font-size: 0.86rem; }
  .sh-rx-head { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .sh-rx-head .sh-link { margin-left: auto; }
  .sh-rx ul { margin: 6px 0 0; padding-left: 22px; }
  .sh-rx li { margin: 2px 0; }
  .sh-footnote { display: flex; align-items: center; gap: 6px; color: #8A7B72; font-size: 0.76rem; margin: 0; }

  .sh-row-between { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
  .sh-table-wrap { border: 1px solid #EDE4D4; border-radius: 12px; overflow-x: auto; background: #fff; }
  .sh-table { width: 100%; border-collapse: collapse; font-size: 0.84rem; font-variant-numeric: tabular-nums; }
  .sh-table th { text-align: left; font-size: 0.68rem; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; color: #8A7B72; background: #FAF6EE; padding: 8px 12px; white-space: nowrap; }
  .sh-table td { padding: 9px 12px; border-top: 1px solid #F3EEE6; white-space: nowrap; }
  .sh-td-act { text-align: right; width: 36px; }
  .sh-icon-btn { all: unset; cursor: pointer; color: #B91C1C; padding: 4px; border-radius: 6px; display: inline-flex; }
  .sh-icon-btn:hover { background: #FEF2F2; }

  .sh-docs { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .sh-docs li { display: flex; align-items: center; gap: 12px; border: 1px solid #EDE4D4; border-radius: 12px; padding: 10px 12px; background: #fff; }
  .sh-doc-icon { width: 38px; height: 38px; border-radius: 10px; background: #FAF2E4; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .sh-doc-main { display: flex; flex-direction: column; min-width: 0; flex: 1; }
  .sh-doc-main .small { text-transform: capitalize; }

  .sh-form { display: flex; flex-direction: column; gap: 12px; }
  .sh-form.boxed { background: #FAF6EE; border: 1px solid #EDE4D4; border-radius: 14px; padding: 14px; }
  .sh-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .sh-grid3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .sh-field { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .sh-field-label { font-size: 0.76rem; font-weight: 600; color: #4A3B32; }
  .sh-field input, .sh-field textarea { padding: 9px 11px; border-radius: 10px; border: 1.5px solid #DDD0BC; font: inherit; font-size: 0.9rem; color: #2A170F; background: #fff; width: 100%; box-sizing: border-box; }
  .sh-field input:focus, .sh-field textarea:focus { outline: none; border-color: #DFAB62; }
  .sh-hint { font-size: 0.72rem; color: #8A7B72; }
  .sh-actions { display: flex; gap: 8px; }
  .sh-btn { all: unset; cursor: pointer; box-sizing: border-box; display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #DFAB62; color: #2A170F; font-weight: 600; font-size: 0.86rem; padding: 9px 16px; border-radius: 10px; }
  .sh-btn.small { padding: 7px 12px; font-size: 0.82rem; }
  .sh-btn.ghost { background: #fff; border: 1px solid #DDD0BC; }
  .sh-btn[disabled] { opacity: .6; cursor: default; }

  .sh-empty { display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 40px 12px; color: #8A7B72; font-size: 0.88rem; text-align: center; }
  .sh-skel { height: 64px; border-radius: 12px; background: linear-gradient(90deg, #F3ECE0, #FAF6EE, #F3ECE0); background-size: 200% 100%; animation: sh-shimmer 1.2s infinite; }
  .sh-skel.short { height: 32px; width: 60%; }
  @keyframes sh-shimmer { to { background-position: -200% 0; } }

  /* Mobile: the same sheet rises from the bottom */
  @media (max-width: 720px) {
    .sh-panel { top: auto; left: 0; right: 0; width: 100%; height: 92dvh; border-left: none; border-top: 1px solid #E8DCC8; border-radius: 20px 20px 0 0; transform: translateY(100%); }
    .sh-root.in .sh-panel { transform: translateY(0); }
    .sh-grab { display: block; width: 40px; height: 4px; border-radius: 999px; background: #DDD0BC; margin: 8px auto 0; flex-shrink: 0; }
    .sh-head { padding: 10px 16px 12px; }
    .sh-allergy { margin: 0 16px 4px; }
    .sh-tabs { padding: 10px 12px 0; }
    .sh-body { padding: 16px; padding-bottom: calc(16px + env(safe-area-inset-bottom)); }
    .sh-tiles, .sh-grid3 { grid-template-columns: 1fr 1fr; }
    .sh-visit-body { padding-left: 14px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .sh-panel, .sh-backdrop { transition: none; }
    .sh-skel { animation: none; }
  }
`;
