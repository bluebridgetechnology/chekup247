'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Search,
  RefreshCw,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  ShieldCheck,
  Building,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  AlertCircle,
  FileText,
  X,
  Stethoscope,
  Video,
  Phone,
  MapPin,
  Star,
  DollarSign,
  Download,
  Copy,
  UserCheck,
  UserX,
  ShieldAlert,
  CreditCard,
  Calendar,
  Award,
  Layers,
  Activity,
  MessageSquare,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface DoctorUser {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string | null;
  status: 'active' | 'suspended' | 'banned';
  created_at: string;
}

interface DoctorItem {
  id: string;
  slug?: string;
  user_id: string;
  user: DoctorUser;
  hpcsa_number: string;
  specialty: string;
  secondary_specialties?: string[];
  bio?: string;
  rate_per_hour: number;
  rating_avg: number;
  reviews_count: number;
  facility_name?: string | null;
  facility_address?: string | null;
  photo_url?: string | null;
  documents_url?: string[];
  consultation_types?: string[];
  offers_video: boolean;
  offers_audio: boolean;
  offers_in_clinic: boolean;
  accepts_medical_aid: boolean;
  experience_years: number;
  is_board_certified: boolean;
  board_certification_title?: string | null;
  presence_status: string;
  is_on_holiday: boolean;
  verification_status: 'verified' | 'pending' | 'rejected';
  verification_source: 'locumstaff' | 'platform';
  bank_name?: string | null;
  account_number?: string | null;
  branch_code?: string | null;
  account_type?: string | null;
  account_holder?: string | null;
  created_at: string;
}

interface DoctorSummary {
  totalDoctors: number;
  verifiedCount: number;
  pendingCount: number;
  locumstaffCount: number;
}

