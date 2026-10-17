'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ChekupCrossLogo } from '../../../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../../../components/SolarIcon';

interface PrescriptionVerificationData {
  id: string;
  status: string;
  verified: boolean;
  issued_at: string;
  valid_until?: string;
  pdf_hash: string;
  doctor: {
    fullName: string;
    hpcsa_number: string;
    practice_number?: string;
    specialty?: string;
    verified_hpcsa: boolean;
  };
  patient: {
    fullName: string;
    patient_id: string;
  };
  icd10_code: string;
  icd10_description: string;
  max_schedule: number;
  supervision_declared: boolean;
  items: Array<{
    medication_name: string;
    nappi_code: string;
    dosage: string;
    frequency: string;
    duration: string;
    schedule: number;
    repeats: number;
    instructions: string;
  }>;
}

type Tone = 'valid' | 'expired' | 'revoked';

const TONES: Record<Tone, { bg: string; icon: string; title: string; sub: string }> = {
  valid: {
    bg: '#2A170F',
    icon: 'shield-check-linear',
    title: 'Valid prescription',
    sub: 'Authentic, digitally signed and within its validity period.',
  },
  expired: {
    bg: '#92400E',
    icon: 'clock-circle-linear',
    title: 'Authentic but expired',
    sub: 'This prescription is genuine, but its 30-day validity period has ended. Do not dispense.',
  },
  revoked: {
    bg: '#991B1B',
    icon: 'close-circle-linear',
    title: 'Prescription revoked',
    sub: 'The prescribing practitioner has withdrawn this prescription. Do not dispense.',
  },
};

const fmtDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })
    : '—';

const shortRef = (value: string) => value.split('-')[0].toUpperCase();

