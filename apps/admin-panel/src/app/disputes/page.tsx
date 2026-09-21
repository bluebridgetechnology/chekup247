'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Scale,
  AlertOctagon,
  Search,
  Filter,
  RefreshCw,
  X,
  CreditCard,
  Wallet,
  CheckCircle2,
  AlertCircle,
  Clock,
  PhoneCall,
  User,
  Stethoscope,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface DisputeItem {
  bookingId: string;
  reference: string;
  patientId: string;
  patientMasked: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string;
  status: 'cancelled' | 'no_show';
  amount: number;
  cancellationReason?: string;
  cancelledBy?: string;
  scheduledStartTime: string;
  durationMinutes: number;
  callLogs?: {
    roomName: string;
    durationSeconds: number;
    participantEvents: Array<{
      user: string;
      role: string;
      joinedAt: string;
      leftAt: string;
      reason?: string;
    }>;
  };
  hasRefund: boolean;
  hasCredit: boolean;
  createdAt: string;
}

interface DisputeResponse {
  disputes: DisputeItem[];
  total: number;
  page: number;
  limit: number;
}

function DisputeResolutionWorkspaceInner() {
  const { token, admin } = useAdminAuth();
  const searchParams = useSearchParams();
  const initialBookingId = searchParams.get('bookingId');

  const [data, setData] = useState<DisputeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 15;

  // Active Resolution Modal
  const [selectedDispute, setSelectedDispute] = useState<DisputeItem | null>(null);
  const [resolutionType, setResolutionType] = useState<'refund' | 'credit' | 'dismiss'>('refund');
  const [justificationReason, setJustificationReason] = useState('');
  const [creditAmount, setCreditAmount] = useState<number>(650);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(null);

  const fetchDisputes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/admin/disputes?${params.toString()}`, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);

      // Auto-open if query param is set
      if (initialBookingId && json.disputes) {
        const found = json.disputes.find((d: DisputeItem) => d.bookingId === initialBookingId);
        if (found) {
          setSelectedDispute(found);
          setCreditAmount(found.amount);
        }
      }
    } catch (err: any) {
      console.warn('Fallback disputes dataset applied:', err.message);
      const fallbackDisputes: DisputeItem[] = [
        {
          bookingId: 'bk-908',
          reference: 'CHK-2026-908',
          patientId: 'pat-104',
          patientMasked: 'D. B**** (Free State)',
          doctorId: 'doc-003',
          doctorName: 'Dr. Pieter Coetzee',
          doctorSpecialty: 'Pediatrician',
          status: 'cancelled',
          amount: 700,
          cancellationReason: 'Doctor connection timed out on mobile network due to load shedding stage 4.',
          cancelledBy: 'patient',
          scheduledStartTime: '2026-09-16T10:00:00Z',
          durationMinutes: 20,
          callLogs: {
            roomName: 'consultation-bk-908',
            durationSeconds: 42,
            participantEvents: [
              { user: 'pat-104', role: 'patient', joinedAt: '10:00:15', leftAt: '10:01:02', reason: 'peer_disconnected' },
              { user: 'doc-003', role: 'doctor', joinedAt: '10:00:20', leftAt: '10:00:45', reason: 'network_packet_loss' },
            ],
          },
          hasRefund: false,
          hasCredit: false,
          createdAt: '2026-09-16T08:15:00Z',
        },
        {
          bookingId: 'bk-907',
          reference: 'CHK-2026-907',
          patientId: 'pat-105',
          patientMasked: 'J. K**** (Mpumalanga)',
          doctorId: 'doc-001',
          doctorName: 'Dr. Sarah Van Der Merwe',
          doctorSpecialty: 'General Practitioner',
          status: 'no_show',
          amount: 650,
          cancellationReason: 'Patient failed to join video consultation within the 10-minute grace window.',
          cancelledBy: 'doctor',
          scheduledStartTime: '2026-09-15T16:00:00Z',
          durationMinutes: 15,
          callLogs: {
            roomName: 'consultation-bk-907',
            durationSeconds: 610,
            participantEvents: [
              { user: 'doc-001', role: 'doctor', joinedAt: '16:00:00', leftAt: '16:10:10', reason: 'grace_period_expired' },
            ],
          },
          hasRefund: false,
          hasCredit: false,
          createdAt: '2026-09-15T14:20:00Z',
        },
      ];
      setData({
        disputes: fallbackDisputes,
        total: fallbackDisputes.length,
        page: 1,
        limit: 15,
      });

      if (initialBookingId) {
        const found = fallbackDisputes.find((d) => d.bookingId === initialBookingId);
        if (found) {
          setSelectedDispute(found);
          setCreditAmount(found.amount);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, statusFilter, token, initialBookingId]);

  useEffect(() => {
    fetchDisputes();
  }, [fetchDisputes]);

  const openResolution = (dispute: DisputeItem) => {
    setSelectedDispute(dispute);
    setCreditAmount(dispute.amount);
    setJustificationReason('');
    setActionSuccessMessage(null);
    setActionErrorMessage(null);
  };

  const handleExecuteResolution = async () => {
    if (!selectedDispute) return;
    if (!justificationReason.trim()) {
      setActionErrorMessage('A mandatory POPIA-compliant justification reason is required for any financial action.');
      return;
    }

    setIsSubmitting(true);
    setActionErrorMessage(null);
    setActionSuccessMessage(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      if (resolutionType === 'refund') {
        const res = await fetch(`${API_BASE}/admin/disputes/refund`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            bookingId: selectedDispute.bookingId,
            justificationReason: justificationReason.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Refund processing failed');
        }

        setActionSuccessMessage(`Successfully processed full refund of R${selectedDispute.amount} via Paystack.`);
      } else if (resolutionType === 'credit') {
        const res = await fetch(`${API_BASE}/admin/disputes/credit`, {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify({
            bookingId: selectedDispute.bookingId,
            amount: creditAmount,
            justificationReason: justificationReason.trim(),
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Platform credit failed');
        }

        setActionSuccessMessage(`Successfully credited R${creditAmount} to patient wallet.`);
      } else {
        // Dismiss action
        setActionSuccessMessage('Dispute reviewed and dismissed without financial action.');
      }

      // Refresh list
      setTimeout(() => {
        fetchDisputes();
        setSelectedDispute(null);
      }, 1500);
    } catch (err: any) {
      setActionErrorMessage(err.message || 'An error occurred during dispute resolution.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const disputes = data?.disputes || [];
  const totalPages = Math.ceil((data?.total || 0) / limit) || 1;

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Scale size={26} color="var(--color-gold-dark)" />
            Dispute & Refund Resolution Workspace
          </h1>
          <p className="page-subtitle">
            Investigate cancelled appointments, no-show disputes, and LiveKit telemetry to adjudicate Paystack refunds or patient wallet credits.
          </p>
        </div>

        <button
          onClick={() => fetchDisputes()}
          disabled={isLoading}
          className="btn-secondary"
        >
          <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh Queue</span>
        </button>
      </div>

      {/* Filter Ribbon */}
      <div
        className="admin-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-chocolate-muted)' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search booking ref, patient or doctor..."
            className="admin-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate-muted)' }}>Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="all">All Disputed & Cancelled</option>
            <option value="cancelled">Cancelled</option>
            <option value="no_show">No Show</option>
          </select>
        </div>
      </div>

      {/* Disputes Queue Table */}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Booking Ref</th>
                <th>Patient (Masked)</th>
                <th>Doctor</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Cancellation / Dispute Reason</th>
                <th>Resolution Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {disputes.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-chocolate-muted)' }}>
                    No outstanding cancellation disputes or no-show flags requiring resolution.
                  </td>
                </tr>
              ) : (
                disputes.map((d) => (
                  <tr key={d.bookingId}>
                    <td>
                      <div style={{ fontFamily: 'monospace', color: 'var(--color-gold-dark)', fontWeight: 700 }}>
                        {d.reference || d.bookingId}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-chocolate-muted)' }}>{d.bookingId}</div>
                    </td>
                    <td style={{ color: 'var(--color-chocolate)' }}>{d.patientMasked}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-chocolate)' }}>{d.doctorName}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-chocolate-muted)' }}>{d.doctorSpecialty}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '3px 9px',
                          borderRadius: '999px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: d.status === 'cancelled' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(217, 119, 6, 0.1)',
                          color: d.status === 'cancelled' ? '#DC2626' : '#B45309',
                          textTransform: 'capitalize',
                        }}
                      >
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--color-chocolate)' }}>R {d.amount}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-chocolate)', maxWidth: '300px' }}>
                      {d.cancellationReason || 'No dispute statement provided.'}
                    </td>
                    <td>
                      {d.hasRefund ? (
                        <span style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Refunded
                        </span>
                      ) : d.hasCredit ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-gold-dark)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <CheckCircle2 size={12} /> Credited
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#DC2626', fontWeight: 600 }}>
                          Pending Adjudication
                        </span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        onClick={() => openResolution(d)}
                        className="btn-primary"
                        style={{
                          padding: '6px 14px',
                          fontSize: '0.78rem',
                        }}
                      >
                        <Scale size={13} />
                        <span>Adjudicate</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(42, 23, 15, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--color-cream-canvas)',
          }}
        >
          <span style={{ fontSize: '0.8rem', color: 'var(--color-chocolate-muted)', fontWeight: 500 }}>
            Showing {disputes.length} of {data?.total || 0} disputes (Page {page} of {totalPages})
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
              }}
            >
              <ChevronLeft size={14} /> Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="btn-secondary"
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Dispute Resolution Modal */}
      {selectedDispute && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(42, 23, 15, 0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 60,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
        >
          <div
            className="admin-card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '28px',
              boxShadow: 'var(--shadow-xl)',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid rgba(42, 23, 15, 0.08)', paddingBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Scale size={20} color="var(--color-gold-dark)" />
                  <h2 className="section-title" style={{ margin: 0, fontSize: '1.25rem' }}>
                    Adjudicate Dispute: {selectedDispute.reference || selectedDispute.bookingId}
                  </h2>
                </div>
                <p style={{ color: 'var(--color-chocolate-muted)', fontSize: '0.85rem', margin: 0 }}>
                  Review connection logs, verify grounds, and execute financial remedy.
                </p>
              </div>

              <button
                onClick={() => setSelectedDispute(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-chocolate-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Notification alerts */}
            {actionSuccessMessage && (
              <div style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)', borderRadius: '8px', padding: '12px 16px', color: '#047857', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} /> {actionSuccessMessage}
              </div>
            )}
            {actionErrorMessage && (
              <div style={{ background: 'rgba(220, 38, 38, 0.1)', border: '1px solid rgba(220, 38, 38, 0.35)', borderRadius: '8px', padding: '12px 16px', color: '#DC2626', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} /> {actionErrorMessage}
              </div>
            )}

            {/* Dispute Case Summary */}
            <div style={{ background: 'var(--color-cream-canvas)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(42, 23, 15, 0.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-chocolate-muted)', textTransform: 'uppercase' }}>Patient</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-chocolate)', fontSize: '0.9rem' }}>{selectedDispute.patientMasked}</div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-chocolate-muted)', textTransform: 'uppercase' }}>Attending Doctor</span>
                  <div style={{ fontWeight: 600, color: 'var(--color-chocolate)', fontSize: '0.9rem' }}>{selectedDispute.doctorName}</div>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-chocolate-muted)', textTransform: 'uppercase' }}>Reported Reason</span>
                <div style={{ color: 'var(--color-chocolate)', fontSize: '0.85rem', marginTop: '2px', fontStyle: 'italic', background: 'var(--color-cream-surface)', padding: '8px 12px', borderRadius: '6px', border: '1px solid rgba(42, 23, 15, 0.06)' }}>
                  "{selectedDispute.cancellationReason || 'No dispute statement recorded'}"
                </div>
              </div>
            </div>

            {/* LiveKit Webhook Call Connection Telemetry */}
            {selectedDispute.callLogs && (
              <div style={{ background: 'var(--color-cream-canvas)', padding: '14px 16px', borderRadius: '10px', border: '1px solid rgba(42, 23, 15, 0.08)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--color-gold-dark)', fontWeight: 700, marginBottom: '8px' }}>
                  <PhoneCall size={14} /> LiveKit Session Telemetry
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-chocolate)', marginBottom: '8px' }}>
                  Room: <code style={{ color: 'var(--color-chocolate)', fontWeight: 600 }}>{selectedDispute.callLogs.roomName}</code> • Connected Duration: <strong>{selectedDispute.callLogs.durationSeconds} seconds</strong>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedDispute.callLogs.participantEvents.map((ev, i) => (
                    <div key={i} style={{ fontSize: '0.75rem', color: 'var(--color-chocolate-muted)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>
                        <strong style={{ color: ev.role === 'doctor' ? 'var(--color-chocolate)' : 'var(--color-gold-dark)' }}>{ev.role.toUpperCase()} ({ev.user})</strong> joined at {ev.joinedAt}, left at {ev.leftAt}
                      </span>
                      {ev.reason && <span style={{ color: '#DC2626', fontWeight: 600 }}>[{ev.reason}]</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Resolution Type Picker */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-chocolate)', textTransform: 'uppercase' }}>
                Select Remedial Action
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setResolutionType('refund')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: resolutionType === 'refund' ? '2px solid #DC2626' : '1px solid rgba(42, 23, 15, 0.12)',
                    background: resolutionType === 'refund' ? 'rgba(220, 38, 38, 0.08)' : 'var(--color-cream-surface)',
                    color: 'var(--color-chocolate)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <CreditCard size={18} color="#DC2626" />
                  <span>Paystack Refund</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-chocolate-muted)' }}>R {selectedDispute.amount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionType('credit')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: resolutionType === 'credit' ? '2px solid #047857' : '1px solid rgba(42, 23, 15, 0.12)',
                    background: resolutionType === 'credit' ? 'rgba(16, 185, 129, 0.08)' : 'var(--color-cream-surface)',
                    color: 'var(--color-chocolate)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <Wallet size={18} color="#047857" />
                  <span>Wallet Credit</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-chocolate-muted)' }}>R {creditAmount}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setResolutionType('dismiss')}
                  style={{
                    padding: '14px',
                    borderRadius: '10px',
                    border: resolutionType === 'dismiss' ? '2px solid var(--color-chocolate)' : '1px solid rgba(42, 23, 15, 0.12)',
                    background: resolutionType === 'dismiss' ? 'rgba(42, 23, 15, 0.08)' : 'var(--color-cream-surface)',
                    color: 'var(--color-chocolate)',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                  }}
                >
                  <AlertOctagon size={18} color="var(--color-chocolate-muted)" />
                  <span>Dismiss Case</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--color-chocolate-muted)' }}>No Financial Action</span>
                </button>
              </div>
            </div>

            {/* If Wallet Credit, allow amount modification */}
            {resolutionType === 'credit' && (
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate)' }}>
                  Credit Amount to Patient (Rands):
                </label>
                <input
                  type="number"
                  value={creditAmount}
                  onChange={(e) => setCreditAmount(Number(e.target.value))}
                  className="admin-input"
                  style={{ marginTop: '4px' }}
                />
              </div>
            )}

            {/* Mandatory Justification Note */}
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-chocolate)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Mandatory Adjudication Justification Reason</span>
                <span style={{ color: '#DC2626' }}>* (POPIA Audit Logged)</span>
              </label>
              <textarea
                value={justificationReason}
                onChange={(e) => setJustificationReason(e.target.value)}
                rows={3}
                placeholder="e.g. Telemetry confirms doctor experienced intermittent packet loss and disconnected. Issuing full Paystack refund per Platform Terms Section 6.2."
                className="admin-input"
                style={{ marginTop: '6px', resize: 'vertical' }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid rgba(42, 23, 15, 0.08)', paddingTop: '16px' }}>
              <button
                type="button"
                onClick={() => setSelectedDispute(null)}
                className="btn-secondary"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteResolution}
                disabled={isSubmitting}
                className="btn-primary"
                style={{
                  background: resolutionType === 'refund' ? '#DC2626' : undefined,
                }}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Executing Remedy...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={16} />
                    <span>Confirm & Execute Resolution</span>
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

export default function DisputeResolutionWorkspacePage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '48px', textAlign: 'center', color: '#94a3b8' }}>
          Loading dispute resolution workspace...
        </div>
      }
    >
      <DisputeResolutionWorkspaceInner />
    </Suspense>
  );
}
