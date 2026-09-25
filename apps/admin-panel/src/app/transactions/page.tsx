'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  FileSpreadsheet,
  Download,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Receipt,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface TransactionItem {
  id: string;
  reference: string;
  bookingId: string;
  patientMasked?: string;
  doctorName?: string;
  type: 'payment' | 'extension' | 'credit' | 'payout' | 'refund';
  grossAmount?: number;
  platformFee?: number;
  netAmount?: number;
  amount?: number;
  status: 'successful' | 'pending' | 'failed' | 'refunded';
  createdAt: string;
}

interface TransactionResponse {
  transactions: TransactionItem[];
  total: number;
  page: number;
  limit: number;
  summary: {
    totalGross: number;
    totalPlatformFee: number;
    totalNet: number;
    totalRefunds: number;
  };
}

export default function FinancialTransactionsLedgerPage() {
  const { token } = useAdminAuth();
  const [data, setData] = useState<TransactionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [datePreset, setDatePreset] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 15;

  const fetchTransactions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      // Date presets
      if (datePreset === 'today') {
        const today = new Date().toISOString().split('T')[0];
        params.set('startDate', today);
      } else if (datePreset === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        params.set('startDate', d.toISOString().split('T')[0]);
      } else if (datePreset === 'month') {
        const d = new Date();
        d.setMonth(d.getMonth() - 1);
        params.set('startDate', d.toISOString().split('T')[0]);
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/admin/transactions?${params.toString()}`, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.warn('Could not load transactions:', err.message);
      setData({
        transactions: [],
        total: 0,
        page: 1,
        limit: 15,
        summary: {
          totalGross: 0,
          totalPlatformFee: 0,
          totalNet: 0,
          totalRefunds: 0,
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, selectedType, selectedStatus, datePreset, token]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedType !== 'all') params.set('type', selectedType);
      if (selectedStatus !== 'all') params.set('status', selectedStatus);

      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/admin/transactions/export?${params.toString()}`, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chekup247-transactions-ledger-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(`Could not export CSV: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const totalGross = Number((data?.summary as any)?.totalGross ?? (data?.summary as any)?.totalPaymentsVolume ?? 0);
  const totalPlatformFee = Number((data?.summary as any)?.totalPlatformFee ?? (totalGross * 0.15));
  const totalNet = Number((data?.summary as any)?.totalNet ?? (totalGross - totalPlatformFee));
  const totalRefunds = Number((data?.summary as any)?.totalRefunds ?? (data?.summary as any)?.totalRefundedVolume ?? 0);

  const summary = {
    totalGross,
    totalPlatformFee,
    totalNet,
    totalRefunds,
  };
  const transactions = data?.transactions || [];
  const totalPages = Math.ceil((data?.total || 0) / limit) || 1;

  const typeBadges: Record<string, { bg: string; text: string; label: string }> = {
    payment: { bg: 'rgba(223, 171, 98, 0.15)', text: '#92400E', label: 'Consultation' },
    extension: { bg: 'rgba(109, 40, 217, 0.1)', text: '#6D28D9', label: 'Extension' },
    credit: { bg: 'rgba(16, 185, 129, 0.1)', text: '#047857', label: 'Wallet Credit' },
    payout: { bg: 'rgba(42, 23, 15, 0.08)', text: '#2A170F', label: 'Doctor Payout' },
    refund: { bg: 'rgba(220, 38, 38, 0.1)', text: '#DC2626', label: 'Refund' },
  };

  const statusBadges: Record<string, { bg: string; text: string }> = {
    successful: { bg: 'rgba(16, 185, 129, 0.1)', text: '#047857' },
    pending: { bg: 'rgba(217, 119, 6, 0.1)', text: '#B45309' },
    failed: { bg: 'rgba(220, 38, 38, 0.1)', text: '#DC2626' },
    refunded: { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569' },
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title">
            Financial Transaction Ledger
          </h1>
          <p className="page-subtitle">
            Unified real-time audit trail of all Paystack card payments, time extension fees, patient credits, and practitioner payouts.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => fetchTransactions()}
            disabled={isLoading}
            className="btn-secondary"
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="btn-primary"
          >
            <Download size={15} />
            <span>{isExporting ? 'Exporting...' : 'Export to CSV'}</span>
          </button>
        </div>
      </div>

      {/* Summary Stat Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Filtered Gross Volume</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(223, 171, 98, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={16} color="#DFAB62" />
            </div>
          </div>
          <div className="stat-number">
            R {(summary.totalGross ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Retained Platform Fees (15%)</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="#047857" />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#047857' }}>
            R {(summary.totalPlatformFee ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Net Attributed to Doctors</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(42, 23, 15, 0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Receipt size={16} color="#2A170F" />
            </div>
          </div>
          <div className="stat-number">
            R {(summary.totalNet ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Total Refunds Issued</span>
            <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(220, 38, 38, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RotateCcw size={16} color="#DC2626" />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#DC2626' }}>
            R {(summary.totalRefunds ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
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
            placeholder="Search reference, booking ID, doctor or patient..."
            className="admin-input"
            style={{ paddingLeft: '36px' }}
          />
        </div>

        {/* Transaction Type Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate-muted)' }}>Type:</span>
          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="all">All Types</option>
            <option value="payment">Consultation Payment</option>
            <option value="extension">Time Extension</option>
            <option value="credit">Patient Wallet Credit</option>
            <option value="payout">Doctor Payout</option>
            <option value="refund">Refund</option>
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-chocolate-muted)' }}>Status:</span>
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="all">All Statuses</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>

        {/* Date Presets */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar size={15} color="var(--color-chocolate-muted)" />
          <select
            value={datePreset}
            onChange={(e) => {
              setDatePreset(e.target.value);
              setPage(1);
            }}
            className="admin-select"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
            <option value="month">Past 30 Days</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="admin-table-container">
        <div style={{ overflowX: 'auto' }}>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reference / ID</th>
                <th>Booking Ref</th>
                <th>Transaction Type</th>
                <th>Patient (POPIA Protected)</th>
                <th>Doctor</th>
                <th>Gross (ZAR)</th>
                <th>Platform Fee (15%)</th>
                <th>Net to Doctor</th>
                <th>Status</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '48px', color: 'var(--color-chocolate-muted)' }}>
                    No financial transactions found matching the selected filters.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => {
                  const type = typeBadges[tx.type] || { bg: 'rgba(42, 23, 15, 0.08)', text: '#2A170F', label: tx.type };
                  const status = statusBadges[tx.status] || { bg: 'rgba(100, 116, 139, 0.12)', text: '#475569' };

                  return (
                    <tr key={tx.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: 'var(--color-chocolate)', fontWeight: 600, fontSize: '0.8rem' }}>
                          {tx.reference || tx.id}
                        </span>
                      </td>
                      <td>
                        {tx.bookingId ? (
                          <Link href={`/bookings?id=${tx.bookingId}`} style={{ fontFamily: 'monospace', color: 'var(--color-gold-dark)', fontWeight: 600, textDecoration: 'none' }}>
                            {tx.bookingId}
                          </Link>
                        ) : (
                          <span style={{ color: 'var(--color-chocolate-muted)' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: type.bg,
                            color: type.text,
                          }}
                        >
                          {type.label}
                        </span>
                      </td>
                      <td style={{ color: '#201712' }}>{tx.patientMasked || 'Platform Direct'}</td>
                      <td style={{ fontWeight: 600, color: '#201712' }}>{tx.doctorName || '—'}</td>
                      <td style={{ fontWeight: 700, color: Number(tx.grossAmount ?? tx.amount ?? 0) < 0 ? '#DC2626' : '#201712' }}>
                        R {Number(tx.grossAmount ?? tx.amount ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={{ color: '#047857', fontWeight: 600 }}>
                        {Number(tx.platformFee ?? 0) > 0
                          ? `R ${Number(tx.platformFee ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          : '—'}
                      </td>
                      <td style={{ color: '#201712', fontWeight: 600 }}>
                        R {Number(tx.netAmount ?? (Number(tx.grossAmount ?? tx.amount ?? 0) - Number(tx.platformFee ?? 0))).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: status.bg,
                            color: status.text,
                            textTransform: 'capitalize',
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--color-chocolate-muted)', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                        {new Date(tx.createdAt).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination bar */}
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
            Showing {transactions.length} of {data?.total || 0} ledger records (Page {page} of {totalPages})
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
    </div>
  );
}
