'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Wallet,
  CheckCircle2,
  PauseCircle,
  BadgeCheck,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  Search,
  Download,
  Copy,
  Check,
  Clock,
  DollarSign,
  Calendar,
  Building2,
  FileSpreadsheet,
  ShieldAlert,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface PayoutRow {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorHpcsa: string;
  doctorSpecialty: string;
  amount: number;
  status: 'pending' | 'hold' | 'paid' | 'failed';
  periodStart: string;
  periodEnd: string;
  transactionReference: string | null;
  holdReason: string | null;
  approvedAt: string | null;
  createdAt: string;
}

interface PayoutSummary {
  totalPendingAmount: number;
  totalHoldAmount: number;
  totalPaidAmount: number;
  totalPayoutsCount: number;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; color: string; border: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending',
    bg: '#FFFBEB',
    color: '#B45309',
    border: '#FDE68A',
    icon: <Clock size={12} />,
  },
  hold: {
    label: 'On Hold',
    bg: '#FEF2F2',
    color: '#991B1B',
    border: '#FECACA',
    icon: <PauseCircle size={12} />,
  },
  paid: {
    label: 'Settled / Paid',
    bg: '#ECF9F3',
    color: '#18A875',
    border: '#A7F3D0',
    icon: <CheckCircle2 size={12} />,
  },
  failed: {
    label: 'Failed',
    bg: '#F3F4F6',
    color: '#4B5563',
    border: '#E5E7EB',
    icon: <AlertCircle size={12} />,
  },
};

function PayoutsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const querySearch = searchParams.get('search') || '';
  const queryDoctorId = searchParams.get('doctorId') || '';

  const { token, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [summary, setSummary] = useState<PayoutSummary>({
    totalPendingAmount: 0,
    totalHoldAmount: 0,
    totalPaidAmount: 0,
    totalPayoutsCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState(querySearch);
  const [doctorIdFilter, setDoctorIdFilter] = useState(queryDoctorId);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Sync state if URL query params change
  useEffect(() => {
    const qSearch = searchParams.get('search');
    const qDoctorId = searchParams.get('doctorId');
    if (qSearch !== null) setSearch(qSearch);
    if (qDoctorId !== null) setDoctorIdFilter(qDoctorId);
    if (qSearch !== null || qDoctorId !== null) {
      setPage(1);
    }
  }, [searchParams]);

  // Modals
  const [holdModalFor, setHoldModalFor] = useState<PayoutRow | null>(null);
  const [holdReason, setHoldReason] = useState('');
  const [markPaidModalFor, setMarkPaidModalFor] = useState<PayoutRow | null>(null);
  const [transactionRef, setTransactionRef] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchPayouts = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (search.trim()) params.set('search', search.trim());
      if (doctorIdFilter) params.set('doctorId', doctorIdFilter);

      const res = await fetch(`${API_BASE}/admin/payouts?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPayouts(data.payouts || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        throw new Error(`Failed to load payouts (Status ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to fetch payouts:', err);
      setFeedback({ type: 'error', message: err.message || 'Error fetching payouts' });
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, search, doctorIdFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayouts();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPayouts]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApprove = async (id: string) => {
    setBusy(id);
    try {
      const res = await fetch(`${API_BASE}/admin/payouts/${id}/approve`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to release payout hold');
      setFeedback({ type: 'success', message: 'Payout hold released successfully. Status set to pending.' });
      fetchPayouts();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const submitHold = async () => {
    if (!holdModalFor || !holdReason.trim()) return;
    setBusy(holdModalFor.id);
    try {
      const res = await fetch(`${API_BASE}/admin/payouts/${holdModalFor.id}/hold`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ reason: holdReason.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to hold payout');
      setFeedback({ type: 'success', message: 'Payout placed on hold with audit reason.' });
      setHoldModalFor(null);
      setHoldReason('');
      fetchPayouts();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const submitMarkPaid = async () => {
    if (!markPaidModalFor || !transactionRef.trim()) return;
    setBusy(markPaidModalFor.id);
    try {
      const res = await fetch(`${API_BASE}/admin/payouts/${markPaidModalFor.id}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ transactionReference: transactionRef.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to mark payout as paid');
      setFeedback({
        type: 'success',
        message: `Payout marked as paid. Reference: ${transactionRef.trim()}`,
      });
      setMarkPaidModalFor(null);
      setTransactionRef('');
      fetchPayouts();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusy(null);
    }
  };

  const handleExportCsv = () => {
    if (!payouts.length) return;
    const headers = [
      'Payout ID',
      'Doctor Name',
      'HPCSA Number',
      'Specialty',
      'Period Start',
      'Period End',
      'Amount (ZAR)',
      'Status',
      'Hold Reason',
      'Transaction Reference',
      'Created At',
    ];

    const rows = payouts.map((p) => [
      `"${p.id}"`,
      `"${p.doctorName || 'Practitioner'}"`,
      `"${p.doctorHpcsa || ''}"`,
      `"${p.doctorSpecialty || ''}"`,
      `"${new Date(p.periodStart).toLocaleDateString('en-ZA')}"`,
      `"${new Date(p.periodEnd).toLocaleDateString('en-ZA')}"`,
      `"${Number(p.amount).toFixed(2)}"`,
      `"${p.status}"`,
      `"${p.holdReason || ''}"`,
      `"${p.transactionReference || ''}"`,
      `"${new Date(p.createdAt).toISOString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `payouts_ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Wallet size={24} color="#DFA34F" />
            Doctor Payouts Management
          </h1>
          <p className="page-subtitle">
            Review, approve, hold, or reconcile practitioner payout disbursements across South African banking networks.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchPayouts()}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!payouts.length}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 18px',
            borderRadius: '10px',
            background: feedback.type === 'success' ? '#ECF9F3' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#A7F3D0' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#18A875' : '#991B1B',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Summary Stat Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Pending Disbursement</span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#FFFBEB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Clock size={16} color="#DFA34F" />
            </div>
          </div>
          <div className="stat-number">
            R {(summary.totalPendingAmount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Awaiting batch processing or confirmation
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Held in Escrow</span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <PauseCircle size={16} color="#DC2626" />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#DC2626' }}>
            R {(summary.totalHoldAmount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Flagged for dispute or compliance review
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Total Settled (Paid)</span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#ECF9F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CheckCircle2 size={16} color="#18A875" />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#18A875' }}>
            R {(summary.totalPaidAmount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Confirmed out-of-band bank transfers
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Total Settlements</span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#F7EFE3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Wallet size={16} color="#2B170F" />
            </div>
          </div>
          <div className="stat-number">
            {(summary.totalPayoutsCount ?? 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Lifetime practitioner payout records
          </div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className="admin-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#766C64',
            }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search doctor name, HPCSA number, payout ID, or reference..."
            className="admin-input"
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'pending', 'hold', 'paid', 'failed'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatusFilter(s);
                setPage(1);
              }}
              style={{
                padding: '7px 16px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${statusFilter === s ? '#DFA34F' : '#E9E0D5'}`,
                background: statusFilter === s ? '#2B170F' : '#FFFFFF',
                color: statusFilter === s ? '#ECC27E' : '#766C64',
                textTransform: 'capitalize',
                transition: 'all 0.15s ease',
              }}
            >
              {s === 'hold' ? 'On Hold' : s}
            </button>
          ))}
        </div>

        {/* Active Doctor Filter Chip */}
        {doctorIdFilter && (
          <div style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', paddingTop: '4px', borderTop: '1px solid #F0ECE6' }}>
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
          </div>
        )}
      </div>

      {/* Payouts Table Container */}
      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
            <div>Loading practitioner payouts…</div>
          </div>
        ) : payouts.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <Wallet size={36} color="#B98232" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              No payouts match this filter
            </div>
            <p style={{ fontSize: '0.85rem', color: '#766C64', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Try adjusting your search query or status filter to see other disbursements.
            </p>
            {(statusFilter !== 'all' || search) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSearch('');
                  setPage(1);
                }}
                className="btn-secondary"
                style={{ fontSize: '0.8rem', padding: '6px 14px' }}
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Payout ID & Date</th>
                  <th>Practitioner</th>
                  <th>Settlement Period</th>
                  <th>Amount (ZAR)</th>
                  <th>Status & Reference</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payouts.map((p) => {
                  const cfg = statusConfig[p.status] || statusConfig.pending;
                  const initials = p.doctorName
                    ? p.doctorName
                        .replace(/^Dr\.?\s*/i, '')
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()
                    : 'DR';

                  return (
                    <tr key={p.id}>
                      {/* Payout ID & Date */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '0.8rem',
                              fontWeight: 600,
                              color: '#201712',
                              background: '#F8F5EF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #E9E0D5',
                            }}
                          >
                            {p.id.length > 12 ? `${p.id.substring(0, 8)}...` : p.id}
                          </span>
                          <button
                            onClick={() => handleCopy(p.id, p.id)}
                            title="Copy Payout ID"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#766C64' }}
                          >
                            {copiedId === p.id ? <Check size={13} color="#18A875" /> : <Copy size={13} />}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#766C64' }}>
                          {new Date(p.createdAt).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                      </td>

                      {/* Practitioner */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: '#F7EFE3',
                              color: '#B98232',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              border: '1px solid #E9E0D5',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#201712', fontSize: '0.875rem' }}>
                              {p.doctorName || 'Practitioner'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#766C64',
                                  background: '#F8F5EF',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #E9E0D5',
                                  fontWeight: 500,
                                }}
                              >
                                {p.doctorHpcsa || 'HPCSA Verified'}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: '#766C64' }}>•</span>
                              <span style={{ fontSize: '0.75rem', color: '#766C64' }}>
                                {p.doctorSpecialty || 'General Practice'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Settlement Period */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#201712' }}>
                          <Calendar size={13} color="#766C64" />
                          <span>
                            {new Date(p.periodStart).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })}
                            {' – '}
                            {new Date(p.periodEnd).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                      </td>

                      {/* Amount */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#201712', fontSize: '0.95rem' }}>
                          R {Number(p.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </td>

                      {/* Status & Reference */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 9px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                          {cfg.icon}
                          <span>{cfg.label}</span>
                        </div>

                        {p.status === 'hold' && p.holdReason && (
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4px', color: '#991B1B', fontSize: '0.72rem', marginTop: '4px', fontWeight: 500, maxWidth: '240px' }}>
                            <ShieldAlert size={12} style={{ flexShrink: 0, marginTop: '2px' }} />
                            <span>{p.holdReason}</span>
                          </div>
                        )}

                        {p.status === 'paid' && p.transactionReference && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                            <span style={{ fontFamily: 'monospace', fontSize: '0.72rem', color: '#766C64', background: '#F8F5EF', padding: '1px 6px', borderRadius: '4px', border: '1px solid #E9E0D5' }}>
                              {p.transactionReference}
                            </span>
                            <button
                              onClick={() => handleCopy(p.transactionReference!, `${p.id}-ref`)}
                              title="Copy Transfer Reference"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#766C64' }}
                            >
                              {copiedId === `${p.id}-ref` ? <Check size={11} color="#18A875" /> : <Copy size={11} />}
                            </button>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {p.status === 'hold' && (
                            <button
                              onClick={() => handleApprove(p.id)}
                              disabled={busy === p.id}
                              className="btn-secondary"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                color: '#18A875',
                                borderColor: '#A7F3D0',
                                background: '#ECF9F3',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Release Hold</span>
                            </button>
                          )}

                          {p.status === 'pending' && (
                            <button
                              onClick={() => {
                                setHoldModalFor(p);
                                setHoldReason('');
                              }}
                              disabled={busy === p.id}
                              className="btn-secondary"
                              style={{
                                padding: '5px 12px',
                                fontSize: '0.78rem',
                                color: '#991B1B',
                                borderColor: '#FECACA',
                                background: '#FEF2F2',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <PauseCircle size={13} />
                              <span>Hold</span>
                            </button>
                          )}

                          {(p.status === 'pending' || p.status === 'hold') && (
                            <button
                              onClick={() => {
                                setMarkPaidModalFor(p);
                                setTransactionRef(`EFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${p.id.slice(0, 6).toUpperCase()}`);
                              }}
                              disabled={busy === p.id}
                              className="btn-primary"
                              style={{
                                padding: '5px 14px',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                              }}
                            >
                              <BadgeCheck size={13} />
                              <span>Mark Paid</span>
                            </button>
                          )}

                          {p.status === 'paid' && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                color: '#18A875',
                                fontSize: '0.78rem',
                                fontWeight: 600,
                                padding: '4px 8px',
                              }}
                            >
                              <CheckCircle2 size={13} />
                              <span>Reconciled</span>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '14px 20px',
              borderTop: '1px solid #E9E0D5',
              background: '#F8F5EF',
            }}
          >
            <span style={{ color: '#766C64', fontSize: '0.8rem', fontWeight: 500 }}>
              Page {page} of {totalPages} ({total} total disbursements)
            </span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hold Payout Modal */}
      {holdModalFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 23, 18, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="admin-card"
            style={{
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              background: '#FFFFFF',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E9E0D5',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PauseCircle size={18} color="#991B1B" />
                </div>
                <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Place Payout on Hold
                </h2>
              </div>
              <button
                onClick={() => setHoldModalFor(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: '#F8F5EF',
                border: '1px solid #E9E0D5',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.825rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#766C64' }}>Practitioner:</span>
                <span style={{ fontWeight: 600, color: '#201712' }}>{holdModalFor.doctorName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#766C64' }}>HPCSA License:</span>
                <span style={{ fontWeight: 600, color: '#201712' }}>{holdModalFor.doctorHpcsa || 'Verified'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#766C64' }}>Amount to Hold:</span>
                <span style={{ fontWeight: 700, color: '#991B1B' }}>
                  R {Number(holdModalFor.amount).toFixed(2)}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#766C64', marginBottom: '14px' }}>
              Placing this payout on hold will pause automated batch disbursement until an administrator reviews and releases the hold.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Reason for Hold (Required)
            </label>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              rows={3}
              placeholder="e.g. Pending dispute investigation on booking #bk-..., bank details change verification"
              className="admin-input"
              style={{ width: '100%', marginBottom: '12px', resize: 'vertical' }}
            />

            {/* Quick Reason Presets */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {[
                'Disputed consultation',
                'Bank verification pending',
                'HPCSA compliance check',
                'Suspected chargeback',
              ].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setHoldReason(preset)}
                  style={{
                    fontSize: '0.72rem',
                    background: '#F7EFE3',
                    border: '1px solid #E9E0D5',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    color: '#201712',
                    cursor: 'pointer',
                  }}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setHoldModalFor(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={submitHold}
                disabled={!holdReason.trim() || busy === holdModalFor.id}
                className="btn-primary"
                style={{
                  background: '#991B1B',
                  borderColor: '#991B1B',
                  color: '#FFFFFF',
                }}
              >
                {busy === holdModalFor.id ? 'Holding…' : 'Confirm Hold'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mark Paid Modal */}
      {markPaidModalFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 23, 18, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            className="admin-card"
            style={{
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              background: '#FFFFFF',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
              border: '1px solid #E9E0D5',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: '#ECF9F3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <BadgeCheck size={18} color="#18A875" />
                </div>
                <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Confirm Payout Settlement
                </h2>
              </div>
              <button
                onClick={() => setMarkPaidModalFor(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: '#F8F5EF',
                border: '1px solid #E9E0D5',
                padding: '12px 14px',
                borderRadius: '8px',
                marginBottom: '16px',
                fontSize: '0.825rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#766C64' }}>Practitioner:</span>
                <span style={{ fontWeight: 600, color: '#201712' }}>{markPaidModalFor.doctorName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ color: '#766C64' }}>Settlement Period:</span>
                <span style={{ fontWeight: 500, color: '#201712' }}>
                  {new Date(markPaidModalFor.periodStart).toLocaleDateString('en-ZA')} –{' '}
                  {new Date(markPaidModalFor.periodEnd).toLocaleDateString('en-ZA')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#766C64' }}>Disbursed Amount:</span>
                <span style={{ fontWeight: 700, color: '#18A875', fontSize: '0.95rem' }}>
                  R {Number(markPaidModalFor.amount).toFixed(2)}
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#766C64', marginBottom: '14px', lineHeight: 1.4 }}>
              Confirms that R{Number(markPaidModalFor.amount).toFixed(2)} was transferred out-of-band via bank EFT or Paystack Transfer. This action logs the settlement reference in the permanent financial audit ledger.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Bank / EFT Transaction Reference (Required)
            </label>
            <input
              type="text"
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              placeholder="e.g. EFT-2026-09-21-0042 or PSTK-TRF-98124"
              className="admin-input"
              style={{ width: '100%', marginBottom: '20px' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setMarkPaidModalFor(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={submitMarkPaid}
                disabled={!transactionRef.trim() || busy === markPaidModalFor.id}
                className="btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <BadgeCheck size={14} />
                <span>{busy === markPaidModalFor.id ? 'Recording…' : 'Confirm Paid'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayoutManagementPage() {
  return (
    <Suspense fallback={<div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>Loading payouts…</div>}>
      <PayoutsContent />
    </Suspense>
  );
}

