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

export default function PrescriptionVerificationPage() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : '';

  const [data, setData] = useState<PrescriptionVerificationData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
          setError('Prescription could not be verified or record was not found in the compliance ledger.');
        }

        if (isMounted) {
          setError('Prescription could not be verified or record was not found in the compliance ledger.');
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Verification service is temporarily unreachable. Please try again.');
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

  const handleDownloadPdf = async () => {
    if (!id) return;
    setIsDownloading(true);
    try {
      const downloadUrl = `${API_BASE}/prescriptions/${id}/download`;
      const res = await fetch(downloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ChekUp247_Prescription_${id.toUpperCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        window.open(downloadUrl, '_blank');
      }
    } catch {
      window.open(`${API_BASE}/prescriptions/${id}/download`, '_blank');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#F8F4EC',
        padding: '24px 16px 60px',
        boxSizing: 'border-box',
        fontFamily: 'var(--font-heading), -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: '820px', margin: '0 auto' }}>
        {/* Header Branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '20px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ChekupCrossLogo size={32} />
            <div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: '#2A170F',
                  letterSpacing: '-0.02em',
                }}
              >
                CHEKUP247 TELEHEALTH
              </div>
              <div style={{ fontSize: '0.74rem', color: '#7A6A5E', fontWeight: 600 }}>
                Official South African Electronic Prescription Verification Portal
              </div>
            </div>
          </div>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1.5px solid #DDD0BC',
              color: '#2A170F',
              fontSize: '0.8rem',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <SolarIcon name="home-linear" size={15} color="#2A170F" />
            ChekUp247 Home
          </Link>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #DDD0BC',
              padding: '60px 24px',
              textAlign: 'center',
              boxShadow: '0 8px 30px -4px rgba(42, 23, 15, 0.08)',
            }}
          >
            <SolarIcon
              name="refresh-linear"
              size={32}
              className="animate-spin"
              color="#DFAB62"
              style={{ margin: '0 auto 16px', display: 'block' }}
            />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2A170F', margin: 0 }}>
              Verifying Cryptographic Seal & HPCSA Registry…
            </h3>
            <p style={{ color: '#7A6A5E', fontSize: '0.85rem', marginTop: '6px' }}>
              Validating SHA-256 tamper-evident electronic prescription ledger.
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #FECACA',
              padding: '48px 24px',
              textAlign: 'center',
              boxShadow: '0 8px 30px -4px rgba(220, 38, 38, 0.08)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#FEF2F2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <SolarIcon name="close-circle-linear" size={32} color="#DC2626" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#991B1B', margin: 0 }}>
              Prescription Verification Failed
            </h3>
            <p style={{ color: '#7F1D1D', fontSize: '0.9rem', maxWidth: '480px', margin: '8px auto 20px' }}>
              {error}
            </p>
            <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>
              Reference Checked: <code>{id}</code>
            </div>
          </div>
        )}

        {/* Verified Content */}
        {!isLoading && data && (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1.5px solid #DDD0BC',
              overflow: 'hidden',
              boxShadow: '0 10px 30px -5px rgba(42, 23, 15, 0.09)',
            }}
          >
            {/* Status Banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #065F46 0%, #047857 100%)',
                color: '#FFFFFF',
                padding: '20px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <SolarIcon name="shield-check-linear" size={24} color="#FFFFFF" />
                </div>
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '0.01em' }}>
                    AUTHENTIC & VERIFIED PRESCRIPTION
                  </div>
                  <div style={{ fontSize: '0.78rem', opacity: 0.9, marginTop: '2px' }}>
                    Complies with South African Medicines Act (Act 101/1965) & ECTA (Act 25/2002)
                  </div>
                </div>
              </div>

              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  borderRadius: '10px',
                  padding: '6px 14px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                }}
              >
                STATUS: {data.status}
              </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: '24px' }}>
              {/* Metadata Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                  gap: '16px',
                  marginBottom: '20px',
                  background: '#FAF6EE',
                  padding: '16px',
                  borderRadius: '12px',
                  border: '1px solid #EDE4D4',
                }}
              >
                {/* Prescribing Doctor */}
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#B88647',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '4px',
                    }}
                  >
                    PRESCRIBING PRACTITIONER
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2A170F' }}>
                    {data.doctor.fullName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B5E55', marginTop: '2px' }}>
                    {data.doctor.specialty || 'General Practitioner'}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#2A170F', marginTop: '4px', fontWeight: 600 }}>
                    HPCSA Reg: <span style={{ fontFamily: 'monospace' }}>{data.doctor.hpcsa_number}</span>
                    {data.doctor.practice_number && ` · Practice: ${data.doctor.practice_number}`}
                  </div>
                </div>

                {/* Patient Information */}
                <div>
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      color: '#B88647',
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      marginBottom: '4px',
                    }}
                  >
                    PATIENT ON RECORD
                  </div>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#2A170F' }}>
                    {data.patient.fullName}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B5E55', marginTop: '2px' }}>
                    Patient ID / Ref: {data.patient.patient_id}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#2A170F', marginTop: '4px', fontWeight: 600 }}>
                    Issued: {new Date(data.issued_at).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
              </div>

              {/* Diagnosis Box */}
              <div
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #EDE4D4',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                <div
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    color: '#B88647',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  DIAGNOSIS (ICD-10):
                </div>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    padding: '2px 7px',
                    borderRadius: '4px',
                    background: '#EDE4D4',
                    color: '#2A170F',
                  }}
                >
                  {data.icd10_code}
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#2A170F' }}>
                  {data.icd10_description}
                </span>
              </div>

              {/* Prescribed Medications Table */}
              <div style={{ marginBottom: '22px' }}>
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: '#2A170F',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    marginBottom: '8px',
                  }}
                >
                  Prescribed Medications ({data.items.length})
                </div>

                <div
                  style={{
                    border: '1.5px solid #EDE4D4',
                    borderRadius: '12px',
                    overflowX: 'auto',
                    backgroundColor: '#FFFFFF',
                  }}
                >
                  <table
                    style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.85rem',
                      minWidth: '600px',
                    }}
                  >
                    <thead>
                      <tr style={{ background: '#EBE2D3' }}>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#3D2B20', textTransform: 'uppercase' }}>#</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#3D2B20', textTransform: 'uppercase' }}>Medication Name</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#3D2B20', textTransform: 'uppercase' }}>NAPPI</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#3D2B20', textTransform: 'uppercase' }}>Sched</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#3D2B20', textTransform: 'uppercase' }}>Dosage & Frequency</th>
                        <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 700, color: '#3D2B20', textTransform: 'uppercase' }}>Duration</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 700, color: '#3D2B20', textTransform: 'uppercase' }}>Repeats</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item, idx) => (
                        <React.Fragment key={idx}>
                          <tr style={{ borderBottom: '1px solid #F0E6D8', background: idx % 2 === 1 ? '#FAF6EE' : '#FFFFFF' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 600, color: '#6B5E55' }}>{idx + 1}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#2A170F' }}>{item.medication_name}</td>
                            <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#4A3F38', fontSize: '0.8rem' }}>{item.nappi_code}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: item.schedule >= 5 ? '#B91C1C' : '#047857' }}>
                              S{item.schedule}
                            </td>
                            <td style={{ padding: '10px 12px', color: '#2A170F' }}>{item.dosage} · {item.frequency}</td>
                            <td style={{ padding: '10px 12px', color: '#2A170F' }}>{item.duration}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700, color: item.repeats > 0 ? '#047857' : '#6B5E55' }}>
                              {item.repeats > 0 ? `${item.repeats} repeats` : 'None'}
                            </td>
                          </tr>
                          {item.instructions && (
                            <tr style={{ background: idx % 2 === 1 ? '#FAF6EE' : '#FFFFFF', borderBottom: '1px solid #F0E6D8' }}>
                              <td></td>
                              <td colSpan={6} style={{ padding: '0 12px 10px', fontSize: '0.78rem', color: '#6B5E55', fontStyle: 'italic' }}>
                                Instructions: {item.instructions}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Schedule 5/6 Supervised Notice */}
              {data.supervision_declared && (
                <div
                  style={{
                    background: '#FFFBEB',
                    border: '1.5px solid #F59E0B',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    marginBottom: '20px',
                    fontSize: '0.78rem',
                    color: '#92400E',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, marginBottom: '3px' }}>
                    <SolarIcon name="shield-check-linear" size={14} color="#D97706" />
                    HPCSA Schedule 5 & 6 Telehealth Supervision Declaration
                  </div>
                  This prescription complies with real-time consultation requirements for scheduled substances under South African telemedicine regulations.
                </div>
              )}

              {/* Cryptographic Seal Box */}
              <div
                style={{
                  background: '#F8F4EC',
                  border: '1px solid #EDE4D4',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#B88647', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  CRYPTOGRAPHIC SHA-256 DIGITAL SEAL
                </div>
                <div
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.75rem',
                    color: '#2A170F',
                    wordBreak: 'break-all',
                    marginTop: '4px',
                  }}
                >
                  {data.pdf_hash}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#7A6A5E', marginTop: '6px' }}>
                  Tamper-evident hash verified against ChekUp247 immutable compliance audit ledger.
                </div>
              </div>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  flexWrap: 'wrap',
                  borderTop: '1px solid #EDE4D4',
                  paddingTop: '20px',
                }}
              >
                <button
                  type="button"
                  onClick={() => window.print()}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    background: '#FFFFFF',
                    border: '1.5px solid #DDD0BC',
                    color: '#2A170F',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <SolarIcon name="printer-linear" size={16} color="#2A170F" />
                  Print Verification
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isDownloading}
                  style={{
                    padding: '9px 20px',
                    borderRadius: '10px',
                    background: '#DFAB62',
                    border: 'none',
                    color: '#2A170F',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isDownloading ? 'wait' : 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 6px rgba(223, 171, 98, 0.3)',
                  }}
                >
                  <SolarIcon
                    name={isDownloading ? 'refresh-linear' : 'download-linear'}
                    size={16}
                    color="#2A170F"
                    className={isDownloading ? 'animate-spin' : ''}
                  />
                  {isDownloading ? 'Preparing PDF…' : 'Download Official PDF'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
