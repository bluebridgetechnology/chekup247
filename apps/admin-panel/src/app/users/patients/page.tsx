'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ShieldOff,
  ShieldCheck,
  Download,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Mail,
  Phone,
  Calendar,
  Wallet,
  Eye,
  Check,
  Copy,
  UserCheck,
  UserX,
  Clock,
  ShieldAlert,
  ExternalLink,
  MessageSquare,
  FileSpreadsheet,
} from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface PatientRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: 'active' | 'suspended' | 'banned';
  isEmailVerified: boolean;
  createdAt: string;
  totalBookings: number;
}

interface PatientDetail extends PatientRow {
  dateOfBirth: string | null;
  recentBookings: any[];
  walletCredits: any[];
  reviewsGiven: number;
}

interface PatientSummary {
  totalPatients: number;
  activePatients: number;
  suspendedPatients: number;
  totalBookings: number;
}

const statusConfig: Record<
  string,
  { label: string; bg: string; color: string; border: string; icon: React.ReactNode }
> = {
  active: {
    label: 'Active',
    bg: '#ECF9F3',
    color: '#18A875',
    border: '#A7F3D0',
    icon: <CheckCircle2 size={12} />,
  },
  suspended: {
    label: 'Suspended',
    bg: '#FFFBEB',
    color: '#B45309',
    border: '#FDE68A',
    icon: <Clock size={12} />,
  },
  banned: {
    label: 'Banned / Deleted',
    bg: '#FEF2F2',
    color: '#991B1B',
    border: '#FECACA',
    icon: <ShieldAlert size={12} />,
  },
};

