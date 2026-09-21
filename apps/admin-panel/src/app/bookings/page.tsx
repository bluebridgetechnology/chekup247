'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  RefreshCw,
  Eye,
  X,
  Clock,
  Calendar,
  User,
  Stethoscope,
  FileText,
  CreditCard,
  Pill,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Copy,
  Check,
  AlertCircle,
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface BookingItem {
  id: string;
  reference?: string;
  doctorId?: string;
  doctor_id?: string;
  doctorName?: string;
  doctorHpcsa?: string;
  doctorSpecialty?: string;
  patientId?: string;
  patient_id?: string;
  patientMasked?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  durationMinutes?: number;
  amount?: number;
  price?: number | string;
  status: string;
  extensionMinutes?: number;
  hasPrescription?: boolean;
  createdAt?: string;
  created_at?: string;
  reason_category?: string;
  doctor?: {
    id?: string;
    name?: string;
    fullName?: string;
    specialty?: string;
    hpcsaNumber?: string;
    hpcsa_number?: string;
    facilityName?: string;
  };
  patient?: {
    id?: string;
    name?: string;
    maskedName?: string;
    email?: string;
  };
}

interface BookingDetail {
  id: string;
  reference: string;
  status: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  durationMinutes?: number;
  amount?: number;
  extensionMinutes?: number;
  cancellationReason?: string;
  cancelledBy?: string;
  doctor?: {
    id?: string;
    fullName?: string;
    name?: string;
    hpcsaNumber?: string;
    specialty?: string;
    email?: string;
    phone?: string;
    facilityName?: string;
  };
  patient?: {
    id?: string;
    maskedName?: string;
    name?: string;
    province?: string;
  };
  consultation?: {
    id?: string;
    startedAt?: string;
    endedAt?: string;
    durationSeconds?: number;
    roomName?: string;
    clinicalSummary?: string;
    doctorNotesRaw?: string;
    clinicalEncounter?: {
      chiefComplaint?: string;
      hpi?: string;
      assessment?: string;
      plan?: string;
      patientInstructions?: string;
    };
    diagnosisCodes?: string[];
  };
  prescriptions?: Array<{
    id: string;
    prescriptionNumber: string;
    medicationCount: number;
    isDispensed: boolean;
    signedAt?: string;
  }>;
  payments?: Array<{
    id: string;
    reference: string;
    amount: number;
    status: string;
    type: string;
    channel?: string;
  }>;
}

interface ParsedClinicalEncounter {
  isStructured: boolean;
  chiefComplaint?: string;
  hpi?: string;
  assessment?: string;
  plan?: string;
  patientInstructions?: string;
  formattedText: string;
}

function parseClinicalSummary(
  summary?: string | null,
  encounter?: any
): ParsedClinicalEncounter {
  if (encounter && typeof encounter === 'object') {
    const hasAnyField = Boolean(
      encounter.chiefComplaint ||
      encounter.hpi ||
      encounter.assessment ||
      encounter.plan ||
      encounter.patientInstructions ||
      encounter.patientNotes
    );
    if (hasAnyField) {
      const patientInst = encounter.patientInstructions || encounter.patientNotes;
      const parts: string[] = [];
      if (encounter.chiefComplaint) parts.push(`Chief Complaint:\n${encounter.chiefComplaint}`);
      if (encounter.hpi) parts.push(`History of Present Illness (HPI):\n${encounter.hpi}`);
      if (encounter.assessment) parts.push(`Clinical Assessment:\n${encounter.assessment}`);
      if (encounter.plan) parts.push(`Treatment Plan:\n${encounter.plan}`);
      if (patientInst) parts.push(`Patient Instructions:\n${patientInst}`);
      return {
        isStructured: true,
        chiefComplaint: encounter.chiefComplaint,
        hpi: encounter.hpi,
        assessment: encounter.assessment,
        plan: encounter.plan,
        patientInstructions: patientInst,
        formattedText: parts.join('\n\n') || summary || '',
      };
    }
  }

  if (!summary) {
    return {
      isStructured: false,
      formattedText: 'No clinical encounter summary recorded.',
    };
  }

  // Attempt to parse JSON string if summary is stringified JSON
  try {
    const trimmed = summary.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (typeof parsed === 'object' && parsed !== null) {
        const hasAnyField = Boolean(
          parsed.chiefComplaint ||
          parsed.hpi ||
          parsed.assessment ||
          parsed.plan ||
          parsed.patientInstructions ||
          parsed.patientNotes
        );
        if (hasAnyField) {
          const patientInst = parsed.patientInstructions || parsed.patientNotes;
          const parts: string[] = [];
          if (parsed.chiefComplaint) parts.push(`Chief Complaint:\n${parsed.chiefComplaint}`);
          if (parsed.hpi) parts.push(`History of Present Illness (HPI):\n${parsed.hpi}`);
          if (parsed.assessment) parts.push(`Clinical Assessment:\n${parsed.assessment}`);
          if (parsed.plan) parts.push(`Treatment Plan:\n${parsed.plan}`);
          if (patientInst) parts.push(`Patient Instructions:\n${patientInst}`);

          return {
            isStructured: true,
            chiefComplaint: parsed.chiefComplaint,
            hpi: parsed.hpi,
            assessment: parsed.assessment,
            plan: parsed.plan,
            patientInstructions: patientInst,
            formattedText: parts.join('\n\n'),
          };
        }
      }
    }
  } catch {}

  return {
    isStructured: false,
    formattedText: summary,
  };
}