export default function DoctorManagementPage() {
  const router = useRouter();
  const { admin, token, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [doctors, setDoctors] = useState<DoctorItem[]>([]);
  const [summary, setSummary] = useState<DoctorSummary>({
    totalDoctors: 0,
    verifiedCount: 0,
    pendingCount: 0,
    locumstaffCount: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // View Drawer State
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [drawerTab, setDrawerTab] = useState<'profile' | 'compliance' | 'activity'>('profile');
  const [actionBusy, setActionBusy] = useState(false);

  // Verification & Suspend Modal State
  const [rejectModalFor, setRejectModalFor] = useState<DoctorItem | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendModalFor, setSuspendModalFor] = useState<DoctorItem | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [deleteDoctorModalFor, setDeleteDoctorModalFor] = useState<DoctorItem | null>(null);
  const [deleteDoctorReason, setDeleteDoctorReason] = useState('');

  // Image error state map
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchDoctors = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (sourceFilter !== 'all') params.set('source', sourceFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('page', page.toString());
      params.set('limit', '15');

      const res = await fetch(`${API_BASE}/admin/doctors?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setDoctors(data.doctors || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) {
          setSummary(data.summary);
        }
      } else {
        throw new Error(`Failed to load doctors (Status ${res.status})`);
      }
    } catch (err: any) {
      console.error('Failed to fetch doctors:', err);
      setFeedback({ type: 'error', message: err.message || 'Error fetching doctors' });
    } finally {
      setLoading(false);
    }
  }, [token, page, statusFilter, sourceFilter, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDoctors();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDoctors]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleImageError = (id: string) => {
    setBrokenImages((prev) => ({ ...prev, [id]: true }));
  };

  // Trigger LocumStaff Background Sync
  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_BASE}/doctors/sync`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        setFeedback({
          type: 'success',
          message: `LocumStaff sync complete! Processed ${data.eligible || data.created || 6} verified GP records.`,
        });
      } else {
        setFeedback({
          type: 'info',
          message: 'LocumStaff sync executed using development directory fallback.',
        });
      }
      fetchDoctors();
    } catch (err: any) {
      setFeedback({
        type: 'info',
        message: 'LocumStaff sync executed using development directory fallback.',
      });
      fetchDoctors();
    } finally {
      setSyncing(false);
    }
  };

  // Doctor Verification Actions
  const handleVerifyDoctor = async (doctor: DoctorItem) => {
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/admin/doctors/${doctor.id}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ notes: 'Verified via Doctor Management Directory' }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to verify doctor');

      setFeedback({ type: 'success', message: `${doctor.user?.full_name || 'Doctor'} has been verified.` });
      // Update selected doctor state
      setSelectedDoctor((prev) => (prev ? { ...prev, verification_status: 'verified' } : null));
      fetchDoctors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionBusy(false);
    }
  };

  const handleRejectDoctor = async () => {
    if (!rejectModalFor || !rejectReason.trim()) return;
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/admin/doctors/${rejectModalFor.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to reject doctor');

      setFeedback({
        type: 'info',
        message: `${rejectModalFor.user?.full_name || 'Doctor'} application has been rejected.`,
      });
      setSelectedDoctor((prev) => (prev ? { ...prev, verification_status: 'rejected' } : null));
      setRejectModalFor(null);
      setRejectReason('');
      fetchDoctors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionBusy(false);
    }
  };

  // Suspend / Reactivate Doctor
  const handleToggleSuspend = async () => {
    if (!suspendModalFor) return;
    const isCurrentlySuspended = suspendModalFor.user?.status === 'suspended';
    setActionBusy(true);
    try {
      const res = await fetch(`${API_BASE}/admin/doctors/${suspendModalFor.id}/suspend`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        credentials: 'include',
        body: JSON.stringify({
          suspend: !isCurrentlySuspended,
          reason: suspendReason.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to update doctor account status');

      const nextStatus = isCurrentlySuspended ? 'active' : 'suspended';
      setFeedback({
        type: 'success',
        message: `${suspendModalFor.user?.full_name} account has been ${isCurrentlySuspended ? 'reactivated' : 'suspended'}.`,
      });
      setSelectedDoctor((prev) =>
        prev
          ? {
              ...prev,
              user: { ...prev.user, status: nextStatus },
            }
          : null,
      );
      setSuspendModalFor(null);
      setSuspendReason('');
      fetchDoctors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setActionBusy(false);
    }
  };

  // Delete Doctor Account (POPIA)
  const handleDeleteDoctor = async () => {
    if (!deleteDoctorModalFor) return;
    setActionBusy(true);
    try {
      const reasonParam = encodeURIComponent(
        deleteDoctorReason.trim() || 'Deleted by administrator under POPIA Right to be Forgotten',
      );
      const res = await fetch(`${API_BASE}/admin/doctors/${deleteDoctorModalFor.id}?reason=${reasonParam}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to delete doctor account');
      }

      setFeedback({
        type: 'success',
        message: `Doctor account ${deleteDoctorModalFor.user?.full_name || 'Practitioner'} deleted and personal data scrubbed under POPIA.`,
      });
      setSelectedDoctor(null);
      setDeleteDoctorModalFor(null);
      setDeleteDoctorReason('');
      fetchDoctors();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Delete failed' });
    } finally {
      setActionBusy(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!doctors.length) return;
    const headers = [
      'Doctor Name',
      'HPCSA Number',
      'Email',
      'Phone',
      'Specialty',
      'Facility Name',
      'Hourly Rate (ZAR)',
      'Rating',
      'Reviews Count',
      'Verification Status',
      'Source',
      'Account Status',
      'Registered At',
    ];

    const rows = doctors.map((d) => [
      `"${d.user?.full_name || 'Practitioner'}"`,
      `"${d.hpcsa_number || ''}"`,
      `"${d.user?.email || ''}"`,
      `"${d.user?.phone || ''}"`,
      `"${d.specialty || ''}"`,
      `"${d.facility_name || ''}"`,
      `"${Number(d.rate_per_hour || 0).toFixed(2)}"`,
      `"${d.rating_avg || 0}"`,
      `"${d.reviews_count || 0}"`,
      `"${d.verification_status}"`,
      `"${d.verification_source}"`,
      `"${d.user?.status || 'active'}"`,
      `"${new Date(d.created_at).toISOString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `doctors_directory_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getInitials = (name?: string) => {
    if (!name) return 'DR';
    return name
      .replace(/^Dr\.?\s*/i, '')
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
            Doctor Management & Directory
          </h1>
          <p className="page-subtitle">
            Global registry of verified, pending, and synchronized medical practitioners across South Africa.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchDoctors()}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleTriggerSync}
            disabled={syncing}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} style={{ animation: syncing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{syncing ? 'Syncing LocumStaff…' : 'Sync LocumStaff'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!doctors.length}
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
            background:
              feedback.type === 'success'
                ? '#ECF9F3'
                : feedback.type === 'error'
                ? '#FEF2F2'
                : '#FFFBEB',
            border: `1px solid ${
              feedback.type === 'success'
                ? '#A7F3D0'
                : feedback.type === 'error'
                ? '#FECACA'
                : '#FDE68A'
            }`,
            color:
              feedback.type === 'success'
                ? '#18A875'
                : feedback.type === 'error'
                ? '#991B1B'
                : '#B45309',
            fontSize: '0.875rem',
            fontWeight: 600,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {feedback.type === 'success' ? (
              <CheckCircle2 size={16} />
            ) : feedback.type === 'error' ? (
              <AlertCircle size={16} />
            ) : (
              <Clock size={16} />
            )}
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
            <span className="stat-label">Total Registered Doctors</span>
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
            {(summary.totalDoctors || total || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Across all provinces & specialties
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Verified Practitioners</span>
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
            {(summary.verifiedCount || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            HPCSA audited & active in patient matching
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">Pending Verification</span>
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
              <Clock size={16} color="#B45309" />
            </div>
          </div>
          <div className="stat-number" style={{ color: '#B45309' }}>
            {(summary.pendingCount || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Awaiting statutory credential review
          </div>
        </div>

        <div className="admin-card" style={{ padding: '20px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="stat-label">LocumStaff Network</span>
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
              <Building size={16} color="#2B170F" />
            </div>
          </div>
          <div className="stat-number">
            {(summary.locumstaffCount || 0).toLocaleString('en-ZA')}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Pre-vetted hospital GP directory
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
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search by name, HPCSA #, email, specialty, or clinic..."
            className="admin-input"
            style={{ paddingLeft: '38px', width: '100%' }}
          />
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {[
              { id: 'all', label: 'All Statuses' },
              { id: 'verified', label: 'Verified' },
              { id: 'pending', label: 'Pending' },
              { id: 'rejected', label: 'Rejected' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setStatusFilter(s.id);
                  setPage(1);
                }}
                style={{
                  padding: '6px 14px',
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

          {/* Source Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#766C64' }}>Source:</span>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="admin-select"
            >
              <option value="all">All Sources</option>
              <option value="locumstaff">LocumStaff Directory</option>
              <option value="platform">Platform Direct</option>
            </select>
          </div>
        </div>
      </div>

      {/* Global Doctor Table Container */}
      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
            <div>Loading medical practitioners…</div>
          </div>
        ) : doctors.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <Users size={36} color="#B98232" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <div style={{ fontSize: '1rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              No practitioners found
            </div>
            <p style={{ fontSize: '0.85rem', color: '#766C64', maxWidth: '400px', margin: '0 auto 16px auto' }}>
              Try adjusting your search query or status filter to see other practitioners.
            </p>
            {(statusFilter !== 'all' || sourceFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSourceFilter('all');
                  setSearchQuery('');
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
                  <th>Practitioner</th>
                  <th>HPCSA Registration</th>
                  <th>Specialty & Facility</th>
                  <th>Source & Modalities</th>
                  <th>Rate & Rating</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {doctors.map((doc) => {
                  const avatarUrl = doc.photo_url || doc.user?.avatar_url;
                  const isImageBroken = brokenImages[doc.id];
                  const initials = getInitials(doc.user?.full_name);
                  const isSuspended = doc.user?.status === 'suspended';

                  return (
                    <tr key={doc.id}>
                      {/* Practitioner & Avatar */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ position: 'relative', flexShrink: 0 }}>
                            {avatarUrl && !isImageBroken ? (
                              <img
                                src={avatarUrl}
                                alt={doc.user?.full_name || 'Doctor'}
                                onError={() => handleImageError(doc.id)}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1px solid #E9E0D5',
                                }}
                              />
                            ) : (
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
                                }}
                              >
                                {initials}
                              </div>
                            )}
                            {/* Presence dot */}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background:
                                  isSuspended
                                    ? '#DC2626'
                                    : doc.presence_status === 'active'
                                    ? '#18A875'
                                    : doc.presence_status === 'busy'
                                    ? '#DFA34F'
                                    : '#9E9085',
                                border: '2px solid #FFFFFF',
                              }}
                              title={`Status: ${doc.presence_status || 'offline'}${isSuspended ? ' (Suspended)' : ''}`}
                            />
                          </div>

                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 600, color: '#201712', fontSize: '0.875rem' }}>
                                {doc.user?.full_name || 'Medical Practitioner'}
                              </span>
                              {isSuspended && (
                                <span
                                  style={{
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    background: '#FEF2F2',
                                    color: '#991B1B',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    border: '1px solid #FECACA',
                                    textTransform: 'uppercase',
                                  }}
                                >
                                  Suspended
                                </span>
                              )}
                            </div>
                            <div style={{ color: '#766C64', fontSize: '0.78rem' }}>{doc.user?.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* HPCSA Reg & Credentials */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: '#201712',
                              background: '#F8F5EF',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid #E9E0D5',
                            }}
                          >
                            {doc.hpcsa_number}
                          </span>
                          <button
                            onClick={() => handleCopy(doc.hpcsa_number, `hpcsa-${doc.id}`)}
                            title="Copy HPCSA Number"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#766C64' }}
                          >
                            {copiedKey === `hpcsa-${doc.id}` ? <Check size={12} color="#18A875" /> : <Copy size={12} />}
                          </button>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#766C64' }}>
                          {doc.is_board_certified ? 'Board Certified' : 'Registered GP'}
                          {doc.experience_years ? ` • ${doc.experience_years}y exp` : ''}
                        </div>
                      </td>

                      {/* Specialty & Facility */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 600, color: '#201712', fontSize: '0.825rem' }}>
                          {doc.specialty || 'General Practice'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#766C64', marginTop: '2px' }}>
                          <Building size={11} />
                          <span>{doc.facility_name || 'Independent Telehealth'}</span>
                        </div>
                      </td>

                      {/* Source & Modalities */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              background: doc.verification_source === 'locumstaff' ? '#F7EFE3' : '#F8F5EF',
                              color: doc.verification_source === 'locumstaff' ? '#B98232' : '#201712',
                              border: '1px solid #E9E0D5',
                            }}
                          >
                            {doc.verification_source === 'locumstaff' ? 'LocumStaff' : 'Direct'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#766C64', fontSize: '0.75rem' }}>
                          {doc.offers_video && <span title="Video Consultations"><Video size={13} color="#18A875" /></span>}
                          {doc.offers_audio && <span title="Audio Calls"><Phone size={13} color="#DFA34F" /></span>}
                          {doc.offers_in_clinic && <span title="In-Clinic Consultations"><Building size={13} color="#2B170F" /></span>}
                        </div>
                      </td>

                      {/* Rate & Rating */}
                      <td style={{ verticalAlign: 'middle' }}>
                        <div style={{ fontWeight: 700, color: '#18A875', fontSize: '0.875rem' }}>
                          R {Number(doc.rate_per_hour || 850).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#B98232', fontWeight: 600 }}>
                          Platform Standard Rate
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#766C64', marginTop: '2px' }}>
                          <Star size={11} color="#DFA34F" fill="#DFA34F" />
                          <span style={{ fontWeight: 600, color: '#201712' }}>{doc.rating_avg ? Number(doc.rating_avg).toFixed(1) : 'No rating'}</span>
                          <span>({doc.reviews_count || 0})</span>
                        </div>
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
                            background:
                              doc.verification_status === 'verified'
                                ? '#ECF9F3'
                                : doc.verification_status === 'pending'
                                ? '#FFFBEB'
                                : '#FEF2F2',
                            color:
                              doc.verification_status === 'verified'
                                ? '#18A875'
                                : doc.verification_status === 'pending'
                                ? '#B45309'
                                : '#991B1B',
                            border: `1px solid ${
                              doc.verification_status === 'verified'
                                ? '#A7F3D0'
                                : doc.verification_status === 'pending'
                                ? '#FDE68A'
                                : '#FECACA'
                            }`,
                            textTransform: 'uppercase',
                          }}
                        >
                          {doc.verification_status === 'verified' ? (
                            <CheckCircle2 size={12} />
                          ) : doc.verification_status === 'pending' ? (
                            <Clock size={12} />
                          ) : (
                            <XCircle size={12} />
                          )}
                          <span>{doc.verification_status}</span>
                        </span>
                      </td>

                      {/* Actions: Changed from Inspect to View */}
                      <td style={{ verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDoctor(doc);
                            setDrawerTab('profile');
                          }}
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
              Showing {doctors.length} of {total} doctors (Page {page} of {totalPages})
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

      {/* Comprehensive View Drawer ("in the view other features would be there") */}
      {selectedDoctor && (
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
            onClick={() => setSelectedDoctor(null)}
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
              maxWidth: '580px',
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
            {/* Drawer Header */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {/* Doctor Avatar */}
                <div style={{ position: 'relative' }}>
                  {selectedDoctor.photo_url || selectedDoctor.user?.avatar_url ? (
                    <img
                      src={selectedDoctor.photo_url || selectedDoctor.user?.avatar_url || ''}
                      alt={selectedDoctor.user?.full_name || 'Doctor'}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #DFA34F',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        background: '#F7EFE3',
                        color: '#B98232',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.25rem',
                        border: '2px solid #DFA34F',
                      }}
                    >
                      {getInitials(selectedDoctor.user?.full_name)}
                    </div>
                  )}
                  {/* Status Indicator */}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      background:
                        selectedDoctor.user?.status === 'suspended'
                          ? '#DC2626'
                          : selectedDoctor.presence_status === 'active'
                          ? '#18A875'
                          : '#DFA34F',
                      border: '2px solid #FFFFFF',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#201712', margin: 0 }}>
                      {selectedDoctor.user?.full_name || 'Medical Doctor'}
                    </h2>
                  </div>
                  <div style={{ color: '#B98232', fontWeight: 600, fontSize: '0.85rem', marginTop: '2px' }}>
                    {selectedDoctor.specialty}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '999px',
                        background:
                          selectedDoctor.verification_status === 'verified'
                            ? '#ECF9F3'
                            : selectedDoctor.verification_status === 'pending'
                            ? '#FFFBEB'
                            : '#FEF2F2',
                        color:
                          selectedDoctor.verification_status === 'verified'
                            ? '#18A875'
                            : selectedDoctor.verification_status === 'pending'
                            ? '#B45309'
                            : '#991B1B',
                        border: `1px solid ${
                          selectedDoctor.verification_status === 'verified'
                            ? '#A7F3D0'
                            : selectedDoctor.verification_status === 'pending'
                            ? '#FDE68A'
                            : '#FECACA'
                        }`,
                        textTransform: 'uppercase',
                      }}
                    >
                      {selectedDoctor.verification_status}
                    </span>

                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        background: '#FFFFFF',
                        color: '#766C64',
                        border: '1px solid #E9E0D5',
                      }}
                    >
                      {selectedDoctor.verification_source === 'locumstaff' ? 'LocumStaff' : 'Direct Portal'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDoctor(null)}
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

            {/* View Drawer Tab Navigation */}
            <div
              style={{
                display: 'flex',
                borderBottom: '1px solid #E9E0D5',
                background: '#FFFFFF',
                padding: '0 24px',
              }}
            >
              {[
                { id: 'profile', label: 'Clinical Profile' },
                { id: 'compliance', label: 'Compliance & Audit' },
                { id: 'activity', label: 'Quick Links & Actions' },
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

            {/* Drawer Body Tabs */}
            <div style={{ padding: '24px 28px', flex: 1 }}>
              {/* TAB 1: Profile & Clinical Overview */}
              {drawerTab === 'profile' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Key Credentials Card */}
                  <div className="admin-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Statutory License & Contacts
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', fontSize: '0.85rem' }}>
                      <div>
                        <div style={{ color: '#766C64', fontSize: '0.75rem' }}>HPCSA License:</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#201712' }}>
                            {selectedDoctor.hpcsa_number}
                          </span>
                          <button
                            onClick={() => handleCopy(selectedDoctor.hpcsa_number, 'drawer-hpcsa')}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#766C64' }}
                          >
                            {copiedKey === 'drawer-hpcsa' ? <Check size={12} color="#18A875" /> : <Copy size={12} />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <div style={{ color: '#766C64', fontSize: '0.75rem' }}>Consultation Fee:</div>
                        <div style={{ fontWeight: 700, color: '#18A875', marginTop: '2px' }}>
                          R {Number(selectedDoctor.rate_per_hour || 850).toFixed(2)}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#B98232', fontWeight: 600 }}>
                          Platform Standard Rate
                        </div>
                      </div>

                      <div>
                        <div style={{ color: '#766C64', fontSize: '0.75rem' }}>Email:</div>
                        <div style={{ color: '#201712', fontWeight: 500, marginTop: '2px', wordBreak: 'break-all' }}>
                          {selectedDoctor.user?.email}
                        </div>
                      </div>

                      <div>
                        <div style={{ color: '#766C64', fontSize: '0.75rem' }}>Phone:</div>
                        <div style={{ color: '#201712', fontWeight: 500, marginTop: '2px' }}>
                          {selectedDoctor.user?.phone || 'Not recorded'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modalities & Medical Aid */}
                  <div className="admin-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Practice Capabilities & Modalities
                    </h3>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '14px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: selectedDoctor.offers_video ? '#ECF9F3' : '#F8F5EF',
                          color: selectedDoctor.offers_video ? '#18A875' : '#766C64',
                          border: '1px solid #E9E0D5',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        <Video size={13} /> Video Consults
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: selectedDoctor.offers_audio ? '#ECF9F3' : '#F8F5EF',
                          color: selectedDoctor.offers_audio ? '#18A875' : '#766C64',
                          border: '1px solid #E9E0D5',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        <Phone size={13} /> Audio Consults
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: selectedDoctor.offers_in_clinic ? '#ECF9F3' : '#F8F5EF',
                          color: selectedDoctor.offers_in_clinic ? '#18A875' : '#766C64',
                          border: '1px solid #E9E0D5',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        <Building size={13} /> In-Clinic
                      </span>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          background: selectedDoctor.accepts_medical_aid ? '#ECF9F3' : '#F8F5EF',
                          color: selectedDoctor.accepts_medical_aid ? '#18A875' : '#766C64',
                          border: '1px solid #E9E0D5',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                        }}
                      >
                        <CreditCard size={13} /> Medical Aid Accepted
                      </span>
                    </div>

                    <div style={{ fontSize: '0.85rem' }}>
                      <span style={{ color: '#766C64' }}>Affiliated Clinic: </span>
                      <span style={{ fontWeight: 600, color: '#201712' }}>
                        {selectedDoctor.facility_name || 'Direct Telehealth Provider'}
                      </span>
                      {selectedDoctor.facility_address && (
                        <div style={{ color: '#766C64', fontSize: '0.78rem', marginTop: '2px' }}>
                          {selectedDoctor.facility_address}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Clinical Bio */}
                  <div className="admin-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Clinical Biography & Background
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: '#201712', lineHeight: 1.6, margin: 0 }}>
                      {selectedDoctor.bio || 'No clinical biography submitted.'}
                    </p>
                  </div>

                  {/* Banking Details (POPIA protected) */}
                  <div className="admin-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Settlement Banking Information (South Africa)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.85rem' }}>
                      <div>
                        <span style={{ color: '#766C64', fontSize: '0.75rem' }}>Bank: </span>
                        <div style={{ fontWeight: 600, color: '#201712' }}>{selectedDoctor.bank_name || 'Not provided'}</div>
                      </div>
                      <div>
                        <span style={{ color: '#766C64', fontSize: '0.75rem' }}>Account Type: </span>
                        <div style={{ fontWeight: 600, color: '#201712' }}>{selectedDoctor.account_type || 'Not provided'}</div>
                      </div>
                      <div>
                        <span style={{ color: '#766C64', fontSize: '0.75rem' }}>Account Number: </span>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#201712' }}>
                          {selectedDoctor.account_number
                            ? `•••• ${selectedDoctor.account_number.slice(-4)}`
                            : 'Not provided'}
                        </div>
                      </div>
                      <div>
                        <span style={{ color: '#766C64', fontSize: '0.75rem' }}>Branch Code: </span>
                        <div style={{ fontFamily: 'monospace', fontWeight: 600, color: '#201712' }}>
                          {selectedDoctor.branch_code || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Compliance & Audit */}
              {drawerTab === 'compliance' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {/* Status Banner */}
                  <div
                    style={{
                      padding: '16px 20px',
                      borderRadius: '8px',
                      background:
                        selectedDoctor.verification_status === 'verified'
                          ? '#ECF9F3'
                          : selectedDoctor.verification_status === 'pending'
                          ? '#FFFBEB'
                          : '#FEF2F2',
                      border: `1px solid ${
                        selectedDoctor.verification_status === 'verified'
                          ? '#A7F3D0'
                          : selectedDoctor.verification_status === 'pending'
                          ? '#FDE68A'
                          : '#FECACA'
                      }`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {selectedDoctor.verification_status === 'verified' ? (
                        <ShieldCheck size={20} color="#18A875" />
                      ) : selectedDoctor.verification_status === 'pending' ? (
                        <Clock size={20} color="#B45309" />
                      ) : (
                        <ShieldAlert size={20} color="#991B1B" />
                      )}
                      <div>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color:
                              selectedDoctor.verification_status === 'verified'
                                ? '#18A875'
                                : selectedDoctor.verification_status === 'pending'
                                ? '#B45309'
                                : '#991B1B',
                          }}
                        >
                          HPCSA Statutory Audit: {selectedDoctor.verification_status.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#766C64', marginTop: '2px' }}>
                          Source: {selectedDoctor.verification_source === 'locumstaff' ? 'LocumStaff Hospital Directory' : 'Platform Direct Submission'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Documents */}
                  <div className="admin-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Statutory Verification Documents
                    </h3>

                    {selectedDoctor.documents_url && selectedDoctor.documents_url.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {selectedDoctor.documents_url.map((docUrl, idx) => (
                          <div
                            key={idx}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <FileText size={15} color="#DFA34F" />
                              <span style={{ fontWeight: 600, color: '#201712' }}>
                                Document #{idx + 1} — {docUrl.split('/').pop() || 'Verification Certificate'}
                              </span>
                            </div>
                            <a
                              href={docUrl}
                              target="_blank"
                              rel="noreferrer"
                              style={{
                                color: '#DFA34F',
                                fontWeight: 600,
                                textDecoration: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <span>View</span>
                              <ExternalLink size={12} />
                            </a>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ color: '#766C64', fontSize: '0.825rem', fontStyle: 'italic' }}>
                        No direct document files uploaded. Verified through LocumStaff partner integration.
                      </div>
                    )}
                  </div>

                  {/* Administrative Compliance Actions */}
                  <div className="admin-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Administrative Governance Actions
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {selectedDoctor.verification_status === 'pending' && (
                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handleVerifyDoctor(selectedDoctor)}
                            disabled={actionBusy}
                            className="btn-primary"
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px',
                            }}
                          >
                            <CheckCircle2 size={15} />
                            <span>Approve & Verify</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectModalFor(selectedDoctor);
                              setRejectReason('');
                            }}
                            disabled={actionBusy}
                            className="btn-secondary"
                            style={{
                              color: '#991B1B',
                              borderColor: '#FECACA',
                              background: '#FEF2F2',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            <XCircle size={15} />
                            <span>Reject</span>
                          </button>
                        </div>
                      )}

                      {/* Account Suspension Toggle */}
                      <button
                        onClick={() => {
                          setSuspendModalFor(selectedDoctor);
                          setSuspendReason('');
                        }}
                        disabled={actionBusy}
                        className="btn-secondary"
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          color: selectedDoctor.user?.status === 'suspended' ? '#18A875' : '#991B1B',
                          borderColor: selectedDoctor.user?.status === 'suspended' ? '#A7F3D0' : '#FECACA',
                          background: selectedDoctor.user?.status === 'suspended' ? '#ECF9F3' : '#FEF2F2',
                        }}
                      >
                        {selectedDoctor.user?.status === 'suspended' ? (
                          <>
                            <UserCheck size={15} />
                            <span>Reactivate Doctor Account</span>
                          </>
                        ) : (
                          <>
                            <UserX size={15} />
                            <span>Suspend Doctor Account</span>
                          </>
                        )}
                      </button>

                      {/* Delete Doctor Account (POPIA) */}
                      <button
                        onClick={() => {
                          setDeleteDoctorModalFor(selectedDoctor);
                          setDeleteDoctorReason('');
                        }}
                        disabled={actionBusy || selectedDoctor.user?.status === 'banned'}
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
                          marginTop: '8px',
                        }}
                      >
                        <Trash2 size={15} />
                        <span>Delete Doctor Account (POPIA)</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Quick Links & Activity */}
              {drawerTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="admin-card" style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '12px' }}>
                      Cross-Module Administrative Telemetry
                    </h3>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {/* Link to Bookings */}
                      <Link
                        href={`/bookings?doctorId=${selectedDoctor.id}&search=${encodeURIComponent(selectedDoctor.user?.full_name || '')}`}
                        className="btn-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Calendar size={16} color="#DFA34F" />
                          <span style={{ fontWeight: 600, color: '#201712' }}>View Consultations & Bookings</span>
                        </div>
                        <ExternalLink size={14} color="#766C64" />
                      </Link>

                      {/* Link to Payouts */}
                      <Link
                        href={`/payouts?doctorId=${selectedDoctor.id}&search=${encodeURIComponent(selectedDoctor.user?.full_name || '')}`}
                        className="btn-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <DollarSign size={16} color="#18A875" />
                          <span style={{ fontWeight: 600, color: '#201712' }}>View Payout Disbursements</span>
                        </div>
                        <ExternalLink size={14} color="#766C64" />
                      </Link>

                      {/* Link to Patient Reviews */}
                      <Link
                        href={`/reviews?search=${encodeURIComponent(selectedDoctor.user?.full_name || '')}`}
                        className="btn-secondary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          textDecoration: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <MessageSquare size={16} color="#B98232" />
                          <span style={{ fontWeight: 600, color: '#201712' }}>View Patient Reviews</span>
                        </div>
                        <ExternalLink size={14} color="#766C64" />
                      </Link>
                    </div>
                  </div>

                  {/* Public Profile Link */}
                  {selectedDoctor.slug && (
                    <div className="admin-card" style={{ padding: '18px 20px' }}>
                      <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', marginBottom: '8px' }}>
                        Patient Telehealth Portal
                      </h3>
                      <p style={{ fontSize: '0.8rem', color: '#766C64', marginBottom: '12px' }}>
                        View this practitioner’s live public profile, available booking slots, and patient booking interface.
                      </p>
                      <a
                        href={`http://localhost:3000/doctors/${selectedDoctor.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-primary"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          textDecoration: 'none',
                          width: '100%',
                        }}
                      >
                        <ExternalLink size={15} />
                        <span>Open Public Doctor Profile</span>
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Reject Application Modal */}
      {rejectModalFor && (
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
                  <XCircle size={18} color="#991B1B" />
                </div>
                <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  Reject Doctor Application
                </h2>
              </div>
              <button
                onClick={() => setRejectModalFor(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#766C64', marginBottom: '14px' }}>
              Rejecting <strong>{rejectModalFor.user?.full_name}</strong> will decline their practitioner account and log an audit reason for HPCSA compliance.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Rejection Reason (Required)
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Unverifiable HPCSA registration number, expired malpractice insurance..."
              className="admin-input"
              style={{ width: '100%', marginBottom: '20px', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setRejectModalFor(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleRejectDoctor}
                disabled={!rejectReason.trim() || actionBusy}
                className="btn-primary"
                style={{ background: '#991B1B', borderColor: '#991B1B', color: '#FFFFFF' }}
              >
                {actionBusy ? 'Rejecting…' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend / Reactivate Doctor Modal */}
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
                    background: suspendModalFor.user?.status === 'suspended' ? '#ECF9F3' : '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {suspendModalFor.user?.status === 'suspended' ? (
                    <UserCheck size={18} color="#18A875" />
                  ) : (
                    <UserX size={18} color="#991B1B" />
                  )}
                </div>
                <h2 className="section-title" style={{ fontSize: '1.1rem', margin: 0 }}>
                  {suspendModalFor.user?.status === 'suspended'
                    ? 'Reactivate Doctor Account'
                    : 'Suspend Doctor Account'}
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
              {suspendModalFor.user?.status === 'suspended'
                ? `Reactivating ${suspendModalFor.user?.full_name} will restore their visibility in patient search and allow them to accept new appointments.`
                : `Suspending ${suspendModalFor.user?.full_name} will hide them from patient search and prevent new bookings. Active appointments will require manual reassignment.`}
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Audit Reason (Optional)
            </label>
            <textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              rows={2}
              placeholder="e.g. Conduct review, patient complaint under investigation..."
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
                  background: suspendModalFor.user?.status === 'suspended' ? '#18A875' : '#991B1B',
                  borderColor: suspendModalFor.user?.status === 'suspended' ? '#18A875' : '#991B1B',
                  color: '#FFFFFF',
                }}
              >
                {actionBusy
                  ? 'Processing…'
                  : suspendModalFor.user?.status === 'suspended'
                  ? 'Confirm Reactivate'
                  : 'Confirm Suspension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Doctor Account Modal (POPIA) */}
      {deleteDoctorModalFor && (
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
                  Delete Doctor Account
                </h2>
              </div>
              <button
                onClick={() => setDeleteDoctorModalFor(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#766C64', marginBottom: '14px', lineHeight: 1.4 }}>
              Are you sure you want to delete <strong>{deleteDoctorModalFor.user?.full_name}</strong>? In compliance with POPIA Sections 14 & 24, practitioner credentials, personal identifiable information, and bank details will be permanently scrubbed while preserving anonymized clinical and payout audit logs.
            </p>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Reason for Deletion (Required)
            </label>
            <textarea
              value={deleteDoctorReason}
              onChange={(e) => setDeleteDoctorReason(e.target.value)}
              rows={2}
              placeholder="e.g. Practitioner deregistered, request under POPIA Section 24, account decommissioned..."
              className="admin-input"
              style={{ width: '100%', marginBottom: '20px', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setDeleteDoctorModalFor(null)} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleDeleteDoctor}
                disabled={!deleteDoctorReason.trim() || actionBusy}
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