export default function PatientManagementPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [summary, setSummary] = useState<PatientSummary>({
    totalPatients: 0,
    activePatients: 0,
    suspendedPatients: 0,
    totalBookings: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Drawer & Inspection State
  const [detail, setDetail] = useState<PatientDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'bookings' | 'popia'>('overview');
  const [actionBusy, setActionBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modals State
  const [suspendModalFor, setSuspendModalFor] = useState<PatientDetail | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteModalFor, setDeleteModalFor] = useState<PatientDetail | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchPatients = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (search.trim()) params.set('search', search.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`${API_BASE}/admin/patients?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        throw new Error(`Failed to load patients (Status ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to fetch patients:', err);
      setFeedback({ type: 'error', message: err.message || 'Error loading patients' });
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPatients();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    setDrawerTab('overview');
    try {
      const res = await fetch(`${API_BASE}/admin/patients/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setDetail(data);
      } else {
        throw new Error('Failed to load patient detail');
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to fetch patient profile' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleToggleSuspend = async () => {
    if (!suspendModalFor) return;
    const isCurrentlySuspended = suspendModalFor.status === 'suspended';
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/admin/patients/${suspendModalFor.id}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          suspend: !isCurrentlySuspended,
          reason: suspendReason.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error('Failed to update patient account status');

      setFeedback({
        type: 'success',
        message: `Patient ${suspendModalFor.fullName} has been ${isCurrentlySuspended ? 'reactivated' : 'suspended'}.`,
      });
      setSuspendModalFor(null);
      setSuspendReason('');
      openDetail(suspendModalFor.id);
      fetchPatients();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Action failed' });
    } finally {
      setActionBusy(false);
    }
  };

  const handlePopiaExport = async (id: string, name: string) => {
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/admin/patients/${id}/popia-export`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to export patient POPIA record');
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chekup247_patient_${id}_popia_export.json`;
      a.click();
      URL.revokeObjectURL(url);
      setFeedback({ type: 'success', message: `POPIA data export generated for ${name}.` });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Export failed' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModalFor) return;
    setActionBusy(true);
    try {
      const res = await fetch(
        `${API_BASE}/admin/patients/${deleteModalFor.id}?reason=${encodeURIComponent(deleteReason.trim() || 'Deleted by administrator under POPIA Right to be Forgotten')}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        },
      );
      if (!res.ok) throw new Error('Failed to delete patient');
      setFeedback({
        type: 'success',
        message: `Patient account ${deleteModalFor.fullName} deleted and personal data scrubbed.`,
      });
      setDeleteModalFor(null);
      setDeleteReason('');
      setDetail(null);
      fetchPatients();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete failed' });
    } finally {
      setActionBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (!patients.length) return;
    const headers = [
      'Patient ID',
      'Full Name',
      'Email',
      'Phone',
      'Account Status',
      'Email Verified',
      'Total Consultations',
      'Registered Date',
    ];

    const rows = patients.map((p) => [
      `"${p.id}"`,
      `"${p.fullName || 'Registered Patient'}"`,
      `"${p.email || ''}"`,
      `"${p.phone || ''}"`,
      `"${p.status}"`,
      `"${p.isEmailVerified ? 'Yes' : 'No'}"`,
      `"${p.totalBookings || 0}"`,
      `"${new Date(p.createdAt).toISOString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `patients_registry_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'PT';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={24} color="#DFA34F" />
            Patient Management & POPIA Registry
          </h1>
          <p className="page-subtitle">
            Search, review, manage access, and execute statutory POPIA data subject access requests for registered patients.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchPatients()}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!patients.length}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Feedback Alert */}
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

      {/* Summary Stat Ribbon (Strictly single row: repeat(4, minmax(0, 1fr))) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '16px' }}>
        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Total Registered Patients</span>
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
              <Users size={16} color="#DFA34F" />
            </div>
          </div>
          <div className="stat-number">
            {(summary.totalPatients || total || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            POPIA-protected patient records
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Active Patient Accounts</span>
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
              <UserCheck size={16} color="#18A875" />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#18A875' }}>
            {(summary.activePatients || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Active & verified for booking consultations
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Suspended Accounts</span>
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
              <ShieldOff size={16} color="#B45309" />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#B45309' }}>
            {(summary.suspendedPatients || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Access paused for policy review
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Total Consultations Booked</span>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: '#F8F5EF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Calendar size={16} color="#2B170F" />
            </div>
          </div>
          <div className="stat-number">
            {(summary.totalBookings || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Lifetime patient appointments
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
            placeholder="Search patient name, email, or phone…"
            className="admin-input"
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Statuses' },
            { id: 'active', label: 'Active' },
            { id: 'suspended', label: 'Suspended' },
            { id: 'banned', label: 'Banned' },
          ].map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setStatusFilter(s.id);
                setPage(1);
              }}
              style={{
                padding: '6px 16px',
                borderRadius: '999px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${statusFilter === s.id ? '#DFA34F' : '#E9E0D5'}`,
                background: statusFilter === s.id ? '#2B170F' : '#FFFFFF',
                color: statusFilter === s.id ? '#ECC27E' : '#766C64',
                transition: 'all 0.15s ease',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Patients Table Container */}
      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
            <div>Loading patient registry…</div>
          </div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <Users size={36} color="#B98232" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              No patients found matching filters
            </div>
            <p style={{ fontSize: '0.85rem', color: '#766C64', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Try adjusting your search query or status filter to see other patient accounts.
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
                  <th>Patient & Identity</th>
                  <th>Contact Information</th>
                  <th>Consultations</th>
                  <th>Account Status</th>
                  <th>Registered</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const cfg = statusConfig[p.status] || statusConfig.active;
                  const initials = getInitials(p.fullName);

                  return (
                    <tr key={p.id}>
                      {/* Patient & Identity */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div
                            style={{
                              width: '40px',
                              height: '40px',
                              borderRadius: '50%',
                              background: '#F7EFE3',
                              color: '#B98232',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              border: '1px solid #E9E0D5',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: '#201712', fontSize: '0.875rem' }}>
                              {p.fullName || 'Registered Patient'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                              <span
                                style={{
                                  fontSize: '0.7rem',
                                  color: '#0F8F72',
                                  background: '#ECF9F3',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  border: '1px solid #A7F3D0',
                                  fontWeight: 600,
                                }}
                              >
                                POPIA Protected
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ color: '#201712', fontSize: '0.825rem', fontWeight: 500 }}>
                            {p.email}
                          </span>
                          {p.isEmailVerified && (
                            <span title="Email Verified">
                              <CheckCircle2 size={12} color="#18A875" />
                            </span>
                          )}
                        </div>
                        <div style={{ color: '#766C64', fontSize: '0.75rem', marginTop: '2px' }}>
                          {p.phone || 'No phone recorded'}
                        </div>
                      </td>

                      {/* Consultations */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color: '#201712',
                            background: '#F8F5EF',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid #E9E0D5',
                            fontSize: '0.8rem',
                          }}
                        >
                          {p.totalBookings} {p.totalBookings === 1 ? 'consult' : 'consults'}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '3px 9px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: cfg.bg,
                            color: cfg.color,
                            border: `1px solid ${cfg.border}`,
                            textTransform: 'capitalize',
                          }}
                        >
                          {cfg.icon}
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Registered Date */}
                      <td style={{ verticalAlign: 'middle', color: '#766C64', fontSize: '0.8rem' }}>
                        {new Date(p.createdAt).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>

                      {/* Actions */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => openDetail(p.id)}
                          className="btn-secondary"
                          style={{
                            padding: '6px 14px',
                            fontSize: '0.78rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 20px',
              borderTop: '1px solid #E9E0D5',
              background: '#F8F5EF',
            }}
          >
            <span style={{ fontSize: '0.8rem', color: '#766C64', fontWeight: 500 }}>
              Showing {patients.length} of {total} patients (Page {page} of {totalPages})
            </span>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Comprehensive Patient Detail Drawer */}
      {(detail || detailLoading) && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setDetail(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(32, 23, 18, 0.6)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Drawer Content */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '540px',
              height: '100%',
              background: '#FFFFFF',
              borderLeft: '1px solid #E9E0D5',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 101,
              overflowY: 'auto',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.12)',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '24px 28px',
                borderBottom: '1px solid #E9E0D5',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                background: '#F8F5EF',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#F7EFE3',
                    color: '#B98232',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    border: '2px solid #DFA34F',
                    flexShrink: 0,
                  }}
                >
                  {getInitials(detail?.fullName)}
                </div>

                <div>
                  <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#201712', margin: 0 }}>
                    {detail?.fullName || 'Loading patient…'}
                  </h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {detail && (
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: statusConfig[detail.status]?.bg || '#F8F5EF',
                          color: statusConfig[detail.status]?.color || '#201712',
                          border: `1px solid ${statusConfig[detail.status]?.border || '#E9E0D5'}`,
                          textTransform: 'capitalize',
                        }}
                      >
                        {detail.status}
                      </span>
                    )}
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: '#ECF9F3',
                        color: '#0F8F72',
                        border: '1px solid #A7F3D0',
                      }}
                    >
                      POPIA Protected
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setDetail(null)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#766C64',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {detailLoading || !detail ? (
              <div style={{ padding: '60px 28px', textAlign: 'center', color: '#766C64' }}>
                <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
                <div>Loading patient details…</div>
              </div>
            ) : (
              <>
                {/* Tab Navigation */}
                <div
                  style={{
                    display: 'flex',
                    borderBottom: '1px solid #E9E0D5',
                    background: '#FFFFFF',
                    padding: '0 24px',
                  }}
                >
                  {[
                    { id: 'overview', label: 'Overview & Contact' },
                    { id: 'bookings', label: `Consultations (${detail.recentBookings?.length || 0})` },
                    { id: 'popia', label: 'POPIA & Governance' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setDrawerTab(tab.id as any)}
                      style={{
                        padding: '14px 18px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: 'transparent',
                        border: 'none',
                        borderBottom: drawerTab === tab.id ? '2px solid #DFA34F' : '2px solid transparent',
                        color: drawerTab === tab.id ? '#201712' : '#766C64',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div style={{ padding: '24px 28px', flex: 1 }}>
                  {/* TAB 1: Overview */}
                  {drawerTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                      <div className="admin-card" style={{ padding: '18px 20px' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                          Identity & Contact Information
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.85rem' }}>
                          <div>
                            <div style={{ color: '#766C64', fontSize: '0.75rem' }}>Email:</div>
                            <div style={{ fontWeight: 600, color: '#201712', marginTop: '2px', wordBreak: 'break-all' }}>
                              {detail.email}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: '#766C64', fontSize: '0.75rem' }}>Phone:</div>
                            <div style={{ fontWeight: 600, color: '#201712', marginTop: '2px' }}>
                              {detail.phone || 'Not recorded'}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: '#766C64', fontSize: '0.75rem' }}>Date of Birth:</div>
                            <div style={{ fontWeight: 600, color: '#201712', marginTop: '2px' }}>
                              {detail.dateOfBirth
                                ? new Date(detail.dateOfBirth).toLocaleDateString('en-ZA')
                                : 'Not recorded'}
                            </div>
                          </div>

                          <div>
                            <div style={{ color: '#766C64', fontSize: '0.75rem' }}>Registered Date:</div>
                            <div style={{ fontWeight: 600, color: '#201712', marginTop: '2px' }}>
                              {new Date(detail.createdAt).toLocaleDateString('en-ZA')}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Wallet Credits & Feedback */}
                      <div className="admin-card" style={{ padding: '18px 20px' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                          Wallet Balance & Reviews
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                          <div
                            style={{
                              background: '#F8F5EF',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #E9E0D5',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#766C64', fontSize: '0.75rem' }}>
                              <Wallet size={14} color="#DFA34F" /> Wallet Credits
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#201712', marginTop: '4px' }}>
                              {detail.walletCredits?.length || 0} credited
                            </div>
                          </div>

                          <div
                            style={{
                              background: '#F8F5EF',
                              padding: '12px',
                              borderRadius: '8px',
                              border: '1px solid #E9E0D5',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#766C64', fontSize: '0.75rem' }}>
                              <MessageSquare size={14} color="#18A875" /> Reviews Given
                            </div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#201712', marginTop: '4px' }}>
                              {detail.reviewsGiven || 0} reviews
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* TAB 2: Bookings */}
                  {drawerTab === 'bookings' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      <div className="admin-card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                          <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', margin: 0 }}>
                            Recent Consultations ({detail.recentBookings?.length || 0})
                          </h3>
                          <Link
                            href={`/bookings?patientId=${detail.id}&search=${encodeURIComponent(detail.fullName)}`}
                            style={{
                              fontSize: '0.78rem',
                              color: '#DFA34F',
                              fontWeight: 600,
                              textDecoration: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span>Open In Bookings</span>
                            <ExternalLink size={12} />
                          </Link>
                        </div>

                        {(!detail.recentBookings || detail.recentBookings.length === 0) ? (
                          <div style={{ color: '#766C64', fontSize: '0.85rem', fontStyle: 'italic', textAlign: 'center', padding: '24px 0' }}>
                            No consultation bookings recorded for this patient.
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {detail.recentBookings.map((b: any) => (
                              <div
                                key={b.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '10px 14px',
                                  background: '#F8F5EF',
                                  borderRadius: '6px',
                                  border: '1px solid #E9E0D5',
                                  fontSize: '0.825rem',
                                }}
                              >
                                <div>
                                  <div style={{ fontWeight: 600, color: '#201712' }}>
                                    {b.reference || `Booking #${b.id.slice(0, 8)}`}
                                  </div>
                                  <div style={{ color: '#766C64', fontSize: '0.72rem', marginTop: '2px' }}>
                                    {new Date(b.created_at || b.createdAt).toLocaleDateString('en-ZA')}
                                  </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontWeight: 700, color: '#18A875' }}>
                                    R {Number(b.price || 0).toFixed(2)}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      color: '#766C64',
                                      textTransform: 'capitalize',
                                    }}
                                  >
                                    {b.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* TAB 3: POPIA & Governance */}
                  {drawerTab === 'popia' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {/* POPIA Subject Access Export */}
                      <div className="admin-card" style={{ padding: '18px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          <ShieldCheck size={18} color="#0F8F72" />
                          <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#201712', margin: 0 }}>
                            POPIA Data Subject Access Request (DSAR)
                          </h3>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: '#766C64', lineHeight: 1.5, marginBottom: '14px' }}>
                          Under Section 23 of POPIA, data subjects have the statutory right to request a complete machine-readable copy of their personal, medical, and financial records held by ChekUp247.
                        </p>
                        <button
                          onClick={() => handlePopiaExport(detail.id, detail.fullName)}
                          disabled={actionBusy}
                          className="btn-secondary"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                          }}
                        >
                          <Download size={14} />
                          <span>Generate POPIA JSON Export</span>
                        </button>
                      </div>

                      {/* Account Access Governance */}
                      <div className="admin-card" style={{ padding: '18px 20px' }}>
                        <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                          Account Access Control
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <button
                            onClick={() => {
                              setSuspendModalFor(detail);
                              setSuspendReason('');
                            }}
                            disabled={actionBusy || detail.status === 'banned'}
                            className="btn-secondary"
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              color: detail.status === 'suspended' ? '#18A875' : '#B45309',
                              borderColor: detail.status === 'suspended' ? '#A7F3D0' : '#FDE68A',
                              background: detail.status === 'suspended' ? '#ECF9F3' : '#FFFBEB',
                            }}
                          >
                            {detail.status === 'suspended' ? (
                              <>
                                <UserCheck size={15} />
                                <span>Reactivate Patient Account</span>
                              </>
                            ) : (
                              <>
                                <ShieldOff size={15} />
                                <span>Suspend Patient Account</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setDeleteModalFor(detail);
                              setDeleteReason('');
                            }}
                            disabled={actionBusy || detail.status === 'banned'}
                            style={{
                              width: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '8px',
                              padding: '10px',
                              borderRadius: '8px',
                              background: '#FEF2F2',
                              border: '1px solid #FECACA',
                              color: '#991B1B',
                              fontWeight: 600,
                              fontSize: '0.85rem',
                              cursor: 'pointer',
                            }}
                          >
                            <Trash2 size={15} />
                            <span>Delete Account (Right to be Forgotten)</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Modal */}
      {suspendModalFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 23, 18, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            className="admin-card"
            style={{
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              background: '#FFFFFF',
              border: '1px solid #E9E0D5',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: suspendModalFor.status === 'suspended' ? '#ECF9F3' : '#FFFBEB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {suspendModalFor.status === 'suspended' ? (
                    <UserCheck size={18} color="#18A875" />
                  ) : (
                    <ShieldOff size={18} color="#B45309" />
                  )}
                </div>
                <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  {suspendModalFor.status === 'suspended'
                    ? 'Reactivate Patient Account'
                    : 'Suspend Patient Account'}
                </h2>
              </div>
              <button
                onClick={() => setSuspendModalFor(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#766C64', marginBottom: '14px', lineHeight: 1.4 }}>
              {suspendModalFor.status === 'suspended'
                ? `Reactivating ${suspendModalFor.fullName} will restore their login access and ability to book consultations.`
                : `Suspending ${suspendModalFor.fullName} will immediately revoke their ability to log in or book new appointments.`}
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Audit Reason (Optional)
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={2}
              placeholder="e.g. Chargeback investigation, suspicious activity report..."
              className="admin-input"
              style={{ width: '100%', marginBottom: '20px', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setSuspendModalFor(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleToggleSuspend}
                disabled={actionBusy}
                className="btn-primary"
                style={{
                  background: suspendModalFor.status === 'suspended' ? '#18A875' : '#B45309',
                  borderColor: suspendModalFor.status === 'suspended' ? '#18A875' : '#B45309',
                  color: '#FFFFFF',
                }}
              >
                {actionBusy
                  ? 'Processing…'
                  : suspendModalFor.status === 'suspended'
                  ? 'Confirm Reactivate'
                  : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteModalFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 23, 18, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '20px',
          }}
        >
          <div
            className="admin-card"
            style={{
              padding: '28px',
              width: '100%',
              maxWidth: '460px',
              background: '#FFFFFF',
              border: '1px solid #E9E0D5',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
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
                  <Trash2 size={18} color="#991B1B" />
                </div>
                <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Delete Patient Account
                </h2>
              </div>
              <button
                onClick={() => setDeleteModalFor(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#766C64', marginBottom: '14px', lineHeight: 1.4 }}>
              Are you sure you want to delete <strong>{deleteModalFor.fullName}</strong>? In compliance with POPIA, personally identifiable information will be permanently scrubbed while preserving anonymized financial and consultation records for statutory tax/medical compliance.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Reason for Deletion (Required)
            </label>
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              rows={2}
              placeholder="e.g. Written request from data subject under POPIA Section 24..."
              className="admin-input"
              style={{ width: '100%', marginBottom: '20px', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteModalFor(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!deleteReason.trim() || actionBusy}
                className="btn-primary"
                style={{ background: '#991B1B', borderColor: '#991B1B', color: '#FFFFFF' }}
              >
                {actionBusy ? 'Deleting…' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