export default function PrescriptionVerificationPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [data, setData] = useState<PrescriptionVerificationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
  const downloadUrl = `${API_BASE}/prescriptions/${id}/download`;

  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    async function verify() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE}/prescriptions/${id}/verify`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted) setData(json);
          return;
        }
        if (isMounted) {
          setError('This prescription could not be verified. It may not exist, or the QR code may be damaged.');
        }
      } catch {
        if (isMounted) {
          setError('The verification service is temporarily unreachable. Please try again.');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    verify();
    return () => {
      isMounted = false;
    };
  }, [id, API_BASE]);

  const copySeal = async () => {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(data.pdf_hash);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  };

  const tone: Tone = data
    ? /REVOK/i.test(data.status)
      ? 'revoked'
      : /EXPIRED/i.test(data.status)
        ? 'expired'
        : 'valid'
    : 'valid';
  const t = TONES[tone];
  const showDescription =
    !!data?.icd10_description && data.icd10_description.trim().toUpperCase() !== data.icd10_code.trim().toUpperCase();

  return (
    <div className="vrx-page">
      <style>{`
        .vrx-page { min-height: 100vh; background: #F8F4EC; padding: 20px 14px 56px; box-sizing: border-box; font-family: var(--font-heading), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #2A170F; }
        .vrx-wrap { max-width: 760px; margin: 0 auto; }
        .vrx-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
        .vrx-brand { display: flex; align-items: center; gap: 10px; }
        .vrx-brand-name { font-size: 1.05rem; font-weight: 900; letter-spacing: -0.02em; }
        .vrx-brand-sub { font-size: 0.72rem; color: #7A6A5E; font-weight: 600; }
        .vrx-home { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: 999px; background: #fff; border: 1.5px solid #DDD0BC; color: #2A170F; font-size: 0.78rem; font-weight: 700; text-decoration: none; }
        .vrx-card { background: #fff; border: 1.5px solid #DDD0BC; border-radius: 18px; overflow: hidden; }
        .vrx-banner { color: #fff; padding: 22px 22px 20px; }
        .vrx-banner-row { display: flex; align-items: center; gap: 14px; }
        .vrx-banner-icon { width: 48px; height: 48px; border-radius: 50%; background: rgba(255,255,255,.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .vrx-banner h1 { margin: 0; font-size: 1.3rem; font-weight: 800; letter-spacing: -0.01em; color: #fff !important; }
        .vrx-banner p { margin: 3px 0 0; font-size: 0.82rem; opacity: .92; line-height: 1.4; color: #fff !important; }
        .vrx-facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: rgba(255,255,255,.22); border-radius: 12px; overflow: hidden; margin-top: 18px; }
        .vrx-fact { background: rgba(255,255,255,.06); padding: 10px 12px; }
        .vrx-fact dt { font-size: 0.64rem; letter-spacing: .07em; text-transform: uppercase; opacity: .8; font-weight: 700; margin: 0; }
        .vrx-fact dd { margin: 3px 0 0; font-size: 0.86rem; font-weight: 800; }
        .vrx-body { padding: 20px 22px 24px; display: flex; flex-direction: column; gap: 18px; }
        .vrx-people { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .vrx-box { background: #FAF6EE; border: 1px solid #EDE4D4; border-radius: 14px; padding: 14px 16px; min-width: 0; }
        .vrx-label { font-size: 0.66rem; font-weight: 800; color: #B88647; text-transform: uppercase; letter-spacing: .07em; display: flex; align-items: center; gap: 6px; }
        .vrx-name { font-weight: 800; font-size: 1.02rem; margin-top: 6px; overflow-wrap: anywhere; }
        .vrx-meta { font-size: 0.8rem; color: #6B5E55; margin-top: 3px; overflow-wrap: anywhere; }
        .vrx-meta b { color: #2A170F; }
        .vrx-tick { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 0.72rem; font-weight: 800; color: #A86C38; background: #FAF2E4; border: 1px solid #EBD3A8; padding: 2px 8px; border-radius: 999px; }
        .vrx-dx { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #fff; border: 1.5px solid #EDE4D4; border-radius: 14px; padding: 12px 16px; }
        .vrx-code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 800; font-size: 0.85rem; padding: 3px 9px; border-radius: 6px; background: #EDE4D4; }
        .vrx-h2 { font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: .07em; margin: 0 0 10px; display: flex; align-items: center; gap: 8px; }
        .vrx-count { background: #2A170F; color: #fff; border-radius: 999px; font-size: 0.68rem; padding: 1px 8px; }
        .vrx-meds { display: flex; flex-direction: column; gap: 12px; }
        .vrx-med { border: 1.5px solid #EDE4D4; border-radius: 14px; padding: 14px 16px; background: #fff; }
        .vrx-med-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
        .vrx-med-name { font-weight: 800; font-size: 1rem; overflow-wrap: anywhere; }
        .vrx-nappi { font-size: 0.74rem; color: #6B5E55; margin-top: 2px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
        .vrx-sched { flex-shrink: 0; font-size: 0.74rem; font-weight: 800; padding: 3px 10px; border-radius: 999px; border: 1px solid; }
        .vrx-sched.low { color: #A86C38; background: #FAF2E4; border-color: #EBD3A8; }
        .vrx-sched.high { color: #B91C1C; background: #FEF2F2; border-color: #FECACA; }
        .vrx-med-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 12px; margin-top: 12px; padding-top: 12px; border-top: 1px dashed #E6DAC6; }
        .vrx-k { font-size: 0.64rem; color: #8A7B72; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; }
        .vrx-v { font-size: 0.9rem; font-weight: 700; margin-top: 2px; }
        .vrx-note { margin-top: 12px; background: #FFFBEB; border-left: 3px solid #DFAB62; border-radius: 6px; padding: 8px 12px; font-size: 0.8rem; color: #5C4F46; }
        .vrx-warn { background: #FFFBEB; border: 1.5px solid #F59E0B; border-radius: 12px; padding: 12px 14px; font-size: 0.8rem; color: #92400E; line-height: 1.45; }
        .vrx-seal { background: #F8F4EC; border: 1px solid #EDE4D4; border-radius: 14px; padding: 14px 16px; }
        .vrx-hash { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.72rem; word-break: break-all; margin-top: 6px; line-height: 1.5; }
        .vrx-copy { border: 1px solid #DDD0BC; background: #fff; border-radius: 8px; font-size: 0.72rem; font-weight: 700; padding: 4px 10px; cursor: pointer; color: #2A170F; margin-left: auto; }
        .vrx-seal-note { font-size: 0.72rem; color: #7A6A5E; margin-top: 8px; line-height: 1.45; }
        .vrx-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; padding-top: 18px; border-top: 1px solid #EDE4D4; }
        .vrx-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 20px; border-radius: 12px; font-size: 0.88rem; font-weight: 700; cursor: pointer; text-decoration: none; border: 1.5px solid #DDD0BC; background: #fff; color: #2A170F; }
        .vrx-btn.primary { background: #DFAB62; border-color: #DFAB62; }
        .vrx-foot { text-align: center; font-size: 0.72rem; color: #8A7B72; margin-top: 14px; line-height: 1.5; }
        .vrx-state { background: #fff; border: 1.5px solid #DDD0BC; border-radius: 18px; padding: 56px 24px; text-align: center; }
        .vrx-state.err { border-color: #FECACA; }
        @media (max-width: 640px) {
          .vrx-facts { grid-template-columns: 1fr 1fr; }
          .vrx-people { grid-template-columns: 1fr; }
          .vrx-med-grid { grid-template-columns: 1fr 1fr; }
          .vrx-med-grid > :first-child { grid-column: 1 / -1; }
          .vrx-banner h1 { font-size: 1.12rem; }
          .vrx-actions .vrx-btn { flex: 1 1 100%; }
          .vrx-body, .vrx-banner { padding-left: 16px; padding-right: 16px; }
        }
        @media print {
          .vrx-top .vrx-home, .vrx-actions, .vrx-copy { display: none !important; }
          .vrx-page { background: #fff; padding: 0; }
          .vrx-card { box-shadow: none; }
        }
      `}</style>

      <div className="vrx-wrap">
        <div className="vrx-top">
          <div className="vrx-brand">
            <ChekupCrossLogo size={32} />
            <div>
              <div className="vrx-brand-name">CHEKUP247 TELEHEALTH</div>
              <div className="vrx-brand-sub">Electronic Prescription Verification</div>
            </div>
          </div>
          <Link href="/" className="vrx-home">
            <SolarIcon name="home-linear" size={15} color="#2A170F" />
            ChekUp247 Home
          </Link>
        </div>

        {isLoading && (
          <div className="vrx-state" role="status" aria-live="polite">
            <SolarIcon name="refresh-linear" size={32} className="animate-spin" color="#DFAB62" style={{ margin: '0 auto 14px', display: 'block' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>Verifying prescription…</h2>
            <p style={{ color: '#7A6A5E', fontSize: '0.85rem', marginTop: 6 }}>Checking the digital seal and practitioner registration.</p>
          </div>
        )}

        {!isLoading && error && (
          <div className="vrx-state err" role="alert">
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <SolarIcon name="close-circle-linear" size={32} color="#DC2626" />
            </div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>Could not verify prescription</h2>
            <p style={{ color: '#7F1D1D', fontSize: '0.9rem', maxWidth: 440, margin: '8px auto 16px', lineHeight: 1.5 }}>{error}</p>
            <div style={{ fontSize: '0.76rem', color: '#6B7280', overflowWrap: 'anywhere' }}>
              Reference checked: <code>{id}</code>
            </div>
          </div>
        )}

        {!isLoading && data && (
          <div className="vrx-card">
            <div className="vrx-banner" style={{ background: t.bg }}>
              <div className="vrx-banner-row">
                <div className="vrx-banner-icon">
                  <SolarIcon name={t.icon} size={28} color={tone === 'valid' ? '#DFAB62' : '#FFFFFF'} />
                </div>
                <div>
                  <h1>{t.title}</h1>
                  <p>{t.sub}</p>
                </div>
              </div>
              <dl className="vrx-facts">
                <div className="vrx-fact">
                  <dt>Rx reference</dt>
                  <dd style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{shortRef(data.id)}</dd>
                </div>
                <div className="vrx-fact">
                  <dt>Issued</dt>
                  <dd>{fmtDate(data.issued_at)}</dd>
                </div>
                <div className="vrx-fact">
                  <dt>Valid until</dt>
                  <dd>{fmtDate(data.valid_until)}</dd>
                </div>
                <div className="vrx-fact">
                  <dt>Highest schedule</dt>
                  <dd>S{data.max_schedule}</dd>
                </div>
              </dl>
            </div>

            <div className="vrx-body">
              <div className="vrx-people">
                <div className="vrx-box">
                  <div className="vrx-label">
                    <SolarIcon name="stethoscope-linear" size={14} color="#B88647" />
                    Prescribing practitioner
                  </div>
                  <div className="vrx-name">{data.doctor.fullName}</div>
                  <div className="vrx-meta">{data.doctor.specialty || 'General Practitioner'}</div>
                  <div className="vrx-meta">
                    HPCSA: <b style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{data.doctor.hpcsa_number}</b>
                  </div>
                  {data.doctor.practice_number && (
                    <div className="vrx-meta">
                      Practice no.: <b>{data.doctor.practice_number}</b>
                    </div>
                  )}
                  {data.doctor.verified_hpcsa && (
                    <span className="vrx-tick">
                      <SolarIcon name="check-circle-bold" size={12} color="#A86C38" />
                      HPCSA registered
                    </span>
                  )}
                </div>

                <div className="vrx-box">
                  <div className="vrx-label">
                    <SolarIcon name="user-linear" size={14} color="#B88647" />
                    Patient
                  </div>
                  <div className="vrx-name">{data.patient.fullName}</div>
                  <div className="vrx-meta">
                    Patient ref: <b style={{ fontFamily: 'ui-monospace, Menlo, monospace' }}>{shortRef(data.patient.patient_id || '—')}</b>
                  </div>
                  <div className="vrx-meta">Check the patient’s name against their ID before dispensing.</div>
                </div>
              </div>

              <div className="vrx-dx">
                <span className="vrx-label">Diagnosis (ICD-10)</span>
                <span className="vrx-code">{data.icd10_code}</span>
                {showDescription && <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>{data.icd10_description}</span>}
              </div>

              <section>
                <h2 className="vrx-h2">
                  <SolarIcon name="pill-linear" size={16} color="#2A170F" />
                  Prescribed medication
                  <span className="vrx-count">{data.items.length}</span>
                </h2>
                <div className="vrx-meds">
                  {data.items.map((item, idx) => (
                    <div className="vrx-med" key={idx}>
                      <div className="vrx-med-head">
                        <div style={{ minWidth: 0 }}>
                          <div className="vrx-med-name">
                            {idx + 1}. {item.medication_name}
                          </div>
                          <div className="vrx-nappi">NAPPI: {item.nappi_code && item.nappi_code !== 'CUSTOM-FREE-TEXT' ? item.nappi_code : 'N/A'}</div>
                        </div>
                        <span className={`vrx-sched ${item.schedule >= 5 ? 'high' : 'low'}`}>S{item.schedule}</span>
                      </div>
                      <div className="vrx-med-grid">
                        <div>
                          <div className="vrx-k">Dosage &amp; frequency</div>
                          <div className="vrx-v">
                            {item.dosage}
                            {item.frequency ? ` · ${item.frequency}` : ''}
                          </div>
                        </div>
                        <div>
                          <div className="vrx-k">Duration</div>
                          <div className="vrx-v">{item.duration}</div>
                        </div>
                        <div>
                          <div className="vrx-k">Repeats</div>
                          <div className="vrx-v" style={{ color: item.repeats > 0 ? '#A86C38' : undefined }}>
                            {item.repeats > 0 ? item.repeats : 'None'}
                          </div>
                        </div>
                      </div>
                      {item.instructions && (
                        <div className="vrx-note">
                          <b>Instructions:</b> {item.instructions}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              {data.supervision_declared && (
                <div className="vrx-warn">
                  <b>Schedule 5 &amp; 6 telehealth supervision declaration on record.</b> The practitioner declared a real-time consultation under HPCSA telemedicine guidelines.
                </div>
              )}

              <div className="vrx-seal">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="vrx-label">
                    <SolarIcon name="lock-linear" size={14} color="#B88647" />
                    SHA-256 digital seal
                  </span>
                  <button type="button" className="vrx-copy" onClick={copySeal}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <div className="vrx-hash">{data.pdf_hash}</div>
                <div className="vrx-seal-note">This seal is printed on the original PDF. If the two do not match, the document has been altered.</div>
              </div>

              <div className="vrx-actions">
                <button type="button" className="vrx-btn" onClick={() => window.print()}>
                  <SolarIcon name="printer-linear" size={18} color="#2A170F" />
                  Print
                </button>
                <a className="vrx-btn primary" href={downloadUrl} download>
                  <SolarIcon name="download-linear" size={18} color="#2A170F" />
                  Download official PDF
                </a>
              </div>
            </div>
          </div>
        )}

        {!isLoading && data && (
          <p className="vrx-foot">
            Verified live against the ChekUp247 prescription register. Issued under Section 22 of ECTA (Act 25 of 2002) and the Medicines and Related Substances Act (Act 101 of 1965).
          </p>
        )}
      </div>
    </div>
  );
}
