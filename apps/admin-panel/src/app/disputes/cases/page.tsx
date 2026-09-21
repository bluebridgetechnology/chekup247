'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Scale,
  UserCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Copy,
  Check,
  Eye,
  X,
  ShieldCheck,
  DollarSign,
  AlertTriangle,
  FileText,
  CreditCard,
} from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface DisputeCase {
  id: string;
  booking_id: string;
  raised_by: string;
  category: string;
  reason: string;
  status: 'open' | 'investigating' | 'resolved' | 'rejected';
  assigned_admin_id: string | null;
  resolution_type: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at?: string;
  booking: {
    id: string;
    reference?: string;
    status: string;
    price: number;
    paymentStatus: string;
    patientMasked?: string;
    doctorName?: string;
    doctorSpecialty?: string;
    doctor: { id: string; name: string; specialty: string; hpcsaNumber?: string } | null;
    patient: { id: string; name: string; email: string; maskedName?: string } | null;
  } | null;
}

const statusConfig: Record<string, { label: string; bg: string; text: string; border: string }> = {
  all: { label: 'All Statuses', bg: 'transparent', text: '#201712', border: '#E9E0D5' },
  open: { label: 'Open', bg: '#FEF2F2', text: '#991B1B', border: '#FECACA' },
  investigating: { label: 'Investigating', bg: '#FFFBEB', text: '#D88A24', border: '#FDE68A' },
  resolved: { label: 'Resolved', bg: '#ECF9F3', text: '#18A875', border: '#A7F3D0' },
  rejected: { label: 'Rejected', bg: '#F8F5EF', text: '#766C64', border: '#E9E0D5' },
};

