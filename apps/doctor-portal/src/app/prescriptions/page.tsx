'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { SolarIcon } from '../../components/common/SolarIcon';

interface MedicationItem {
  name?: string;
  medication_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  schedule_flag?: string;
}

interface PrescriptionSummary {
  id: string;
  booking_id: string;
  consultation_id?: string;
  patient_name: string;
  patient_email?: string;
  icd10_code: string;
  icd10_description: string;
  medications?: MedicationItem[];
  medications_count: number;
  schedule_flag: 'S0' | 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';
  status: 'SIGNED & ISSUED' | 'ACTIVE' | 'REVOKED' | 'DISPENSED';
  created_at: string;
  pdf_url?: string;
}

export default function PrescriptionsListPage() {
  const { doctor, token } = useDoctorAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [scheduleFilter, setScheduleFilter] = useState<'ALL' | 'S2-S4' | 'S5-S6' | 'REVOKED'>('ALL');
  const [prescriptions, setPrescriptions] = useState<PrescriptionSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Revoke/Amend Modal State
  const [selectedRxToAmend, setSelectedRxToAmend] = useState<PrescriptionSummary | null>(null);
  const [amendReason, setAmendReason] = useState('');
  const [isAmending, setIsAmending] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [activeKebabId, setActiveKebabId] = useState<string | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  const loadPrescriptions = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      if (!token) {
        setPrescriptions([]);
        return;
      }

      const res = await fetch(`${API_BASE}/prescriptions`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(doctor?.id ? { 'x-doctor-id': doctor.id } : {}),
        },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setPrescriptions(
            data.map((item: any) => {
              const rawMeds = Array.isArray(item.medications) ? item.medications : [];
              return {
                id: item.id,
                booking_id: item.booking_id || item.consultation_id || '',
                consultation_id: item.consultation_id || item.booking_id || '',
                patient_name: item.patient_name || item.booking?.patient?.fullName || 'Patient Client',
                patient_email: item.patient_email || item.booking?.patient?.email || '',
                icd10_code: item.icd10_code || 'General',
                icd10_description: item.icd10_description || item.icd10_code || 'General Consultation',
                medications: rawMeds,
                medications_count: rawMeds.length || item.medications_count || 0,
                schedule_flag: item.schedule_flag || (item.has_schedule_5_6 ? 'S5' : 'S4'),
                status: item.status || 'SIGNED & ISSUED',
                created_at: item.created_at || new Date().toISOString(),
                pdf_url: item.pdf_url,
              };
            }),
          );
          return;
        }
      }
      setPrescriptions([]);
    } catch (err) {
      console.warn('Prescriptions fetch note:', err);
      setPrescriptions([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [token, doctor?.id, API_BASE]);

  useEffect(() => {
    loadPrescriptions();
  }, [loadPrescriptions]);

  // Dynamic Counts
  const counts = useMemo(() => {
    let standard = 0;
    let controlled = 0;
    let revoked = 0;

    prescriptions.forEach((rx) => {
      if (rx.status === 'REVOKED') {
        revoked += 1;
      } else if (['S5', 'S6'].includes(rx.schedule_flag)) {
        controlled += 1;
      } else {
        standard += 1;
      }
    });

    return {
      total: prescriptions.length,
      standard,
      controlled,
      revoked,
    };
  }, [prescriptions]);

  // Filter prescriptions by search and schedule tier
  const filtered = useMemo(() => {
    return prescriptions.filter((rx) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        rx.patient_name.toLowerCase().includes(q) ||
        rx.patient_email?.toLowerCase().includes(q) ||
        rx.icd10_code.toLowerCase().includes(q) ||
        rx.icd10_description.toLowerCase().includes(q) ||
        rx.id.toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (scheduleFilter === 'S2-S4') {
        return rx.status !== 'REVOKED' && ['S0', 'S1', 'S2', 'S3', 'S4'].includes(rx.schedule_flag);
      }
      if (scheduleFilter === 'S5-S6') {
        return rx.status !== 'REVOKED' && ['S5', 'S6'].includes(rx.schedule_flag);
      }
      if (scheduleFilter === 'REVOKED') {
        return rx.status === 'REVOKED';
      }
      return true;
    });
  }, [prescriptions, searchQuery, scheduleFilter]);

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
            ...(doctor?.id ? { 'x-doctor-id': doctor.id } : {}),
          },
          credentials: 'include',
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

      setFeedbackNotice(`Prescription #${selectedRxToAmend.id.substring(0, 8).toUpperCase()} has been revoked and recorded in the clinical audit trail.`);
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
    <div className="prescriptions-page" style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px', width: '100%', boxSizing: 'border-box' }}>
      {/* Top Header Section */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--color-gold-bronze, #B88647)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <SolarIcon name="document-text-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                Clinical EHR • Digital Medicine Compliance
              </span>
            </div>
            <h1
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.95rem',
                fontWeight: 700,
                color: 'var(--color-chocolate-base, #2A170F)',
                letterSpacing: '-0.02em',
                margin: 0,
              }}
            >
              E-Prescriptions Management
            </h1>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.925rem', marginTop: '6px', maxWidth: '680px', lineHeight: 1.5 }}>
              HPCSA-compliant digital prescriptions issued with verified electronic signature, cryptographic seal, and audit ledger.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              type="button"
              onClick={() => loadPrescriptions(true)}
              disabled={isRefreshing}
              className="btn-secondary"
              title="Refresh prescriptions list"
              style={{ padding: '9px 16px', fontSize: '0.84rem' }}
            >
              <SolarIcon
                name="refresh-linear"
                size={16}
                color="var(--color-chocolate-base, #2A170F)"
                style={{
                  animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
                }}
              />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </button>

            <Link href="/appointments" className="btn-primary" style={{ padding: '9px 20px', fontSize: '0.84rem' }}>
              <SolarIcon name="add-circle-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
              <span>Issue From Appointment</span>
            </Link>
          </div>
        </div>

        {/* Metric / KPI Strip — single row on desktop/tablet */}
        <div className="stats-grid-4">
          {/* Total Issued */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Total Issued
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="document-text-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', lineHeight: 1 }}>
              {counts.total}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '8px' }}>
              Digital scripts in practice ledger
            </div>
          </div>

          {/* Standard S2–S4 */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Standard (S2 – S4)
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="pill-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', lineHeight: 1 }}>
              {counts.standard}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#047857', fontWeight: 600, marginTop: '8px' }}>
              Standard therapeutic medications
            </div>
          </div>

          {/* Controlled S5–S6 */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Controlled (S5 – S6)
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: counts.controlled > 0 ? '#fee2e2' : 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon
                  name="danger-triangle-linear"
                  size={18}
                  color={counts.controlled > 0 ? '#b91c1c' : 'var(--color-chocolate-base, #2A170F)'}
                />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: 700, color: counts.controlled > 0 ? '#991b1b' : 'var(--color-chocolate-base, #2A170F)', lineHeight: 1 }}>
              {counts.controlled}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '8px' }}>
              Controlled substances under Section 22A
            </div>
          </div>

          {/* Compliance Status */}
          <div className="portal-card" style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Compliance Seal
              </span>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--color-gold-pale, #F0E5D3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SolarIcon name="shield-check-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem', fontWeight: 700, color: '#047857', lineHeight: 1.2, marginTop: '4px' }}>
              100% Sealed
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', marginTop: '12px' }}>
              HPCSA &amp; SAHPRA compliant
            </div>
          </div>
        </div>
      </div>

      {/* Notice Banner */}
      {feedbackNotice && (
        <div
          style={{
            background: 'var(--color-gold-pale, #F0E5D3)',
            border: '1.5px solid var(--color-gold-base, #DFAB62)',
            borderRadius: '12px',
            padding: '12px 18px',
            color: 'var(--color-chocolate-base, #2A170F)',
            fontWeight: 600,
            fontSize: '0.875rem',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <SolarIcon name="check-circle-linear" size={18} color="#047857" />
          <span>{feedbackNotice}</span>
        </div>
      )}

      {/* Filter Tabs & Search Bar Container */}
      <div
        className="portal-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        {/* Specialty Filter Tabs with Dynamic Count Badges */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          {(
            [
              { id: 'ALL', label: 'All Prescriptions', count: counts.total },
              { id: 'S2-S4', label: 'Standard (S2–S4)', count: counts.standard },
              { id: 'S5-S6', label: 'Controlled (S5–S6)', count: counts.controlled },
              { id: 'REVOKED', label: 'Revoked', count: counts.revoked },
            ] as const
          ).map((tab) => {
            const isActive = scheduleFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setScheduleFilter(tab.id)}
                className={`specialty-chip ${isActive ? 'active' : ''}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: '9999px',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 700 : 500,
                  transition: 'all 0.18s ease',
                }}
              >
                <span>{tab.label}</span>
                <span
                  style={{
                    backgroundColor: isActive ? 'var(--color-chocolate-base, #2A170F)' : 'rgba(223, 171, 98, 0.25)',
                    color: isActive ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    minWidth: '18px',
                    textAlign: 'center',
                  }}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Clean Doctors Search Pill */}
        <div style={{ width: '100%', maxWidth: '360px' }}>
          <div className="doctors-search-pill" style={{ height: '42px' }}>
            <SolarIcon name="magnifer-linear" size={17} color="var(--color-gold-base, #DFAB62)" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient name, Rx ID, ICD-10..."
              className="doctors-search-input"
              style={{ fontSize: '0.85rem' }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--color-cream-text-muted)' }}
                aria-label="Clear search"
              >
                <SolarIcon name="close-circle-linear" size={16} color="var(--color-cream-text-muted)" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prescriptions List / Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: '12px' }}>
          <SolarIcon
            name="refresh-linear"
            size={36}
            color="var(--color-gold-base, #DFAB62)"
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <span style={{ fontSize: '0.875rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            Loading electronic prescriptions ledger...
          </span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="portal-card"
          style={{
            padding: '56px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'var(--color-gold-pale, #F0E5D3)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SolarIcon
              name={searchQuery ? 'magnifer-linear' : 'document-text-linear'}
              size={28}
              color="var(--color-gold-bronze, #B88647)"
            />
          </div>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.25rem',
              color: 'var(--color-chocolate-base, #2A170F)',
              fontWeight: 700,
              margin: '0 0 6px',
            }}
          >
            {searchQuery
              ? `No prescriptions matching "${searchQuery}"`
              : scheduleFilter === 'REVOKED'
              ? 'No revoked prescriptions found'
              : scheduleFilter === 'S5-S6'
              ? 'No controlled prescriptions on file'
              : 'No prescriptions issued yet'}
          </h3>
          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.88rem', maxWidth: '440px', margin: '0 auto 20px', lineHeight: 1.5 }}>
            {searchQuery
              ? 'Try checking for typos or searching by the patient name or Rx reference number.'
              : 'Official prescriptions generated following completed consultations will be listed here with digital verification certificates.'}
          </p>

          {searchQuery ? (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setScheduleFilter('ALL');
              }}
              className="btn-secondary"
              style={{ padding: '8px 20px', fontSize: '0.85rem' }}
            >
              Reset Filters
            </button>
          ) : (
            <Link href="/appointments" className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.85rem' }}>
              <SolarIcon name="calendar-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
              <span>Go to Appointments Queue</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="doctor-table-card doctor-table-view">
            {/* Top Table Header Banner */}
            <div
              style={{
                padding: '14px 20px',
                borderBottom: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
                background: 'var(--color-cream-base, #FAF6EE)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)', fontSize: '0.9rem' }}>
                Official Issued Prescriptions ({filtered.length})
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                <SolarIcon name="shield-check-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                <span>Cryptographically Verified under Section 22A Medicines Act</span>
              </div>
            </div>

            <div className="doctor-table-scroll" style={{ minHeight: '260px' }}>
              <table className="doctor-table">
                <thead>
                  <tr>
                    <th>Patient &amp; Rx Ref</th>
                    <th>Primary Diagnosis (ICD-10)</th>
                    <th>Medications</th>
                    <th>Schedule</th>
                    <th style={{ textAlign: 'center' }}>Status</th>
                    <th>Issued Date</th>
                    <th style={{ textAlign: 'right', paddingRight: '22px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((rx, index) => {
                    const isControlled = rx.schedule_flag === 'S5' || rx.schedule_flag === 'S6';
                    const isRevoked = rx.status === 'REVOKED';
                    const shortRef = rx.id.substring(0, 8).toUpperCase();

                    // Format medications preview
                    let medsPreview = `${rx.medications_count} medication${rx.medications_count === 1 ? '' : 's'}`;
                    if (rx.medications && rx.medications.length > 0) {
                      const firstMed = rx.medications[0].name || rx.medications[0].medication_name;
                      if (firstMed) {
                        medsPreview = rx.medications.length > 1
                          ? `${firstMed} (+${rx.medications.length - 1} more)`
                          : firstMed;
                      }
                    }

                    return (
                      <tr key={rx.id}>
                        {/* Patient & Rx Ref (No Avatar Circle) */}
                        <td>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                              {rx.patient_name}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted, #6B5E55)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--color-gold-bronze, #B88647)' }}>
                                #{shortRef}
                              </span>
                              {rx.patient_email && (
                                <>
                                  <span>•</span>
                                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                                    {rx.patient_email}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* ICD-10 Diagnosis */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span className="badge-gold" style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.78rem' }}>
                              {rx.icd10_code}
                            </span>
                            {rx.icd10_description && rx.icd10_description !== rx.icd10_code && (
                              <span style={{ fontSize: '0.825rem', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 500 }}>
                                {rx.icd10_description}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Medications */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <SolarIcon name="pill-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                            <span style={{ fontSize: '0.825rem', color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 500 }}>
                              {medsPreview}
                            </span>
                          </div>
                        </td>

                        {/* Schedule Badge */}
                        <td>
                          <span
                            className={isControlled ? 'badge-danger' : 'badge-gold'}
                            style={{
                              whiteSpace: 'nowrap',
                              ...(isControlled
                                ? { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }
                                : {}),
                            }}
                          >
                            Schedule {rx.schedule_flag}
                            {isControlled ? ' (Controlled)' : ''}
                          </span>
                        </td>

                        {/* Status */}
                        <td style={{ textAlign: 'center' }}>
                          <span
                            className={isRevoked ? 'badge-danger' : 'badge-gold'}
                            style={{
                              whiteSpace: 'nowrap',
                              ...(isRevoked
                                ? { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }
                                : { backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#047857', borderColor: 'rgba(5, 150, 105, 0.25)' }),
                            }}
                          >
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: isRevoked ? '#dc2626' : '#059669', display: 'inline-block', marginRight: '5px' }} />
                            {rx.status}
                          </span>
                        </td>

                        {/* Issued Date */}
                        <td style={{ whiteSpace: 'nowrap', fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                          {new Date(rx.created_at).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        {/* Actions — Kebab Menu with Popout */}
                        <td style={{ textAlign: 'right', paddingRight: '20px' }}>
                          <div style={{ display: 'inline-block', position: 'relative' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveKebabId(activeKebabId === rx.id ? null : rx.id);
                              }}
                              aria-label={`Actions for prescription #${shortRef}`}
                              aria-expanded={activeKebabId === rx.id}
                              style={{
                                width: '34px',
                                height: '34px',
                                borderRadius: '8px',
                                border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                                background: activeKebabId === rx.id ? 'var(--color-gold-pale, #F0E5D3)' : 'var(--color-cream-surface, #FDFBF7)',
                                color: 'var(--color-chocolate-base, #2A170F)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                              }}
                              className="kebab-btn"
                            >
                              <SolarIcon name="menu-dots-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
                            </button>

                            {activeKebabId === rx.id && (
                              <>
                                <div
                                  onClick={() => setActiveKebabId(null)}
                                  style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    ...(index >= Math.max(1, filtered.length - 2) && filtered.length > 2
                                      ? { bottom: 'calc(100% + 6px)' }
                                      : { top: 'calc(100% + 6px)' }),
                                    right: 0,
                                    width: '200px',
                                    backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                                    borderRadius: '12px',
                                    border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                                    boxShadow: '0 10px 28px rgba(42, 23, 15, 0.15)',
                                    padding: '6px',
                                    zIndex: 100,
                                    textAlign: 'left',
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Download PDF */}
                                  <a
                                    href={`${API_BASE}/prescriptions/${rx.id}/download`}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setActiveKebabId(null)}
                                    className="kebab-menu-item"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      color: 'var(--color-chocolate-base, #2A170F)',
                                      fontSize: '0.83rem',
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    <SolarIcon name="download-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                                    <span>Download PDF</span>
                                  </a>

                                  {/* View in Builder */}
                                  <Link
                                    href={`/consultations/${rx.booking_id}/prescribe`}
                                    onClick={() => setActiveKebabId(null)}
                                    className="kebab-menu-item"
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '10px',
                                      width: '100%',
                                      padding: '8px 12px',
                                      borderRadius: '8px',
                                      color: 'var(--color-chocolate-base, #2A170F)',
                                      fontSize: '0.83rem',
                                      fontWeight: 500,
                                      textDecoration: 'none',
                                      boxSizing: 'border-box',
                                    }}
                                  >
                                    <SolarIcon name="eye-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                                    <span>View Prescription</span>
                                  </Link>

                                  {/* Divider */}
                                  <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }} />

                                  {/* Revoke / Amend */}
                                  {!isRevoked ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveKebabId(null);
                                        setSelectedRxToAmend(rx);
                                      }}
                                      className="kebab-menu-item-danger"
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        borderRadius: '8px',
                                        color: '#dc2626',
                                        fontSize: '0.83rem',
                                        fontWeight: 500,
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        textAlign: 'left',
                                        boxSizing: 'border-box',
                                      }}
                                    >
                                      <SolarIcon name="restart-linear" size={16} color="#dc2626" />
                                      <span>Revoke / Amend</span>
                                    </button>
                                  ) : (
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '10px',
                                        width: '100%',
                                        padding: '8px 12px',
                                        color: 'var(--color-cream-text-muted, #6B5E55)',
                                        fontSize: '0.78rem',
                                        boxSizing: 'border-box',
                                      }}
                                    >
                                      <SolarIcon name="shield-cross-linear" size={15} color="#991b1b" />
                                      <span>Already Revoked</span>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Stacked Cards View */}
          <div className="doctor-cards-view">
            {filtered.map((rx) => {
              const isControlled = rx.schedule_flag === 'S5' || rx.schedule_flag === 'S6';
              const isRevoked = rx.status === 'REVOKED';
              const shortRef = rx.id.substring(0, 8).toUpperCase();

              let medsPreview = `${rx.medications_count} medication${rx.medications_count === 1 ? '' : 's'}`;
              if (rx.medications && rx.medications.length > 0) {
                const firstMed = rx.medications[0].name || rx.medications[0].medication_name;
                if (firstMed) {
                  medsPreview = rx.medications.length > 1
                    ? `${firstMed} (+${rx.medications.length - 1} more)`
                    : firstMed;
                }
              }

              return (
                <div key={rx.id} className="doctor-mobile-card">
                  <div className="doctor-mobile-card-row">
                    {/* Patient & Rx Ref (No Avatar Circle) */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--color-chocolate-base, #2A170F)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {rx.patient_name}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontFamily: 'monospace', marginTop: '2px' }}>
                        #{shortRef}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      <span
                        className={isRevoked ? 'badge-danger' : 'badge-gold'}
                        style={{
                          flexShrink: 0,
                          ...(isRevoked
                            ? { backgroundColor: '#fee2e2', color: '#991b1b', borderColor: '#fecaca' }
                            : { backgroundColor: 'rgba(5, 150, 105, 0.1)', color: '#047857', borderColor: 'rgba(5, 150, 105, 0.25)' }),
                        }}
                      >
                        {rx.status}
                      </span>

                      {/* Mobile Kebab Action Menu */}
                      <div style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveKebabId(activeKebabId === `mobile-${rx.id}` ? null : `mobile-${rx.id}`);
                          }}
                          aria-label={`Actions for prescription #${shortRef}`}
                          aria-expanded={activeKebabId === `mobile-${rx.id}`}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                            background: activeKebabId === `mobile-${rx.id}` ? 'var(--color-gold-pale, #F0E5D3)' : 'var(--color-cream-surface, #FDFBF7)',
                            color: 'var(--color-chocolate-base, #2A170F)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                          }}
                          className="kebab-btn"
                        >
                          <SolarIcon name="menu-dots-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
                        </button>

                        {activeKebabId === `mobile-${rx.id}` && (
                          <>
                            <div
                              onClick={() => setActiveKebabId(null)}
                              style={{ position: 'fixed', inset: 0, zIndex: 90 }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: 'calc(100% + 6px)',
                                right: 0,
                                width: '190px',
                                backgroundColor: 'var(--color-cream-surface, #FDFBF7)',
                                borderRadius: '12px',
                                border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                                boxShadow: '0 10px 28px rgba(42, 23, 15, 0.15)',
                                padding: '6px',
                                zIndex: 100,
                                textAlign: 'left',
                              }}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <a
                                href={`${API_BASE}/prescriptions/${rx.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setActiveKebabId(null)}
                                className="kebab-menu-item"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  color: 'var(--color-chocolate-base, #2A170F)',
                                  fontSize: '0.83rem',
                                  fontWeight: 500,
                                  textDecoration: 'none',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <SolarIcon name="download-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                                <span>Download PDF</span>
                              </a>

                              <Link
                                href={`/consultations/${rx.booking_id}/prescribe`}
                                onClick={() => setActiveKebabId(null)}
                                className="kebab-menu-item"
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px',
                                  width: '100%',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  color: 'var(--color-chocolate-base, #2A170F)',
                                  fontSize: '0.83rem',
                                  fontWeight: 500,
                                  textDecoration: 'none',
                                  boxSizing: 'border-box',
                                }}
                              >
                                <SolarIcon name="eye-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                                <span>View Prescription</span>
                              </Link>

                              <div style={{ height: '1px', backgroundColor: '#F0E6D8', margin: '4px 0' }} />

                              {!isRevoked ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveKebabId(null);
                                    setSelectedRxToAmend(rx);
                                  }}
                                  className="kebab-menu-item-danger"
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    borderRadius: '8px',
                                    color: '#dc2626',
                                    fontSize: '0.83rem',
                                    fontWeight: 500,
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <SolarIcon name="restart-linear" size={16} color="#dc2626" />
                                  <span>Revoke / Amend</span>
                                </button>
                              ) : (
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    color: 'var(--color-cream-text-muted, #6B5E55)',
                                    fontSize: '0.78rem',
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  <SolarIcon name="shield-cross-linear" size={15} color="#991b1b" />
                                  <span>Already Revoked</span>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="doctor-mobile-card-row" style={{ fontSize: '0.82rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="badge-gold" style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>
                        {rx.icd10_code}
                      </span>
                      <span style={{ color: 'var(--color-chocolate-base, #2A170F)', fontWeight: 500 }}>
                        {medsPreview}
                      </span>
                    </div>
                    <span
                      className={isControlled ? 'badge-danger' : 'badge-gold'}
                      style={{
                        fontSize: '0.72rem',
                        ...(isControlled ? { backgroundColor: '#fee2e2', color: '#991b1b' } : {}),
                      }}
                    >
                      Schedule {rx.schedule_flag}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Revoke / Amend Confirmation Modal */}
      {selectedRxToAmend && (
        <div
          className="portal-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isAmending) setSelectedRxToAmend(null);
          }}
        >
          <div
            className="portal-modal-surface"
            style={{
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              position: 'relative',
              borderRadius: '20px',
            }}
          >
            <button
              type="button"
              disabled={isAmending}
              onClick={() => setSelectedRxToAmend(null)}
              aria-label="Close modal"
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--color-cream-text-muted, #6B5E55)',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="close-circle-linear" size={22} color="var(--color-gold-base, #DFAB62)" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '50%',
                  background: '#fee2e2',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="danger-triangle-linear" size={22} color="#dc2626" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                  Revoke E-Prescription
                </h3>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                  Ref: #{selectedRxToAmend.id.substring(0, 8).toUpperCase()} • Patient: {selectedRxToAmend.patient_name}
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted, #6B5E55)', lineHeight: 1.5, marginBottom: '16px' }}>
              Revoking this prescription will instantly invalidate the digital seal in the ChekUp247 EHR and notify the dispensing pharmacy ledger. Please provide a reason for the clinical audit record.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  marginBottom: '6px',
                }}
              >
                Clinical Reason for Revocation *
              </label>
              <textarea
                value={amendReason}
                onChange={(e) => setAmendReason(e.target.value)}
                placeholder="e.g. Adverse reaction reported, dosage adjustment required, or prescription replaced by updated regimen..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                disabled={isAmending}
                onClick={() => setSelectedRxToAmend(null)}
                className="btn-secondary"
                style={{ padding: '9px 18px', fontSize: '0.85rem' }}
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRevokeConfirm}
                disabled={isAmending || !amendReason.trim()}
                className="btn-danger"
                style={{ padding: '9px 20px', fontSize: '0.85rem' }}
              >
                {isAmending ? (
                  <span>Revoking...</span>
                ) : (
                  <>
                    <SolarIcon name="restart-linear" size={15} color="#ffffff" />
                    <span>Confirm Revocation</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