function BookingsContent() {
  const { token } = useAdminAuth();
  const searchParams = useSearchParams();
  const querySearch = searchParams.get('search') || '';
  const queryPatientId = searchParams.get('patientId') || '';
  const queryDoctorId = searchParams.get('doctorId') || '';

  const [bookings, setBookings] = useState<BookingItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState(querySearch);
  const [patientIdFilter, setPatientIdFilter] = useState(queryPatientId);
  const [doctorIdFilter, setDoctorIdFilter] = useState(queryDoctorId);
  const [statusFilter, setStatusFilter] = useState('all');

  // Summary display & copy states
  const [summaryViewMode, setSummaryViewMode] = useState<'structured' | 'text'>('structured');
  const [copiedSummary, setCopiedSummary] = useState(false);

  // Sync state if URL query params change
  useEffect(() => {
    const qSearch = searchParams.get('search');
    const qPatientId = searchParams.get('patientId');
    const qDoctorId = searchParams.get('doctorId');
    if (qSearch !== null) setSearch(qSearch);
    if (qPatientId !== null) setPatientIdFilter(qPatientId);
    if (qDoctorId !== null) setDoctorIdFilter(qDoctorId);
    if (qSearch !== null || qPatientId !== null || qDoctorId !== null) {
      setPage(1);
    }
  }, [searchParams]);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Selected Booking Drawer
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [bookingDetail, setBookingDetail] = useState<BookingDetail | null>(null);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const fetchBookings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (patientIdFilter) params.set('patientId', patientIdFilter);
      if (doctorIdFilter) params.set('doctorId', doctorIdFilter);
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/admin/bookings?${params.toString()}`, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load bookings (${res.status})`);
      }
      const data = await res.json();
      setBookings(data.bookings || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Failed to load bookings:', err.message);
      setError(err.message || 'Failed to load consultations');
      setBookings([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, patientIdFilter, doctorIdFilter, statusFilter, token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Fetch Booking Detail when selected
  const openDetailDrawer = async (bookingId: string) => {
    setSelectedBookingId(bookingId);
    setIsDetailLoading(true);
    setDetailError(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/admin/bookings/${bookingId}`, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const detail = await res.json();
      setBookingDetail(detail);
    } catch (err: any) {
      console.error('Failed to load booking detail:', err.message);
      setDetailError(err.message || 'Unable to load clinical record');
      // Fallback to row data if available
      const b = bookings.find((x) => x.id === bookingId);
      if (b) {
        setBookingDetail({
          id: b.id,
          reference: getBookingRef(b),
          status: b.status,
          scheduledStartTime: b.scheduledStartTime || b.created_at || b.createdAt,
          durationMinutes: getBookingDuration(b),
          amount: getBookingAmount(b),
          extensionMinutes: b.extensionMinutes || 0,
          doctor: {
            id: b.doctorId || b.doctor_id,
            fullName: getDoctorName(b),
            hpcsaNumber: getDoctorHpcsa(b),
            specialty: getDoctorSpecialty(b),
          },
          patient: {
            id: b.patientId || b.patient_id,
            maskedName: getPatientMasked(b),
          },
        });
      }
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper functions for safe data extraction
  function getBookingRef(b: BookingItem): string {
    if (b.reference && b.reference.trim()) return b.reference;
    return `CHK-${b.id.slice(0, 8).toUpperCase()}`;
  }

  function getDoctorName(b: BookingItem): string {
    return b.doctorName || b.doctor?.fullName || b.doctor?.name || 'Dr. Medical Practitioner';
  }

  function getDoctorHpcsa(b: BookingItem): string {
    return b.doctorHpcsa || b.doctor?.hpcsaNumber || (b.doctor as any)?.hpcsa_number || 'HPCSA Verified';
  }

  function getDoctorSpecialty(b: BookingItem): string {
    return b.doctorSpecialty || b.doctor?.specialty || b.reason_category || 'General Practice';
  }

  function getPatientMasked(b: BookingItem): string {
    if (b.patientMasked) return b.patientMasked;
    if (b.patient?.maskedName) return b.patient.maskedName;
    if (b.patient?.name) {
      const parts = b.patient.name.trim().split(/\s+/);
      const first = parts[0]?.[0] ? `${parts[0][0]}.` : '';
      const last = parts[1] ? `${parts[1][0]}****` : '';
      return [first, last].filter(Boolean).join(' ') || 'Patient';
    }
    return 'Patient (Protected)';
  }

  function getScheduledDate(b: BookingItem): string {
    const raw = b.scheduledStartTime || b.createdAt || b.created_at;
    if (!raw) return '—';
    const d = new Date(raw);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  function getBookingAmount(b: BookingItem): number {
    if (b.amount !== undefined && b.amount !== null && !isNaN(Number(b.amount))) {
      return Number(b.amount);
    }
    if (b.price !== undefined && b.price !== null && !isNaN(Number(b.price))) {
      return Number(b.price);
    }
    return 0;
  }

  function getBookingDuration(b: BookingItem): number {
    return b.durationMinutes || 15;
  }

  const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
    all: { label: 'All Statuses', bg: 'transparent', text: '#201712', border: '#E9E0D5' },
    completed: { label: 'Completed', bg: '#ECF9F3', text: '#18A875', border: '#A7F3D0' },
    in_progress: { label: 'In-Progress', bg: '#FFFBEB', text: '#D88A24', border: '#FDE68A' },
    confirmed: { label: 'Confirmed', bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
    pending: { label: 'Pending', bg: '#FFFBEB', text: '#D88A24', border: '#FDE68A' },
    cancelled: { label: 'Cancelled', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
    no_show: { label: 'No Show', bg: '#F8F5EF', text: '#766C64', border: '#E9E0D5' },
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="page-eyebrow">
            <Activity size={13} />
            <span>Telehealth Clinical Registry</span>
          </div>
          <h1 className="page-title">
            Consultations & Bookings Oversight
          </h1>
          <p className="page-subtitle">
            Global registry of patient appointments, LiveKit video encounters, clinical summaries, and prescription dispatches.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchBookings()}
          disabled={isLoading}
          className="btn-secondary"
          style={{
            fontSize: '0.8125rem',
            padding: '8px 16px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh Consultations</span>
        </button>
      </div>

      {/* Filter Ribbon */}
      <div
        className="admin-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          backgroundColor: '#FFFFFF',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#766C64' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search reference, doctor name, HPCSA, or patient..."
            className="admin-input"
            style={{
              width: '100%',
              paddingLeft: '36px',
              fontSize: '0.8125rem',
              height: '38px',
            }}
          />
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {['all', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'].map((st) => {
            const isSelected = statusFilter === st;
            const badge = statusConfig[st] || { label: st };

            return (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setStatusFilter(st);
                  setPage(1);
                }}
                style={{
                  padding: '6px 13px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  border: isSelected ? '1px solid #201712' : '1px solid #E9E0D5',
                  backgroundColor: isSelected ? '#201712' : '#FFFFFF',
                  color: isSelected ? '#FFFFFF' : '#766C64',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                }}
              >
                {badge.label}
              </button>
            );
          })}
        </div>

        {/* Active Filter Chips for Patient / Doctor ID */}
        {(patientIdFilter || doctorIdFilter) && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: '1px solid #F0ECE6' }}>
            {patientIdFilter && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: '#ECF9F3',
                  color: '#0F8F72',
                  border: '1px solid #A7F3D0',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                <span>Filtered by Patient: {search || patientIdFilter.slice(0, 8)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setPatientIdFilter('');
                    setSearch('');
                    setPage(1);
                  }}
                  title="Clear Patient Filter"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#0F8F72', padding: 0, display: 'flex' }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
            {doctorIdFilter && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  background: '#F7EFE3',
                  color: '#B98232',
                  border: '1px solid #E9E0D5',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                }}
              >
                <span>Filtered by Doctor: {search || doctorIdFilter.slice(0, 8)}</span>
                <button
                  type="button"
                  onClick={() => {
                    setDoctorIdFilter('');
                    setSearch('');
                    setPage(1);
                  }}
                  title="Clear Doctor Filter"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#B98232', padding: 0, display: 'flex' }}
                >
                  <X size={13} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div
          style={{
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#991B1B', fontSize: '0.85rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchBookings()}
            style={{
              background: '#991B1B',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 10px',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Bookings Table */}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '140px' }}>Booking Ref</th>
                <th style={{ minWidth: '200px' }}>Doctor & HPCSA</th>
                <th style={{ minWidth: '150px' }}>Specialty</th>
                <th style={{ minWidth: '170px' }}>Patient (POPIA)</th>
                <th style={{ minWidth: '160px' }}>Scheduled Time</th>
                <th style={{ minWidth: '100px' }}>Duration</th>
                <th style={{ minWidth: '100px' }}>Amount</th>
                <th style={{ minWidth: '110px' }}>Status</th>
                <th style={{ minWidth: '100px' }}>Clinical</th>
                <th style={{ minWidth: '100px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '56px 20px', color: '#766C64' }}>
                    <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', color: '#DFA34F' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading tele-clinical consultations...</p>
                  </td>
                </tr>
              ) : bookings.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '56px 20px', color: '#766C64' }}>
                    <AlertTriangle size={24} style={{ margin: '0 auto 8px', color: '#D88A24' }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#201712' }}>No consultations found</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>No bookings match the current filter or search criteria.</p>
                  </td>
                </tr>
              ) : (
                bookings.map((b) => {
                  const ref = getBookingRef(b);
                  const docName = getDoctorName(b);
                  const docHpcsa = getDoctorHpcsa(b);
                  const specialty = getDoctorSpecialty(b);
                  const patientMasked = getPatientMasked(b);
                  const scheduledTime = getScheduledDate(b);
                  const duration = getBookingDuration(b);
                  const amount = getBookingAmount(b);
                  const isCopied = copiedId === b.id;

                  const statusItem = statusConfig[b.status] || {
                    label: b.status.replace('_', ' '),
                    bg: '#F8F5EF',
                    text: '#766C64',
                    border: '#E9E0D5',
                  };

                  return (
                    <tr
                      key={b.id}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                      onClick={() => openDetailDrawer(b.id)}
                    >
                      {/* Booking Ref */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            className="table-badge-booking-id"
                            title={`Full UUID: ${b.id}`}
                          >
                            {ref}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(ref, b.id);
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: isCopied ? '#18A875' : '#766C64',
                              padding: '2px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title={isCopied ? 'Copied to clipboard' : 'Copy Reference'}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                      </td>

                      {/* Doctor & HPCSA */}
                      <td>
                        <div>
                          <div style={{ fontWeight: 600, color: '#201712', fontSize: '0.85rem' }}>
                            {docName}
                          </div>
                          <div style={{ fontSize: '0.725rem', fontFamily: 'monospace', color: '#B98232', fontWeight: 600, marginTop: '1px' }}>
                            {docHpcsa}
                          </div>
                        </div>
                      </td>

                      {/* Specialty */}
                      <td>
                        <span style={{ color: '#201712', fontWeight: 500, fontSize: '0.8125rem' }}>
                          {specialty}
                        </span>
                      </td>

                      {/* Patient (POPIA Masked) */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <ShieldCheck size={13} color="#18A875" style={{ flexShrink: 0 }} />
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#766C64', fontWeight: 500 }}>
                            {patientMasked}
                          </span>
                        </div>
                      </td>

                      {/* Scheduled Time */}
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: '#201712', fontWeight: 500, whiteSpace: 'nowrap' }}>
                          {scheduledTime}
                        </span>
                      </td>

                      {/* Duration */}
                      <td>
                        <span style={{ fontSize: '0.8125rem', color: '#201712', fontWeight: 600 }}>
                          {duration} min
                          {(b.extensionMinutes ?? 0) > 0 && (
                            <span style={{ color: '#B98232', marginLeft: '4px', fontWeight: 700, fontSize: '0.75rem' }}>
                              (+{b.extensionMinutes}m)
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Amount */}
                      <td>
                        <span style={{ fontWeight: 700, color: '#201712', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
                          R {amount.toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            padding: '3px 9px',
                            borderRadius: '9999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            letterSpacing: '0.02em',
                            textTransform: 'capitalize',
                            backgroundColor: statusItem.bg,
                            color: statusItem.text,
                            border: `1px solid ${statusItem.border}`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <span
                            style={{
                              width: '6px',
                              height: '6px',
                              borderRadius: '50%',
                              backgroundColor: statusItem.text,
                            }}
                          />
                          {statusItem.label}
                        </span>
                      </td>

                      {/* Clinical */}
                      <td>
                        {b.hasPrescription ? (
                          <span
                            title="Electronic Prescription Issued"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.72rem',
                              color: '#18A875',
                              backgroundColor: '#ECF9F3',
                              border: '1px solid #A7F3D0',
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            <Pill size={12} /> e-Script
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: '#766C64' }}>Consult</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailDrawer(b.id);
                          }}
                          className="btn-secondary"
                          style={{
                            padding: '5px 12px',
                            fontSize: '0.75rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <Eye size={12} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #E9E0D5',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FAF8F5',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <span style={{ fontSize: '0.8125rem', color: '#766C64', fontWeight: 500 }}>
            Showing {bookings.length} of {total} total consultations (Page {page} of {totalPages})
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary"
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                opacity: page <= 1 ? 0.5 : 1,
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={13} />
              <span>Previous</span>
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary"
              style={{
                padding: '6px 14px',
                fontSize: '0.78rem',
                opacity: page >= totalPages ? 0.5 : 1,
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              <span>Next</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Slide-over Inspection Drawer */}
      {selectedBookingId && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setSelectedBookingId(null)}
        >
          <div
            className="admin-drawer-panel"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#FFFFFF',
              borderLeft: '1px solid #E9E0D5',
              padding: '28px',
            }}
          >
            {/* Drawer Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E9E0D5', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h2 className="section-title" style={{ fontSize: '1.25rem', margin: 0 }}>
                    Consultation Record
                  </h2>
                  <span
                    className="table-badge-booking-id"
                    style={{ fontSize: '0.78rem' }}
                  >
                    {bookingDetail?.reference || `CHK-${selectedBookingId.slice(0, 8).toUpperCase()}`}
                  </span>
                </div>
                <p className="section-subtitle">
                  Secured Clinical Audit Trace • AWS RDS Patient Isolation Database
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBookingId(null)}
                className="btn-icon"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            {isDetailLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#766C64' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: '#DFA34F' }} />
                <p style={{ fontSize: '0.85rem' }}>Loading clinical telemetry and transaction details...</p>
              </div>
            ) : bookingDetail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                {/* POPIA Security Banner */}
                <div
                  style={{
                    backgroundColor: '#F8F5EF',
                    border: '1px solid #E9E0D5',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontSize: '0.78rem',
                    color: '#201712',
                  }}
                >
                  <ShieldCheck size={18} color="#18A875" style={{ flexShrink: 0 }} />
                  <span>
                    <strong>Section 19 POPIA Privilege:</strong> This inspection event is permanently logged to the immutable governance audit ledger.
                  </span>
                </div>

                {/* Status & Key Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                    <div style={{ fontSize: '0.7rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#201712', textTransform: 'capitalize', marginTop: '2px' }}>
                      {bookingDetail.status.replace('_', ' ')}
                    </div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                    <div style={{ fontSize: '0.7rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>Total Amount</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#18A875', marginTop: '2px' }}>
                      R {bookingDetail.amount ?? 0}
                    </div>
                  </div>
                  <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                    <div style={{ fontSize: '0.7rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>Duration</div>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#201712', marginTop: '2px' }}>
                      {bookingDetail.durationMinutes ?? 15}m {bookingDetail.extensionMinutes ? `(+${bookingDetail.extensionMinutes}m)` : ''}
                    </div>
                  </div>
                </div>

                {/* Doctor & Patient Info */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                      <Stethoscope size={13} /> Attending Doctor
                    </div>
                    <div style={{ fontWeight: 700, color: '#201712', fontSize: '0.9rem' }}>
                      {bookingDetail.doctor?.fullName || bookingDetail.doctor?.name || 'Dr. Medical Practitioner'}
                    </div>
                    <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#766C64', marginTop: '2px' }}>
                      HPCSA: {bookingDetail.doctor?.hpcsaNumber || 'HPCSA Verified'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#201712', marginTop: '2px', fontWeight: 500 }}>
                      {bookingDetail.doctor?.specialty || 'General Practice'}
                    </div>
                    {bookingDetail.doctor?.facilityName && (
                      <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '2px' }}>
                        {bookingDetail.doctor.facilityName}
                      </div>
                    )}
                  </div>

                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                      <User size={13} /> Patient Identifier
                    </div>
                    <div style={{ fontWeight: 700, color: '#201712', fontSize: '0.9rem' }}>
                      {bookingDetail.patient?.maskedName || bookingDetail.patient?.name || 'Patient (Protected)'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '2px' }}>
                      Region: {bookingDetail.patient?.province || 'South Africa'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '2px', fontFamily: 'monospace' }}>
                      ID: {bookingDetail.patient?.id ? `${bookingDetail.patient.id.slice(0, 8)}…` : 'Encrypted'}
                    </div>
                  </div>
                </div>

                {/* Clinical Notes & Diagnosis */}
                {bookingDetail.consultation && (() => {
                  const clinical = parseClinicalSummary(
                    bookingDetail.consultation.clinicalSummary,
                    bookingDetail.consultation.clinicalEncounter
                  );

                  return (
                    <div style={{ background: '#FFFFFF', padding: '18px 20px', borderRadius: '12px', border: '1px solid #E9E0D5', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                      {/* Section Header with Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '0.74rem', color: '#B98232', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          <FileText size={14} /> Clinical Summary & Encounter Notes
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {clinical.isStructured && (
                            <div style={{ display: 'inline-flex', background: '#F8F5EF', padding: '2px', borderRadius: '6px', border: '1px solid #E9E0D5' }}>
                              <button
                                type="button"
                                onClick={() => setSummaryViewMode('structured')}
                                style={{
                                  border: 'none',
                                  background: summaryViewMode === 'structured' ? '#2B170F' : 'transparent',
                                  color: summaryViewMode === 'structured' ? '#ECC27E' : '#766C64',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                Structured
                              </button>
                              <button
                                type="button"
                                onClick={() => setSummaryViewMode('text')}
                                style={{
                                  border: 'none',
                                  background: summaryViewMode === 'text' ? '#2B170F' : 'transparent',
                                  color: summaryViewMode === 'text' ? '#ECC27E' : '#766C64',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  transition: 'all 0.15s ease',
                                }}
                              >
                                Full Text
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(clinical.formattedText);
                              setCopiedSummary(true);
                              setTimeout(() => setCopiedSummary(false), 2000);
                            }}
                            title="Copy clinical encounter summary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              background: '#F8F5EF',
                              border: '1px solid #E9E0D5',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              color: copiedSummary ? '#0F8F72' : '#766C64',
                              cursor: 'pointer',
                            }}
                          >
                            {copiedSummary ? <Check size={11} /> : <Copy size={11} />}
                            <span>{copiedSummary ? 'Copied' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Content Rendering */}
                      {clinical.isStructured && summaryViewMode === 'structured' ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {clinical.chiefComplaint && (
                            <div style={{ background: '#FAF7F2', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #DFA34F' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8C7768', textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.04em' }}>
                                Chief Complaint / Presenting Issue
                              </div>
                              <div style={{ fontSize: '0.84rem', color: '#201712', lineHeight: 1.5, fontWeight: 500 }}>
                                {clinical.chiefComplaint}
                              </div>
                            </div>
                          )}

                          {clinical.hpi && (
                            <div style={{ background: '#FAF7F2', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #2B170F' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#8C7768', textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.04em' }}>
                                History of Present Illness (HPI)
                              </div>
                              <div style={{ fontSize: '0.84rem', color: '#201712', lineHeight: 1.5 }}>
                                {clinical.hpi}
                              </div>
                            </div>
                          )}

                          {clinical.assessment && (
                            <div style={{ background: '#FAF7F2', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #0F8F72' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F8F72', textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.04em' }}>
                                Clinical Assessment & Diagnosis
                              </div>
                              <div style={{ fontSize: '0.84rem', color: '#201712', lineHeight: 1.5, fontWeight: 600 }}>
                                {clinical.assessment}
                              </div>
                            </div>
                          )}

                          {clinical.plan && (
                            <div style={{ background: '#FAF7F2', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #2563EB' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.04em' }}>
                                Treatment Plan & Interventions
                              </div>
                              <div style={{ fontSize: '0.84rem', color: '#201712', lineHeight: 1.5 }}>
                                {clinical.plan}
                              </div>
                            </div>
                          )}

                          {clinical.patientInstructions && (
                            <div style={{ background: '#F4FBF7', padding: '10px 14px', borderRadius: '8px', border: '1px solid #D1F2E2', borderLeft: '3px solid #18A875' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0F8F72', textTransform: 'uppercase', marginBottom: '3px', letterSpacing: '0.04em' }}>
                                Patient Instructions & Care Guidance
                              </div>
                              <div style={{ fontSize: '0.84rem', color: '#201712', lineHeight: 1.5 }}>
                                {clinical.patientInstructions}
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div
                          style={{
                            background: '#FAF8F4',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            border: '1px solid #E9E0D5',
                            fontSize: '0.84rem',
                            color: '#201712',
                            lineHeight: 1.6,
                            whiteSpace: 'pre-wrap',
                            marginBottom: '10px',
                          }}
                        >
                          {clinical.formattedText}
                        </div>
                      )}

                      {/* ICD-10 Diagnostic Codes */}
                      {bookingDetail.consultation.diagnosisCodes && bookingDetail.consultation.diagnosisCodes.length > 0 && (
                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #F0ECE6' }}>
                          <div style={{ fontSize: '0.7rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700, marginBottom: '6px' }}>
                            ICD-10 Diagnostic Codes:
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {bookingDetail.consultation.diagnosisCodes.map((code) => (
                              <span
                                key={code}
                                style={{
                                  fontSize: '0.75rem',
                                  background: '#F8F5EF',
                                  border: '1px solid #E9E0D5',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  color: '#201712',
                                  fontWeight: 600,
                                }}
                              >
                                {code}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Prescriptions */}
                {bookingDetail.prescriptions && bookingDetail.prescriptions.length > 0 && (
                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                      <Pill size={13} /> Issued Electronic Prescriptions
                    </div>
                    {bookingDetail.prescriptions.map((rx) => (
                      <div key={rx.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F0ECE6' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#201712' }}>{rx.prescriptionNumber}</div>
                          <div style={{ fontSize: '0.75rem', color: '#766C64' }}>
                            {rx.medicationCount} Medication(s) • Digitally Signed
                          </div>
                        </div>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '9999px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            backgroundColor: rx.isDispensed ? '#ECF9F3' : '#FFFBEB',
                            color: rx.isDispensed ? '#18A875' : '#D88A24',
                            border: `1px solid ${rx.isDispensed ? '#A7F3D0' : '#FDE68A'}`,
                          }}
                        >
                          {rx.isDispensed ? 'Dispensed' : 'Valid / Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Financial / Payment */}
                {bookingDetail.payments && bookingDetail.payments.length > 0 && (
                  <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                      <CreditCard size={13} /> Payment & Settlements
                    </div>
                    {bookingDetail.payments.map((pm) => (
                      <div key={pm.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.825rem', color: '#201712' }}>{pm.reference}</div>
                          <div style={{ fontSize: '0.725rem', color: '#766C64', textTransform: 'capitalize' }}>
                            {pm.type.replace('_', ' ')} • {pm.channel || 'card'}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#201712' }}>R {pm.amount}</div>
                          <span
                            style={{
                              fontSize: '0.68rem',
                              fontWeight: 700,
                              color: pm.status === 'success' || pm.status === 'released' ? '#18A875' : '#766C64',
                            }}
                          >
                            {pm.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dispute Quick Action */}
                {['cancelled', 'no_show'].includes(bookingDetail.status) && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      borderRadius: '12px',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      gap: '12px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, color: '#991B1B', fontSize: '0.85rem' }}>Dispute or Refund Action Needed</div>
                      <div style={{ fontSize: '0.75rem', color: '#766C64' }}>This appointment was cancelled or recorded as a no-show.</div>
                    </div>
                    <Link
                      href={`/disputes?bookingId=${bookingDetail.id}`}
                      style={{
                        background: '#991B1B',
                        color: '#FFFFFF',
                        padding: '7px 14px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        textDecoration: 'none',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      Resolve Dispute
                    </Link>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

export default function GlobalBookingsOversightPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>Loading consultations…</div>}>
      <BookingsContent />
    </Suspense>
  );
}