export default function DisputeCasesPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading, admin } = useAdminAuth();

  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Copy feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Inspector & Resolution Drawer State
  const [selectedCase, setSelectedCase] = useState<DisputeCase | null>(null);
  const [resolutionType, setResolutionType] = useState<'refund' | 'credit' | 'no_action'>('refund');
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchCases = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_BASE}/admin/disputes/lifecycle?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load disputes (${res.status})`);
      }

      const data = await res.json();
      setCases(data.disputes || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err: any) {
      console.error('Failed to fetch dispute cases:', err.message);
      setError(err.message || 'Failed to fetch dispute cases');
      setCases([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, statusFilter, search]);

  useEffect(() => {
    if (token) {
      fetchCases();
    }
  }, [fetchCases, token]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAssignToMe = async (id: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/disputes/lifecycle/${id}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to assign dispute case');
      setFeedback({ type: 'success', message: 'Case assigned and moved to investigating.' });
      fetchCases();
      if (selectedCase?.id === id) {
        setSelectedCase((prev) => (prev ? { ...prev, status: 'investigating', assigned_admin_id: admin?.id || 'admin' } : null));
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to assign case' });
    }
  };

  const openResolveDrawer = (c: DisputeCase) => {
    setSelectedCase(c);
    setResolutionType('refund');
    setAmount(Number(c.booking?.price || 0));
    setNotes('');
  };

  const handleResolve = async () => {
    if (!selectedCase || !notes.trim()) {
      setFeedback({ type: 'error', message: 'Resolution audit notes are mandatory.' });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch(`${API_BASE}/admin/disputes/lifecycle/${selectedCase.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          resolutionType,
          amount: resolutionType === 'no_action' ? 0 : amount,
          notes: notes.trim(),
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Failed to resolve dispute');
      }

      setFeedback({ type: 'success', message: 'Dispute case successfully resolved and audited.' });
      setSelectedCase(null);
      fetchCases();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  function getBookingRef(c: DisputeCase): string {
    if (c.booking?.reference && c.booking.reference.trim()) return c.booking.reference;
    return `CHK-${c.booking_id.slice(0, 8).toUpperCase()}`;
  }

  function getPatientMasked(c: DisputeCase): string {
    if (c.booking?.patientMasked) return c.booking.patientMasked;
    if (c.booking?.patient?.maskedName) return c.booking.patient.maskedName;
    if (c.booking?.patient?.name) {
      const parts = c.booking.patient.name.trim().split(/\s+/);
      const first = parts[0]?.[0] ? `${parts[0][0]}.` : '';
      const last = parts[1] ? `${parts[1][0]}****` : '';
      return [first, last].filter(Boolean).join(' ') || 'Patient';
    }
    return 'Patient (Protected)';
  }

  function getDoctorName(c: DisputeCase): string {
    return c.booking?.doctorName || c.booking?.doctor?.name || 'Dr. Medical Practitioner';
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="page-eyebrow">
            <Scale size={13} />
            <span>Financial & Clinical Governance</span>
          </div>
          <h1 className="page-title">
            Dispute Resolution Cases
          </h1>
          <p className="page-subtitle">
            Full dispute lifecycle management: open → investigating → resolved/rejected, with financial settlements and immutable audit ledger.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchCases()}
          disabled={loading}
          className="btn-secondary"
          style={{
            fontSize: '0.8125rem',
            padding: '8px 16px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh Cases</span>
        </button>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '10px',
            backgroundColor: feedback.type === 'success' ? '#ECF9F3' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#18A875' : '#991B1B',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

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
            onClick={() => fetchCases()}
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
            placeholder="Search dispute reason, category, case ID, or booking..."
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
          {['all', 'open', 'investigating', 'resolved', 'rejected'].map((st) => {
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
      </div>

      {/* Disputes Table */}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th style={{ minWidth: '140px' }}>Case ID</th>
                <th style={{ minWidth: '150px' }}>Booking & Fee</th>
                <th style={{ minWidth: '190px' }}>Parties (Patient / Doctor)</th>
                <th style={{ minWidth: '140px' }}>Category</th>
                <th style={{ minWidth: '220px' }}>Dispute Reason</th>
                <th style={{ minWidth: '120px' }}>Status</th>
                <th style={{ minWidth: '110px' }}>Raised By</th>
                <th style={{ minWidth: '150px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '56px 20px', color: '#766C64' }}>
                    <RefreshCw size={22} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', color: '#DFA34F' }} />
                    <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading dispute lifecycle cases...</p>
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '56px 20px', color: '#766C64' }}>
                    <AlertTriangle size={24} style={{ margin: '0 auto 8px', color: '#D88A24' }} />
                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#201712' }}>No dispute cases found</p>
                    <p style={{ fontSize: '0.8rem', marginTop: '4px' }}>No cases match the current filter or search criteria.</p>
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const shortCaseId = `DSP-${c.id.slice(0, 8).toUpperCase()}`;
                  const bookingRef = getBookingRef(c);
                  const patientMasked = getPatientMasked(c);
                  const docName = getDoctorName(c);
                  const isCopied = copiedId === c.id;

                  const statusItem = statusConfig[c.status] || {
                    label: c.status,
                    bg: '#F8F5EF',
                    text: '#766C64',
                    border: '#E9E0D5',
                  };

                  return (
                    <tr
                      key={c.id}
                      style={{ cursor: 'pointer', transition: 'background-color 0.15s ease' }}
                      onClick={() => openResolveDrawer(c)}
                    >
                      {/* Case ID */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span className="table-badge-booking-id" title={`Case UUID: ${c.id}`}>
                            {shortCaseId}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(shortCaseId, c.id);
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
                            title={isCopied ? 'Copied' : 'Copy Case ID'}
                          >
                            {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '2px' }}>
                          {new Date(c.created_at).toLocaleDateString('en-ZA', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Booking & Fee */}
                      <td>
                        <div style={{ fontWeight: 700, color: '#201712', fontSize: '0.85rem' }}>
                          R {Number(c.booking?.price || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}
                        </div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#B98232', fontWeight: 600, marginTop: '1px' }}>
                          {bookingRef}
                        </div>
                      </td>

                      {/* Parties */}
                      <td>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                          <ShieldCheck size={13} color="#18A875" style={{ flexShrink: 0 }} />
                          <span style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: '#766C64', fontWeight: 600 }}>
                            {patientMasked}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginTop: '2px' }}>
                          {docName}
                        </div>
                      </td>

                      {/* Category */}
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            backgroundColor: '#F8F5EF',
                            border: '1px solid #E9E0D5',
                            color: '#201712',
                            textTransform: 'capitalize',
                          }}
                        >
                          {c.category.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Reason */}
                      <td>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '0.8125rem',
                            color: '#201712',
                            lineHeight: 1.4,
                            maxWidth: '300px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={c.reason}
                        >
                          {c.reason}
                        </p>
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

                      {/* Raised By */}
                      <td>
                        <span style={{ fontSize: '0.78rem', color: '#766C64', textTransform: 'capitalize', fontWeight: 500 }}>
                          {c.raised_by || 'patient'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          {c.status === 'open' && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAssignToMe(c.id);
                              }}
                              className="btn-secondary"
                              style={{
                                padding: '5px 10px',
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                              title="Assign case to yourself and move to investigating"
                            >
                              <UserCheck size={12} />
                              <span>Assign</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openResolveDrawer(c);
                            }}
                            className={c.status === 'open' || c.status === 'investigating' ? 'btn-primary' : 'btn-secondary'}
                            style={{
                              padding: '5px 12px',
                              fontSize: '0.75rem',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={12} />
                            <span>{c.status === 'resolved' || c.status === 'rejected' ? 'View' : 'Resolve'}</span>
                          </button>
                        </div>
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
            Showing {cases.length} of {total} total dispute cases (Page {page} of {totalPages})
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

      {/* Slide-over Case Inspection & Resolution Drawer */}
      {selectedCase && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setSelectedCase(null)}
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
                    Dispute Case Investigation
                  </h2>
                  <span
                    className="table-badge-booking-id"
                    style={{ fontSize: '0.78rem' }}
                  >
                    DSP-{selectedCase.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <p className="section-subtitle">
                  Clinical & Financial Dispute Audit • Statutory Regulatory Trail
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCase(null)}
                className="btn-icon"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Status & Key Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                  <div style={{ fontSize: '0.7rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>Status</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#201712', textTransform: 'capitalize', marginTop: '2px' }}>
                    {selectedCase.status}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                  <div style={{ fontSize: '0.7rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>Disputed Fee</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#18A875', marginTop: '2px' }}>
                    R {Number(selectedCase.booking?.price || 0)}
                  </div>
                </div>
                <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                  <div style={{ fontSize: '0.7rem', color: '#766C64', textTransform: 'uppercase', fontWeight: 700 }}>Category</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#201712', textTransform: 'capitalize', marginTop: '2px' }}>
                    {selectedCase.category.replace('_', ' ')}
                  </div>
                </div>
              </div>

              {/* Dispute Narrative */}
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                  <FileText size={13} /> Statement & Reason for Dispute
                </div>
                <p style={{ fontSize: '0.85rem', color: '#201712', lineHeight: 1.55, margin: 0 }}>
                  {selectedCase.reason}
                </p>
                <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '10px' }}>
                  Raised by: <strong>{selectedCase.raised_by.toUpperCase()}</strong> • Submitted:{' '}
                  {new Date(selectedCase.created_at).toLocaleString('en-ZA')}
                </div>
              </div>

              {/* Booking & Parties Summary */}
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                  <CreditCard size={13} /> Associated Booking Telemetry
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <span style={{ color: '#766C64', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Attending Doctor</span>
                    <strong style={{ color: '#201712', fontSize: '0.85rem' }}>{getDoctorName(selectedCase)}</strong>
                    <div style={{ color: '#766C64', fontSize: '0.75rem' }}>{selectedCase.booking?.doctorSpecialty || 'General Practice'}</div>
                  </div>
                  <div>
                    <span style={{ color: '#766C64', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, display: 'block' }}>Patient (POPIA Masked)</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <ShieldCheck size={13} color="#18A875" />
                      <strong style={{ color: '#201712', fontSize: '0.85rem', fontFamily: 'monospace' }}>{getPatientMasked(selectedCase)}</strong>
                    </div>
                  </div>
                </div>
                <div style={{ borderTop: '1px solid #F0ECE6', marginTop: '12px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.78rem', color: '#766C64' }}>
                    Booking Ref: <strong style={{ fontFamily: 'monospace', color: '#201712' }}>{getBookingRef(selectedCase)}</strong>
                  </span>
                  <Link
                    href={`/bookings?id=${selectedCase.booking_id}`}
                    style={{
                      fontSize: '0.78rem',
                      color: '#B98232',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    View Full Booking →
                  </Link>
                </div>
              </div>

              {/* Already Resolved Record */}
              {(selectedCase.status === 'resolved' || selectedCase.status === 'rejected') && (
                <div style={{ background: '#FAF8F5', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#18A875', fontWeight: 700, marginBottom: '8px', textTransform: 'uppercase' }}>
                    <CheckCircle2 size={13} /> Resolution Verdict Record
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#201712', fontWeight: 700, textTransform: 'capitalize' }}>
                    Verdict: {selectedCase.resolution_type?.replace('_', ' ') || selectedCase.status}
                  </div>
                  <p style={{ fontSize: '0.8125rem', color: '#766C64', margin: '6px 0 0 0', lineHeight: 1.5 }}>
                    {selectedCase.resolution_notes || 'No resolution notes recorded.'}
                  </p>
                  {selectedCase.resolved_at && (
                    <div style={{ fontSize: '0.72rem', color: '#766C64', marginTop: '8px' }}>
                      Resolved: {new Date(selectedCase.resolved_at).toLocaleString('en-ZA')}
                    </div>
                  )}
                </div>
              )}

              {/* Resolution Action Form (if open or investigating) */}
              {(selectedCase.status === 'open' || selectedCase.status === 'investigating') && (
                <div style={{ background: '#FFFFFF', padding: '18px', borderRadius: '12px', border: '1.5px solid #DFA34F' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#201712', fontWeight: 700, marginBottom: '12px', textTransform: 'uppercase' }}>
                    <Scale size={14} color="#DFA34F" /> Adjudicate & Resolve Dispute
                  </div>

                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Resolution Verdict
                  </label>
                  <select
                    value={resolutionType}
                    onChange={(e) => setResolutionType(e.target.value as any)}
                    className="admin-select"
                    style={{ width: '100%', marginBottom: '14px', fontSize: '0.8125rem' }}
                  >
                    <option value="refund">Issue Paystack Refund (Return to Card)</option>
                    <option value="credit">Issue Patient Wallet Credit (Immediate Credit)</option>
                    <option value="no_action">Reject Dispute (No Financial Action)</option>
                  </select>

                  {resolutionType !== 'no_action' && (
                    <>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                        Settlement Amount (ZAR)
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(Number(e.target.value))}
                        className="admin-input"
                        style={{ width: '100%', marginBottom: '14px', fontSize: '0.8125rem' }}
                      />
                    </>
                  )}

                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
                    Mandatory Resolution Notes (Audit Trail) *
                  </label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Document the adjudication rationale for compliance and regulatory inspection..."
                    className="admin-input"
                    style={{ width: '100%', marginBottom: '18px', resize: 'vertical', fontSize: '0.8125rem' }}
                  />

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedCase(null)}
                      className="btn-secondary"
                      style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleResolve}
                      disabled={submitting}
                      className="btn-primary"
                      style={{ padding: '8px 20px', fontSize: '0.8125rem' }}
                    >
                      {submitting ? 'Adjudicating...' : 'Confirm Resolution'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
