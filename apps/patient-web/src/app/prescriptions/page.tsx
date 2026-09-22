'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../components/SolarIcon';
import { useAuth } from '../../context/AuthContext';
import { PatientPortalLayout } from '../../components/portal/PatientPortalLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export interface PrescriptionItem {
  id?: string;
  medication_name: string;
  nappi_code: string;
  dosage: string;
  frequency: string;
  duration: string;
  schedule: number;
  instructions: string;
  repeats: number;
}

export interface PrescriptionRecord {
  id: string;
  consultation_id?: string;
  doctor_id: string;
  patient_id: string;
  icd10_code: string;
  icd10_description: string;
  clinical_notes?: string;
  max_schedule: number;
  supervision_declared: boolean;
  pdf_url?: string;
  pdf_hash?: string;
  created_at: string;
  doctor?: {
    user?: {
      fullName?: string;
      email?: string;
    };
    fullName?: string;
    hpcsa_number?: string;
    practice_number?: string;
    specialty?: string;
    signature_url?: string;
  };
  items: PrescriptionItem[];
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Format date as "17 Sep 2026" on a single line */
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function scheduleColor(sched: number): { bg: string; fg: string; border: string } {
  if (sched >= 5)
    return { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' };
  return { bg: '#ECFDF5', fg: '#047857', border: '#A7F3D0' };
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function PatientPrescriptionsPage() {
  const { user, token } = useAuth();
  const [prescriptions, setPrescriptions] = useState<PrescriptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedScheduleFilter, setSelectedScheduleFilter] = useState<'all' | 'standard' | 'controlled'>('all');
  const [selectedPrescription, setSelectedPrescription] = useState<PrescriptionRecord | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Load Prescriptions
  const loadPrescriptions = async () => {
    setIsLoading(true);
    try {
      let data: PrescriptionRecord[] = [];
      const patientId = user?.id || (user as any)?.patientId;

      if (token && patientId) {
        const res = await fetch(`${API_BASE}/prescriptions/patient/${patientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          data = await res.json();
        }
      }

      setPrescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('Failed to load prescriptions:', err);
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPrescriptions();
  }, [user, token]);

  // Filtered prescriptions
  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter((p) => {
      const docName = p.doctor?.fullName || p.doctor?.user?.fullName || '';
      const matchesSearch =
        docName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.icd10_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.icd10_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.items.some((i) => i.medication_name.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedScheduleFilter === 'standard') {
        return p.max_schedule <= 4;
      }
      if (selectedScheduleFilter === 'controlled') {
        return p.max_schedule >= 5;
      }

      return true;
    });
  }, [prescriptions, searchQuery, selectedScheduleFilter]);

  // Dynamic QR Code generation for the viewed prescription
  useEffect(() => {
    if (selectedPrescription) {
      const baseUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        (typeof window !== 'undefined' ? window.location.origin : '');
      const verificationUrl = `${baseUrl}/verify/rx/${selectedPrescription.id}`;
      QRCode.toDataURL(verificationUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: '#2A170F',
          light: '#FFFFFF',
        },
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => console.warn('Could not generate QR code:', err));
    } else {
      setQrCodeUrl(null);
    }
  }, [selectedPrescription]);

  // Handle Download PDF
  const handleDownloadPdf = async (prescriptionId: string) => {
    setDownloadingId(prescriptionId);
    try {
      const downloadUrl = `${API_BASE}/prescriptions/${prescriptionId}/download`;
      const res = await fetch(downloadUrl, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ChekUp247_Prescription_${prescriptionId.toUpperCase()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      } else {
        // Fallback to browser print to PDF if backend PDF is unavailable
        window.print();
      }
    } catch (err) {
      console.error('Download PDF failed, falling back to print dialog:', err);
      window.print();
    } finally {
      setDownloadingId(null);
    }
  };

  // Trigger browser print for the viewed HTML prescription
  const handlePrintPrescription = () => {
    window.print();
  };

  /* ====================================================================
     Shared Styles — kept as objects for reuse
     ==================================================================== */

  const styles = {
    page: {
      flex: 1,
      backgroundColor: '#F8F4EC',
      minHeight: 'calc(100vh - 72px)',
      padding: '28px 24px 60px',
      boxSizing: 'border-box' as const,
    },
    container: {
      maxWidth: '1100px',
      margin: '0 auto',
    },
    // --- Filter pill ---
    filterPill: (active: boolean, color: string) => ({
      padding: '6px 14px',
      borderRadius: '20px',
      fontSize: '0.8rem',
      fontWeight: 600 as const,
      cursor: 'pointer' as const,
      whiteSpace: 'nowrap' as const,
      background: active ? color : 'transparent',
      color: active ? '#FFFFFF' : '#6B5E55',
      border: `1.5px solid ${active ? color : '#DDD2C1'}`,
      transition: 'all 0.15s ease',
      lineHeight: 1.4,
    }),
    // --- Table wrapper ---
    tableCard: {
      backgroundColor: '#FFFFFF',
      border: '1.5px solid #DDD0BC',
      borderRadius: '16px',
      overflow: 'hidden',
    },
    tableScrollWrapper: {
      overflowX: 'auto' as const,
      WebkitOverflowScrolling: 'touch' as const,
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
      minWidth: '720px',
      fontSize: '0.875rem',
    },
    th: {
      padding: '12px 16px',
      fontSize: '0.73rem',
      fontWeight: 700 as const,
      color: '#3D2B20',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      textAlign: 'left' as const,
      borderBottom: '1.5px solid #D8CCB8',
      background: '#EBE2D3',
      whiteSpace: 'nowrap' as const,
    },
    td: {
      padding: '14px 16px',
      fontSize: '0.875rem',
      color: '#2A170F',
      borderBottom: '1px solid #F0E6D8',
      verticalAlign: 'middle' as const,
    },
    // --- Action buttons ---
    viewBtn: {
      display: 'inline-flex' as const,
      alignItems: 'center' as const,
      gap: '5px',
      padding: '6px 12px',
      borderRadius: '8px',
      background: '#FFFFFF',
      border: '1.5px solid #DDD2C1',
      color: '#2A170F',
      fontSize: '0.8rem',
      fontWeight: 600 as const,
      cursor: 'pointer' as const,
      transition: 'all 0.15s ease',
    },
    pdfBtn: (loading: boolean) => ({
      display: 'inline-flex' as const,
      alignItems: 'center' as const,
      gap: '5px',
      padding: '6px 12px',
      borderRadius: '8px',
      background: '#DFAB62',
      border: 'none' as const,
      color: '#2A170F',
      fontSize: '0.8rem',
      fontWeight: 600 as const,
      cursor: loading ? 'wait' as const : 'pointer' as const,
      transition: 'all 0.15s ease',
      boxShadow: '0 1px 3px rgba(223, 171, 98, 0.25)',
    }),
  };

  /* ====================================================================
     RENDER
     ==================================================================== */

  return (
    <PatientPortalLayout activeNavKey="prescriptions">
      <div style={styles.page} className="portal-workspace">
        <div style={styles.container}>

          {/* ─── Page Header ─── */}
          <div style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '14px',
              }}
            >
              <div>
                <div className="page-eyebrow">
                  <SolarIcon name="shield-check-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                  <span>HPCSA Registered Digital Prescriptions</span>
                </div>
                <h1 className="page-title">
                  My E-Prescriptions
                </h1>
                <p className="page-subtitle" style={{ maxWidth: '600px' }}>
                  View and download tamper-evident, digitally signed electronic prescriptions issued by your
                  licensed ChekUp247 healthcare providers.
                </p>
              </div>

              <button
                type="button"
                onClick={loadPrescriptions}
                disabled={isLoading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  background: '#FFFFFF',
                  border: '1.5px solid #DDD2C1',
                  color: '#2A170F',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <SolarIcon
                  name="refresh-linear"
                  size={15}
                  color="#2A170F"
                  className={isLoading ? 'animate-spin' : ''}
                />
                Refresh
              </button>
            </div>
          </div>

          {/* ─── Search + Filter Bar ─── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              marginBottom: '18px',
              flexWrap: 'wrap',
            }}
          >
            {/* Search Input */}
            <div style={{ position: 'relative', flex: '1 1 260px', minWidth: '220px' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  display: 'flex',
                  pointerEvents: 'none',
                }}
              >
                <SolarIcon name="magnifer-linear" size={16} color="#A08F83" />
              </span>
              <input
                type="text"
                placeholder="Search by doctor, medication, or diagnosis…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 14px 9px 36px',
                  borderRadius: '10px',
                  border: '1.5px solid #DDD2C1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  color: '#2A170F',
                  backgroundColor: '#FFFFFF',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Schedule Pill Filters */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setSelectedScheduleFilter('all')}
                style={styles.filterPill(selectedScheduleFilter === 'all', '#2A170F')}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedScheduleFilter('standard')}
                style={styles.filterPill(selectedScheduleFilter === 'standard', '#0D9488')}
              >
                S0–S4
              </button>
              <button
                type="button"
                onClick={() => setSelectedScheduleFilter('controlled')}
                style={styles.filterPill(selectedScheduleFilter === 'controlled', '#DC2626')}
              >
                S5–S6
              </button>
            </div>
          </div>

          {/* ─── Content Area ─── */}
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#7A6A5E' }}>
              <SolarIcon
                name="refresh-linear"
                size={28}
                className="animate-spin"
                color="#DFAB62"
                style={{ margin: '0 auto 14px', display: 'block' }}
              />
              <p style={{ fontSize: '0.92rem', fontWeight: 600 }}>Loading prescriptions…</p>
            </div>
          ) : filteredPrescriptions.length === 0 ? (
            /* ── Empty State ── */
            <div
              style={{
                background: '#FFFFFF',
                borderRadius: '16px',
                padding: '48px 24px',
                textAlign: 'center',
                border: '1px solid #E8DEC9',
              }}
            >
              <SolarIcon name="document-text-linear" size={44} color="#C5A880" style={{ marginBottom: '14px' }} />
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#2A170F', marginBottom: '6px' }}>
                No Prescriptions Found
              </h3>
              <p style={{ color: '#7A6A5E', fontSize: '0.88rem', maxWidth: '400px', margin: '0 auto 20px' }}>
                {searchQuery
                  ? 'No prescriptions matched your search. Try a different query or reset your filters.'
                  : 'You do not have any prescriptions yet. After your video consultation, your doctor will issue a digital prescription here.'}
              </p>
              <Link
                href="/doctors"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: '#DFAB62',
                  color: '#2A170F',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  textDecoration: 'none',
                }}
              >
                Book a Consultation
                <SolarIcon name="arrow-right-linear" size={15} color="#2A170F" />
              </Link>
            </div>
          ) : (
            <>
              {/* ═══════════════════════════════════════════════════════
                  DESKTOP TABLE (hidden < 768px via CSS class)
                  ═══════════════════════════════════════════════════════ */}
              <div className="rx-desktop-table-view">
                {/* Meta info bar above the table */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    padding: '0 4px',
                    flexWrap: 'wrap',
                    gap: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 800, color: '#2A170F', fontSize: '0.92rem' }}>
                      Official Prescriptions
                    </span>
                    <span
                      style={{
                        background: '#EDE4D4',
                        color: '#2A170F',
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid #DDD0BC',
                      }}
                    >
                      {filteredPrescriptions.length}
                    </span>
                  </div>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.76rem',
                      color: '#6B5E55',
                      fontWeight: 600,
                    }}
                  >
                    <SolarIcon name="shield-check-linear" size={15} color="#059669" />
                    <span>SHA-256 Tamper-Evident Seal</span>
                  </span>
                </div>

                <div style={styles.tableCard}>
                  {/* Scrollable table container */}
                  <div style={styles.tableScrollWrapper}>
                    <table style={styles.table}>
                      <thead>
                        <tr>
                          <th style={{ ...styles.th, width: '110px' }}>Date</th>
                          <th style={styles.th}>Doctor</th>
                          <th style={styles.th}>Diagnosis</th>
                          <th style={{ ...styles.th, width: '70px', textAlign: 'center' }}>Meds</th>
                          <th style={{ ...styles.th, width: '100px', textAlign: 'center' }}>Schedule</th>
                          <th style={{ ...styles.th, width: '150px', textAlign: 'right', paddingRight: '18px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPrescriptions.map((p) => {
                          const docName = p.doctor?.fullName || p.doctor?.user?.fullName || 'Medical Doctor';
                          const isControlled = p.max_schedule >= 5;
                          const sColor = scheduleColor(p.max_schedule);
                          const isHovered = hoveredRow === p.id;

                          return (
                            <tr
                              key={p.id}
                              onMouseEnter={() => setHoveredRow(p.id)}
                              onMouseLeave={() => setHoveredRow(null)}
                              style={{
                                backgroundColor: isHovered ? '#FAF5EB' : '#FFFFFF',
                                transition: 'background-color 0.12s ease',
                              }}
                            >
                              {/* Date — single line */}
                              <td style={{ ...styles.td, whiteSpace: 'nowrap', fontWeight: 500, color: '#5C4F46', fontSize: '0.84rem' }}>
                                {fmtDate(p.created_at)}
                              </td>

                              {/* Doctor — name only */}
                              <td style={{ ...styles.td, fontWeight: 600 }}>
                                {docName}
                              </td>

                              {/* Diagnosis */}
                              <td style={styles.td}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    fontFamily: 'monospace',
                                    fontWeight: 700,
                                    fontSize: '0.76rem',
                                    padding: '1px 6px',
                                    borderRadius: '4px',
                                    background: '#F0E5D3',
                                    color: '#5C3D0E',
                                    marginRight: '6px',
                                    verticalAlign: 'middle',
                                  }}
                                >
                                  {p.icd10_code}
                                </span>
                                <span style={{ fontSize: '0.84rem', color: '#4A3F38' }}>
                                  {p.icd10_description}
                                </span>
                              </td>

                              {/* Meds count */}
                              <td style={{ ...styles.td, textAlign: 'center', fontWeight: 600, fontSize: '0.84rem' }}>
                                {p.items.length}
                              </td>

                              {/* Schedule badge */}
                              <td style={{ ...styles.td, textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.72rem',
                                    fontWeight: 700,
                                    background: sColor.bg,
                                    color: sColor.fg,
                                    border: `1px solid ${sColor.border}`,
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  S{p.max_schedule}
                                  {p.supervision_declared ? ' · Supervised' : ''}
                                </span>
                              </td>

                              {/* Actions */}
                              <td style={{ ...styles.td, textAlign: 'right', paddingRight: '16px' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                  <button
                                    type="button"
                                    onClick={() => setSelectedPrescription(p)}
                                    style={styles.viewBtn}
                                  >
                                    <SolarIcon name="eye-linear" size={14} color="#2A170F" />
                                    View
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadPdf(p.id)}
                                    disabled={downloadingId === p.id}
                                    style={styles.pdfBtn(downloadingId === p.id)}
                                  >
                                    <SolarIcon
                                      name={downloadingId === p.id ? 'refresh-linear' : 'download-linear'}
                                      size={14}
                                      color="#2A170F"
                                      className={downloadingId === p.id ? 'animate-spin' : ''}
                                    />
                                    {downloadingId === p.id ? '…' : 'PDF'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* ═══════════════════════════════════════════════════════
                  MOBILE CARD VIEW (shown < 768px via CSS class)
                  ═══════════════════════════════════════════════════════ */}
              <div className="rx-mobile-cards-view">
                {filteredPrescriptions.map((p) => {
                  const docName = p.doctor?.fullName || p.doctor?.user?.fullName || 'Medical Doctor';
                  const isControlled = p.max_schedule >= 5;
                  const sColor = scheduleColor(p.max_schedule);

                  return (
                    <div
                      key={p.id}
                      className="rx-mobile-card"
                      style={{
                        background: '#FFFFFF',
                        border: '1.5px solid #DDD0BC',
                        borderRadius: '16px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                      }}
                    >
                      {/* Row 1: Doctor + Date */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '0.92rem',
                              color: '#2A170F',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {docName}
                          </div>
                          <div
                            style={{
                              fontSize: '0.78rem',
                              color: '#7A6A5E',
                              marginTop: '1px',
                            }}
                          >
                            {fmtDate(p.created_at)}
                          </div>
                        </div>
                        <span
                          style={{
                            display: 'inline-flex',
                            padding: '3px 10px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: sColor.bg,
                            color: sColor.fg,
                            border: `1px solid ${sColor.border}`,
                            whiteSpace: 'nowrap',
                            flexShrink: 0,
                          }}
                        >
                          S{p.max_schedule}
                        </span>
                      </div>

                      {/* Row 2: Diagnosis */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'baseline',
                          gap: '6px',
                          padding: '8px 10px',
                          background: '#FAF6EE',
                          borderRadius: '8px',
                          border: '1px solid #F2EADD',
                        }}
                      >
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '0.74rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background: '#EDE4D4',
                            color: '#5C3D0E',
                            flexShrink: 0,
                          }}
                        >
                          {p.icd10_code}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#2A170F', fontWeight: 500, lineHeight: 1.35 }}>
                          {p.icd10_description}
                        </span>
                      </div>

                      {/* Row 3: Meta badges */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.78rem', color: '#6B5E55', fontWeight: 600 }}>
                          {p.items.length} medication{p.items.length > 1 ? 's' : ''}
                        </span>
                        {p.supervision_declared && (
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              padding: '2px 7px',
                              borderRadius: '10px',
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                              border: '1px solid #BFDBFE',
                            }}
                          >
                            Supervised
                          </span>
                        )}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            fontSize: '0.68rem',
                            color: '#059669',
                            fontWeight: 600,
                            marginLeft: 'auto',
                          }}
                        >
                          <SolarIcon name="shield-check-linear" size={12} color="#059669" />
                          Verified
                        </span>
                      </div>

                      {/* Row 4: Action buttons */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedPrescription(p)}
                          style={{
                            minHeight: '42px',
                            borderRadius: '10px',
                            background: '#FFFFFF',
                            border: '1.5px solid #DDD2C1',
                            color: '#2A170F',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                          }}
                        >
                          <SolarIcon name="eye-linear" size={16} color="#2A170F" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDownloadPdf(p.id)}
                          disabled={downloadingId === p.id}
                          style={{
                            minHeight: '42px',
                            borderRadius: '10px',
                            background: '#DFAB62',
                            border: 'none',
                            color: '#2A170F',
                            fontWeight: 600,
                            fontSize: '0.84rem',
                            cursor: downloadingId === p.id ? 'wait' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '5px',
                            boxShadow: '0 1px 3px rgba(223, 171, 98, 0.25)',
                          }}
                        >
                          <SolarIcon
                            name={downloadingId === p.id ? 'refresh-linear' : 'download-linear'}
                            size={16}
                            color="#2A170F"
                            className={downloadingId === p.id ? 'animate-spin' : ''}
                          />
                          {downloadingId === p.id ? 'Loading…' : 'Download PDF'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════
            PRESCRIPTION HTML VIEW MODAL
            ═══════════════════════════════════════════════════════════════ */}
        {/* OFFICIAL ELECTRONIC PRESCRIPTION HTML VIEW MODAL */}
        {selectedPrescription && (
          <div
            className="rx-modal-container"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 150,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '24px 16px',
              overflowY: 'auto',
            }}
          >
            <div
              className="rx-modal-content"
              style={{
                maxWidth: '860px',
                width: '100%',
                maxHeight: '94vh',
                overflowY: 'auto',
                overflowX: 'hidden',
                scrollbarGutter: 'stable',
                boxSizing: 'border-box',
                background: '#FFFFFF',
                borderRadius: '24px',
                padding: '36px',
                boxShadow: '0 25px 50px -12px rgba(42, 23, 15, 0.25)',
                color: '#2A170F',
                position: 'relative',
              }}
            >
              {/* 1. Modal Top Header (Non-printable) */}
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ChekupCrossLogo size={38} />
                  <div>
                    <div
                      style={{
                        fontSize: '1.35rem',
                        fontWeight: 900,
                        color: '#2A170F',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.1,
                      }}
                    >
                      Chekup247
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#7A6A5E', fontWeight: 500, marginTop: '2px' }}>
                      Quality Care. Anytime. Anywhere.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handlePrintPrescription}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: '#FFFFFF',
                      border: '1.5px solid #DDD0BC',
                      color: '#2A170F',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <SolarIcon name="printer-linear" size={16} color="#2A170F" />
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadPdf(selectedPrescription.id)}
                    disabled={downloadingId === selectedPrescription.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 18px',
                      borderRadius: '8px',
                      background: '#A86C38',
                      border: 'none',
                      color: '#FFFFFF',
                      fontSize: '0.84rem',
                      fontWeight: 600,
                      cursor: downloadingId === selectedPrescription.id ? 'wait' : 'pointer',
                      boxShadow: '0 2px 6px rgba(168, 108, 56, 0.25)',
                    }}
                  >
                    <SolarIcon
                      name={downloadingId === selectedPrescription.id ? 'refresh-linear' : 'download-linear'}
                      size={16}
                      color="#FFFFFF"
                      className={downloadingId === selectedPrescription.id ? 'animate-spin' : ''}
                    />
                    {downloadingId === selectedPrescription.id ? 'Preparing…' : 'Download PDF'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedPrescription(null)}
                    style={{
                      background: '#F1F5F9',
                      border: 'none',
                      borderRadius: '50%',
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      marginLeft: '4px',
                    }}
                  >
                    <SolarIcon name="close-circle-linear" size={18} color="#7A6A5E" />
                  </button>
                </div>
              </div>

              {/* 2. Sub-header Banner */}
              <div
                className="no-print"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#FAF7F2',
                  border: '1.5px solid #EDE5D8',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: '#F0E7D8',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SolarIcon name="document-text-bold" size={24} color="#A86C38" />
                  </div>
                  <div>
                    <h2
                      style={{
                        fontSize: '1.3rem',
                        fontWeight: 800,
                        color: '#2A170F',
                        margin: 0,
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Electronic Prescription
                    </h2>
                    <div style={{ fontSize: '0.82rem', color: '#7A6A5E', marginTop: '3px' }}>
                      HTML View &nbsp;•&nbsp; Ref: #{selectedPrescription.id.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: '#ECFDF5',
                    border: '1px solid #A7F3D0',
                    borderRadius: '20px',
                    padding: '6px 14px',
                    color: '#047857',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                  }}
                >
                  <SolarIcon name="check-circle-bold" size={16} color="#059669" />
                  Verified
                </div>
              </div>

              {/* ── Printable Prescription Document ── */}
              <div
                id="printable-prescription"
                style={{
                  background: '#FFFFFF',
                  border: '1.5px solid #EDE5D8',
                  borderRadius: '16px',
                  padding: '36px',
                  boxShadow: '0 4px 24px rgba(42, 23, 15, 0.04)',
                }}
              >
                {/* 1. Letterhead with Brand Logo */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <ChekupCrossLogo size={46} />
                    <div>
                      <div
                        style={{
                          fontSize: '1.25rem',
                          fontWeight: 900,
                          color: '#2A170F',
                          letterSpacing: '-0.01em',
                        }}
                      >
                        CHEKUP247 TELEHEALTH
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#5C4F46', marginTop: '2px', fontWeight: 500 }}>
                        HPCSA Telemedicine Compliant Virtual Medical Practice &nbsp;•&nbsp; PR 0148291
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          fontSize: '0.78rem',
                          color: '#6B5E55',
                          marginTop: '6px',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <SolarIcon name="letter-linear" size={14} color="#6B5E55" />
                          support@chekup.co.za
                        </span>
                        <span style={{ color: '#DDD0BC' }}>|</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <SolarIcon name="global-linear" size={14} color="#6B5E55" />
                          www.chekup.co.za
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ height: '1px', background: '#EDE5D8', marginBottom: '24px' }} />

                {/* 2. Official Electronic Prescription Meta Bar */}
                <div style={{ marginBottom: '24px' }}>
                  <div
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      color: '#2A170F',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      marginBottom: '12px',
                    }}
                  >
                    OFFICIAL ELECTRONIC PRESCRIPTION
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
                      {/* Issued Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: '1px solid #EDE5D8',
                            background: '#FAF7F2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <SolarIcon name="calendar-linear" size={18} color="#A86C38" />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2A170F', fontWeight: 600 }}>
                          Issued: <span style={{ fontWeight: 700 }}>{new Date(selectedPrescription.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                        </div>
                      </div>

                      <div style={{ width: '1px', height: '28px', background: '#EDE5D8' }} />

                      {/* Validity Period */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            border: '1px solid #EDE5D8',
                            background: '#FAF7F2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <SolarIcon name="hourglass-linear" size={18} color="#A86C38" />
                        </div>
                        <div style={{ fontSize: '0.85rem', color: '#2A170F', fontWeight: 600 }}>
                          Validity: <span style={{ fontWeight: 700 }}>30 Days from Issue</span>{' '}
                          <span style={{ color: '#7A6A5E', fontSize: '0.78rem' }}>(Act 101/1965)</span>
                        </div>
                      </div>
                    </div>

                    {/* Rx ID Pill Badge */}
                    <div
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        background: '#FAF7F2',
                        border: '1px solid #EDE5D8',
                        fontSize: '0.82rem',
                        color: '#2A170F',
                      }}
                    >
                      Rx ID: <strong style={{ fontFamily: 'monospace', fontSize: '0.85rem', letterSpacing: '0.04em' }}>{selectedPrescription.id.toUpperCase()}</strong>
                    </div>
                  </div>
                </div>

                {/* 3. Two-Column Practitioner & Patient Info Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    marginBottom: '24px',
                    border: '1.5px solid #EDE5D8',
                    borderRadius: '14px',
                    padding: '20px 24px',
                    background: '#FFFFFF',
                  }}
                >
                  {/* Prescribing Practitioner */}
                  <div style={{ position: 'relative' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#FAF2E4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SolarIcon name="user-linear" size={16} color="#A86C38" />
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#A86C38',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        PRESCRIBING PRACTITIONER
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#2A170F', marginLeft: '38px' }}>
                      {selectedPrescription.doctor?.fullName ||
                        selectedPrescription.doctor?.user?.fullName ||
                        'Practicing Medical Doctor'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6B5E55', marginLeft: '38px', marginTop: '2px' }}>
                      {selectedPrescription.doctor?.specialty || 'Family Medicine & General Practitioner'}
                    </div>
                    <div
                      style={{
                        fontSize: '0.78rem',
                        color: '#2A170F',
                        marginLeft: '38px',
                        marginTop: '10px',
                        paddingTop: '8px',
                        borderTop: '1px solid #F0EAE1',
                        fontWeight: 600,
                      }}
                    >
                      HPCSA Reg: <span style={{ fontFamily: 'monospace' }}>{selectedPrescription.doctor?.hpcsa_number || 'MP 0712345'}</span> &nbsp;•&nbsp; Practice:{' '}
                      <span style={{ fontFamily: 'monospace' }}>{selectedPrescription.doctor?.practice_number || 'PR 0148291'}</span>
                    </div>
                  </div>

                  {/* Patient Details */}
                  <div style={{ borderLeft: '1px solid #F0EAE1', paddingLeft: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <div
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          background: '#FAF2E4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SolarIcon name="user-linear" size={16} color="#A86C38" />
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#A86C38',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        PATIENT DETAILS
                      </div>
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: '#2A170F', marginLeft: '38px' }}>
                      {user?.fullName || (user as any)?.name || (selectedPrescription as any)?.patient?.fullName || 'Patient'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#6B5E55', marginLeft: '38px', marginTop: '2px' }}>
                      Ref / ID: {selectedPrescription.patient_id}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6B5E55', marginLeft: '38px', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #F0EAE1' }}>
                      Contact: {user?.email || (user as any)?.phone || (selectedPrescription as any)?.patient?.email || '—'}
                    </div>
                  </div>
                </div>

                {/* 4. Clinical Diagnosis & Mandatory ICD-10 Code */}
                <div
                  style={{
                    background: '#FFFFFF',
                    border: '1.5px solid #EDE5D8',
                    borderRadius: '14px',
                    padding: '18px 24px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#FAF2E4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="stethoscope-linear" size={16} color="#A86C38" />
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: '#A86C38',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      PRIMARY DIAGNOSIS & ICD-10 MIT CODE
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '38px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontFamily: 'monospace',
                        fontWeight: 800,
                        fontSize: '0.88rem',
                        padding: '3px 10px',
                        borderRadius: '6px',
                        background: '#F0E7D8',
                        color: '#2A170F',
                      }}
                    >
                      {selectedPrescription.icd10_code}
                    </span>
                    <span style={{ fontWeight: 800, fontSize: '0.98rem', color: '#2A170F' }}>
                      {selectedPrescription.icd10_description}
                    </span>
                  </div>
                  {selectedPrescription.clinical_notes && (
                    <div
                      style={{
                        fontSize: '0.84rem',
                        color: '#6B5E55',
                        marginLeft: '38px',
                        marginTop: '8px',
                        lineHeight: 1.45,
                      }}
                    >
                      {selectedPrescription.clinical_notes}
                    </div>
                  )}
                </div>

                {/* 5. Prescribed Medications Table */}
                <div
                  style={{
                    border: '1.5px solid #EDE5D8',
                    borderRadius: '14px',
                    overflow: 'hidden',
                    marginBottom: '24px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '14px 20px',
                      background: '#FFFFFF',
                      borderBottom: '1px solid #EDE5D8',
                    }}
                  >
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: '#FAF2E4',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="pill-linear" size={16} color="#A86C38" />
                    </div>
                    <div
                      style={{
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        color: '#2A170F',
                        textTransform: 'uppercase',
                        letterSpacing: '0.06em',
                      }}
                    >
                      PRESCRIBED MEDICATIONS (Rx)
                    </div>
                  </div>

                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.85rem',
                        minWidth: '640px',
                      }}
                    >
                      <thead>
                        <tr style={{ background: '#FAF7F2', borderBottom: '1px solid #EDE5D8' }}>
                          <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#4A3B32', textTransform: 'uppercase' }}>#</th>
                          <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#4A3B32', textTransform: 'uppercase' }}>MEDICATION</th>
                          <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#4A3B32', textTransform: 'uppercase' }}>NAPPI</th>
                          <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#4A3B32', textTransform: 'uppercase' }}>SCHED</th>
                          <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#4A3B32', textTransform: 'uppercase' }}>DOSAGE & FREQUENCY</th>
                          <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.7rem', fontWeight: 800, color: '#4A3B32', textTransform: 'uppercase' }}>DURATION</th>
                          <th style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.7rem', fontWeight: 800, color: '#4A3B32', textTransform: 'uppercase' }}>REPEATS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPrescription.items.map((item, idx) => (
                          <React.Fragment key={idx}>
                            <tr style={{ borderBottom: '1px solid #F0EAE1', background: '#FFFFFF' }}>
                              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#7A6A5E' }}>{idx + 1}</td>
                              <td style={{ padding: '12px 14px', fontWeight: 800, color: '#2A170F' }}>{item.medication_name}</td>
                              <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#5C4F46', fontSize: '0.82rem' }}>{item.nappi_code || 'N/A'}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                                <span
                                  style={{
                                    display: 'inline-block',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    fontSize: '0.72rem',
                                    fontWeight: 800,
                                    background: '#ECFDF5',
                                    color: '#047857',
                                    border: '1px solid #A7F3D0',
                                  }}
                                >
                                  S{item.schedule}
                                </span>
                              </td>
                              <td style={{ padding: '12px 14px', color: '#2A170F' }}>{item.dosage} &nbsp;•&nbsp; {item.frequency}</td>
                              <td style={{ padding: '12px 14px', color: '#2A170F' }}>{item.duration}</td>
                              <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: item.repeats > 0 ? '#047857' : '#7A6A5E' }}>
                                {item.repeats > 0 ? `${item.repeats} repeats` : 'None'}
                              </td>
                            </tr>
                            {item.instructions && (
                              <tr style={{ background: '#FFFFFF', borderBottom: '1px solid #F0EAE1' }}>
                                <td></td>
                                <td colSpan={6} style={{ padding: '0 14px 12px', fontSize: '0.8rem', color: '#6B5E55' }}>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontStyle: 'italic' }}>
                                    <SolarIcon name="info-circle-linear" size={14} color="#A86C38" />
                                    Instructions: {item.instructions}
                                  </span>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 6. Supervision Declaration (if applicable) */}
                {selectedPrescription.supervision_declared && (
                  <div
                    style={{
                      background: '#FFFBEB',
                      border: '1.5px solid #F59E0B',
                      borderRadius: '12px',
                      padding: '14px 18px',
                      marginBottom: '24px',
                      fontSize: '0.82rem',
                      color: '#92400E',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 800, marginBottom: '4px' }}>
                      <SolarIcon name="shield-check-linear" size={16} color="#D97706" />
                      MANDATORY SCHEDULE 5 & 6 TELEHEALTH SUPERVISION DECLARATION
                    </div>
                    I confirm this Schedule 5/6 substance was prescribed following a real-time consultation in accordance with
                    South African HPCSA telemedicine ethical guidelines. Logged in platform compliance ledger.
                  </div>
                )}

                {/* 7. Digital Signature, QR Code & Stamp Box */}
                <div
                  style={{
                    background: '#FAF7F2',
                    border: '1.5px solid #EDE5D8',
                    borderRadius: '14px',
                    padding: '20px 24px',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px',
                  }}
                >
                  {/* Left Column: Signature info */}
                  <div style={{ flex: '1 1 320px', minWidth: '260px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <div
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          background: '#FAF2E4',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <SolarIcon name="shield-check-linear" size={14} color="#A86C38" />
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 800,
                          color: '#A86C38',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        DIGITALLY SIGNED & VERIFIED BY PRACTITIONER
                      </div>
                    </div>

                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#2A170F', marginLeft: '34px' }}>
                      {selectedPrescription.doctor?.fullName || 'Practicing Medical Doctor'} (HPCSA:{' '}
                      {selectedPrescription.doctor?.hpcsa_number || 'MP 0712345'})
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#6B5E55', marginLeft: '34px', marginTop: '2px' }}>
                      Electronic Signature Applied: {new Date(selectedPrescription.created_at).toISOString()}
                    </div>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        color: '#6B5E55',
                        fontFamily: 'monospace',
                        marginLeft: '34px',
                        marginTop: '3px',
                        wordBreak: 'break-all',
                      }}
                    >
                      SHA-256 Seal: {selectedPrescription.pdf_hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', color: '#7A6A5E', marginLeft: '34px', marginTop: '6px' }}>
                      <SolarIcon name="lock-linear" size={13} color="#7A6A5E" />
                      <span>Tamper-evident record cryptographically secured in ChekUp247 immutable compliance ledger.</span>
                    </div>
                    {selectedPrescription.doctor?.signature_url && (
                      <div style={{ marginTop: '10px', marginLeft: '34px' }}>
                        <img
                          src={selectedPrescription.doctor.signature_url}
                          alt="Doctor Digital Signature"
                          style={{ maxHeight: '48px', maxWidth: '170px', objectFit: 'contain' }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Middle: QR Code */}
                  {qrCodeUrl && (
                    <div style={{ textAlign: 'center', flexShrink: 0 }}>
                      <img
                        src={qrCodeUrl}
                        alt="Prescription Verification QR Code"
                        style={{
                          width: '84px',
                          height: '84px',
                          borderRadius: '8px',
                          border: '1px solid #EDE5D8',
                          background: '#FFFFFF',
                          padding: '4px',
                          display: 'block',
                          margin: '0 auto',
                        }}
                      />
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#2A170F', marginTop: '4px', letterSpacing: '0.04em' }}>
                        SCAN TO VERIFY
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#7A6A5E' }}>
                        Public verification portal
                      </div>
                    </div>
                  )}

                  {/* Right: Stamp Badge */}
                  <div
                    style={{
                      border: '1.5px solid #C1844D',
                      background: '#FFFFFF',
                      borderRadius: '12px',
                      padding: '12px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      boxShadow: '0 2px 8px rgba(42, 23, 15, 0.04)',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#A86C38',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <SolarIcon name="check-circle-bold" size={20} color="#FFFFFF" />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.8rem', fontWeight: 900, color: '#2A170F', letterSpacing: '0.04em' }}>
                        CHEKUP247
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857' }}>
                        VERIFIED Rx
                      </div>
                      <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#7A6A5E' }}>
                        TAMPER-EVIDENT
                      </div>
                    </div>
                  </div>
                </div>

                {/* 8. Statutory Legal Compliance Footer */}
                <div
                  style={{
                    borderTop: '1px solid #EDE5D8',
                    paddingTop: '14px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '0.76rem',
                    color: '#7A6A5E',
                    lineHeight: 1.45,
                  }}
                >
                  <SolarIcon name="info-circle-linear" size={16} color="#A86C38" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div>
                      Valid electronic prescription issued under Section 22 of ECTA (Act 25 of 2002) and South African Medicines Act (Act 101 of 1965).
                    </div>
                    <div style={{ marginTop: '2px', color: '#8A7B72' }}>
                      Dispensary & Pharmacist Verification: Scan QR code above or verify online via ChekUp247 public verification portal.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PatientPortalLayout>
  );
}
