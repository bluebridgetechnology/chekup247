'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Search,
  Plus,
  Clock,
  CheckCircle2,
  Calendar,
  ExternalLink,
  ShieldCheck,
  Download,
  AlertCircle,
  Shield,
  Filter,
  Eye,
  RotateCcw,
  X,
  User,
} from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../components/common/SolarIcon';

interface PrescriptionSummary {
  id: string;
  booking_id: string;
  patient_name: string;
  patient_email?: string;
  icd10_code: string;
  icd10_description: string;
  medications_count: number;
  schedule_flag: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';
  status: 'SIGNED & ISSUED' | 'ACTIVE' | 'REVOKED' | 'DISPENSED';
  created_at: string;
  download_url?: string;
}

export default function PrescriptionsListPage() {
  const { doctor, profile, token, isAuthenticated } = useDoctorAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'S2-S4' | 'S5-S6'>('ALL');
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Revoke/Amend Modal State
  const [selectedRxToAmend, setSelectedRxToAmend] = useState<PrescriptionSummary | null>(null);
  const [amendReason, setAmendReason] = useState('');
  const [isAmending, setIsAmending] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    let isMounted = true;

    async function loadPrescriptions() {
      try {
        setIsLoading(true);
        if (!token) {
          if (isMounted) setPrescriptions([]);
          return;
        }

        const res = await fetch(`${API_BASE}/prescriptions`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && isMounted) {
            setPrescriptions(
              data.map((item: any) => ({
                id: item.id,
                booking_id: item.booking_id || item.consultation_id || '',
                patient_name: item.booking?.patient?.fullName || item.patient_name || 'Patient',
                patient_email: item.booking?.patient?.email || item.patient_email || '',
                icd10_code: item.icd10_code || 'General',
                icd10_description: item.icd10_description || 'General Consultation',
                medications_count: Array.isArray(item.medications) ? item.medications.length : 0,
                schedule_flag: item.schedule_flag || (item.has_schedule_5_6 ? 'S5' : 'S3'),
                status: item.status || 'SIGNED & ISSUED',
                created_at: item.created_at || new Date().toISOString(),
              })),
            );
            return;
          }
        }
        if (isMounted) setPrescriptions([]);
      } catch (err) {
        console.warn('Prescriptions fetch note:', err);
        if (isMounted) setPrescriptions([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadPrescriptions();

    return () => {
      isMounted = false;
    };
  }, [token, API_BASE]);

  // Filter prescriptions by search and schedule tier
  const filtered = prescriptions.filter((rx) => {
    const matchesSearch =
      rx.patient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.icd10_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.icd10_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rx.id.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (scheduleFilter === 'S2-S4') {
      return ['S2', 'S3', 'S4'].includes(rx.schedule_flag);
    }
    if (scheduleFilter === 'S5-S6') {
      return ['S5', 'S6'].includes(rx.schedule_flag);
    }
    return true;
  });

  const handleRevokeConfirm = async () => {
    if (!selectedRxToAmend) return;
    try {
      setIsAmending(true);
      if (token) {
        const res = await fetch(`${API_BASE}/prescriptions/${selectedRxToAmend.id}/revoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: amendReason }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Failed to revoke prescription');
        }
      }

      setPrescriptions((prev) =>
        prev.map((item) =>
          item.id === selectedRxToAmend.id ? { ...item, status: 'REVOKED' } : item,
        ),
      );

      setFeedbackNotice(`Prescription #${selectedRxToAmend.id.toUpperCase()} has been revoked and marked in the audit trail.`);
      setSelectedRxToAmend(null);
      setAmendReason('');
      setTimeout(() => setFeedbackNotice(null), 5000);
    } catch (e: any) {
      console.warn('Revoke note:', e);
      setFeedbackNotice(e.message || 'Failed to revoke prescription');
      setTimeout(() => setFeedbackNotice(null), 5000);
    } finally {
      setIsAmending(false);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 8px' }}>
      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <ChekupCrossLogo size={28} />
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.85rem',
                fontWeight: 800,
                color: 'var(--color-chocolate-base, #2A170F)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              E-Prescriptions Management
            </h1>
          </div>
          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem', margin: 0 }}>
            HPCSA-compliant digital prescriptions issued with verified electronic signature and audit ledger.
          </p>
        </div>

        {/* Primary CTA Button */}
        <Link href="/appointments" className="btn-primary">
          <Plus size={16} />
          <span>Issue From Appointment</span>
        </Link>
      </div>

      {feedbackNotice && (
        <div
          style={{
            background: 'var(--color-gold-pale, #F0E5D3)',
            border: '1.5px solid var(--color-gold-base, #DFAB62)',
            borderRadius: '12px',
            padding: '14px 18px',
            color: 'var(--color-chocolate-base, #2A170F)',
            fontWeight: 600,
            fontSize: '0.9rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Search & Schedule Filters Bar */}
      <div
        className="portal-card"
        style={{
          padding: '16px 20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--color-gold-base, #DFAB62)',
              }}
            />
            <input
              type="text"
              placeholder="Search by patient name, prescription ID, ICD-10 code or diagnosis..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="portal-input"
              style={{ paddingLeft: '44px' }}
            />
          </div>

          {/* Schedule Chips Filter (.specialty-chip) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-cream-text-muted, #6B5E55)' }}>
              Schedule:
            </span>
            <button
              type="button"
              onClick={() => setScheduleFilter('ALL')}
              className={`specialty-chip ${scheduleFilter === 'ALL' ? 'active' : ''}`}
            >
              All Prescriptions
            </button>
            <button
              type="button"
              onClick={() => setScheduleFilter('S2-S4')}
              className={`specialty-chip ${scheduleFilter === 'S2-S4' ? 'active' : ''}`}
            >
              S2 – S4 (Standard)
            </button>
            <button
              type="button"
              onClick={() => setScheduleFilter('S5-S6')}
              className={`specialty-chip ${scheduleFilter === 'S5-S6' ? 'active' : ''}`}
            >
              S5 – S6 (Controlled)
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Table Container */}
      <div className="clinical-table-container">
        {/* Table Top Header Banner */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
            background: 'var(--color-cream-base, #FAF6EE)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.95rem' }}>
            Official Issued Prescriptions ({filtered.length})
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            <ShieldCheck size={14} style={{ color: 'var(--color-gold-dark, #C9944A)' }} />
            <span>Cryptographically Verified under Section 22A Medicines Act</span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: '56px 24px', textAlign: 'center' }}>
            <FileText size={44} style={{ margin: '0 auto 12px auto', color: 'var(--color-gold-base, #DFAB62)' }} />
            <h3 style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: '0 0 6px 0' }}>
              No prescriptions found
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-cream-text-muted, #6B5E55)', maxWidth: '400px', margin: '0 auto 18px' }}>
              No prescriptions match your search query or schedule filter. Try clearing filters or issue a new prescription.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setScheduleFilter('ALL');
              }}
              className="btn-secondary"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="clinical-table">
              <thead>
                <tr>
                  <th className="clinical-th" style={{ position: 'sticky', top: 0 }}>PATIENT</th>
                  <th className="clinical-th" style={{ position: 'sticky', top: 0 }}>PRIMARY ICD-10 DIAGNOSIS</th>
                  <th className="clinical-th" style={{ position: 'sticky', top: 0 }}>MEDICATIONS</th>
                  <th className="clinical-th" style={{ position: 'sticky', top: 0 }}>SCHEDULE</th>
                  <th className="clinical-th" style={{ position: 'sticky', top: 0 }}>STATUS</th>
                  <th className="clinical-th" style={{ position: 'sticky', top: 0 }}>ISSUED DATE</th>
                  <th className="clinical-th" style={{ position: 'sticky', top: 0, textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((rx) => (
                  <tr key={rx.id} className="clinical-tr">
                    {/* Patient Column with Avatar */}
                    <td className="clinical-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: 'var(--color-gold-pale, #F0E5D3)',
                            color: 'var(--color-chocolate-base, #2A170F)',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1.5px solid rgba(223, 171, 98, 0.4)',
                            flexShrink: 0,
                          }}
                        >
                          {rx.patient_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.9rem' }}>
                            {rx.patient_name}
                          </div>
                          <div style={{ fontSize: '0.725rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontFamily: 'monospace' }}>
                            #{rx.id.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* ICD-10 Diagnosis */}
                    <td className="clinical-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 800,
                            fontSize: '0.8rem',
                            padding: '2px 8px',
                            borderRadius: '6px',
                            background: 'var(--color-gold-pale, #F0E5D3)',
                            color: 'var(--color-chocolate-base, #2A170F)',
                            border: '1px solid rgba(223, 171, 98, 0.4)',
                          }}
                        >
                          {rx.icd10_code}
                        </span>
                        <span style={{ fontSize: '0.85rem', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 500 }}>
                          {rx.icd10_description}
                        </span>
                      </div>
                    </td>

                    {/* Medications Count */}
                    <td className="clinical-td">
                      <span
                        style={{
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          color: 'var(--color-cream-text-muted, #6B5E55)',
                        }}
                      >
                        {rx.medications_count} item{rx.medications_count > 1 ? 's' : ''}
                      </span>
                    </td>

                    {/* Schedule Badge */}
                    <td className="clinical-td">
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          padding: '3px 10px',
                          borderRadius: '9999px',
                          background:
                            rx.schedule_flag === 'S5' || rx.schedule_flag === 'S6'
                              ? '#fee2e2'
                              : 'var(--color-gold-pale, #F0E5D3)',
                          color:
                            rx.schedule_flag === 'S5' || rx.schedule_flag === 'S6'
                              ? '#991b1b'
                              : 'var(--color-chocolate-base, #2A170F)',
                          border:
                            rx.schedule_flag === 'S5' || rx.schedule_flag === 'S6'
                              ? '1px solid #fecaca'
                              : '1px solid rgba(223, 171, 98, 0.4)',
                        }}
                      >
                        Schedule {rx.schedule_flag}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="clinical-td">
                      {rx.status === 'REVOKED' ? (
                        <span className="badge-danger">
                          <AlertCircle size={12} />
                          <span>REVOKED</span>
                        </span>
                      ) : (
                        <span className="badge-success">
                          <CheckCircle2 size={12} />
                          <span>{rx.status}</span>
                        </span>
                      )}
                    </td>

                    {/* Issued Date */}
                    <td className="clinical-td" style={{ fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                      {new Date(rx.created_at).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </td>

                    {/* Action Buttons: Download PDF & Revoke/Amend */}
                    <td className="clinical-td" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        {/* Download PDF Button */}
                        <a
                          href={`${API_BASE}/prescriptions/${rx.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          title="Download Signed PDF Stationary"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'var(--color-cream-surface, #FDFBF7)',
                            border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                            color: 'var(--color-chocolate-base, #2A170F)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textDecoration: 'none',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-gold-pale, #F0E5D3)')}
                          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-cream-surface, #FDFBF7)')}
                        >
                          <Download size={14} style={{ color: 'var(--color-gold-dark, #C9944A)' }} />
                          <span>PDF</span>
                        </a>

                        {/* View in Builder */}
                        <Link
                          href={`/consultations/${rx.booking_id}/prescribe`}
                          title="View in Prescription Builder"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            background: 'var(--color-cream-surface, #FDFBF7)',
                            border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
                            color: 'var(--color-chocolate-base, #2A170F)',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            textDecoration: 'none',
                          }}
                          onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-gold-pale, #F0E5D3)')}
                          onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => ((e.currentTarget as HTMLElement).style.background = 'var(--color-cream-surface, #FDFBF7)')}
                        >
                          <Eye size={14} />
                          <span>View</span>
                        </Link>

                        {/* Revoke / Amend Button */}
                        {rx.status !== 'REVOKED' && (
                          <button
                            type="button"
                            onClick={() => setSelectedRxToAmend(rx)}
                            title="Revoke or Amend Prescription"
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              background: 'transparent',
                              border: '1px solid rgba(220, 38, 38, 0.3)',
                              color: '#dc2626',
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.background = '#fee2e2')}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                          >
                            <RotateCcw size={13} />
                            <span>Revoke</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* REVOKE / AMEND CONFIRMATION MODAL */}
      {selectedRxToAmend && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(42, 23, 15, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="portal-card"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '30px',
              border: '1.5px solid var(--color-gold-base, #DFAB62)',
              boxShadow: '0 24px 48px rgba(42, 23, 15, 0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: '#fee2e2',
                    color: '#dc2626',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle size={22} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)' }}>
                    Revoke E-Prescription
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Ref: #{selectedRxToAmend.id.toUpperCase()} • Patient: {selectedRxToAmend.patient_name}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedRxToAmend(null)}
                style={{ background: 'none', border: 'none', color: 'var(--color-cream-text-muted, #6B5E55)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', lineHeight: 1.5, marginBottom: '16px' }}>
              Revoking this prescription will instantly invalidate the digital seal in the ChekUp247 EHR and notify the dispensing pharmacy ledger. Please provide a reason for the clinical audit record.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label className="portal-label">Clinical Reason for Revocation / Amendment *</label>
              <textarea
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                placeholder="e.g. Adverse reaction reported, dosage adjustment required, or prescription replaced by updated regimen..."
                rows={3}
                className="portal-textarea"
                style={{ fontSize: '0.85rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setSelectedRxToAmend(null)}
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeConfirm}
                disabled={isAmending || !amendReason.trim()}
                style={{
                  padding: '10px 20px',
                  borderRadius: '9999px',
                  background: !amendReason.trim() ? '#cbd5e1' : '#dc2626',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: !amendReason.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {isAmending ? 'Revoking...' : 'Confirm Revocation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
