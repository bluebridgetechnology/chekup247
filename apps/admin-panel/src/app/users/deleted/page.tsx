'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Archive,
  Search,
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Users,
  Stethoscope,
  Eye,
  Copy,
  Check,
  X,
  FileText,
  Calendar,
  Clock,
  UserX,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface DeletedUserRecord {
  id: string;
  role: 'patient' | 'doctor';
  anonymizedName: string;
  anonymizedEmail: string;
  deletedAt: string;
  deletedBy: string;
  reason: string;
  popiaCompliant: boolean;
  retentionPolicy: string;
}

interface DeletedSummary {
  totalDeleted: number;
  deletedPatients: number;
  deletedDoctors: number;
}

export default function DeletedRecordsPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [records, setRecords] = useState<DeletedUserRecord[]>([]);
  const [summary, setSummary] = useState<DeletedSummary>({
    totalDeleted: 0,
    deletedPatients: 0,
    deletedDoctors: 0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'patient' | 'doctor'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<DeletedUserRecord | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchDeletedUsers = useCallback(async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) return;

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (roleFilter !== 'all') params.set('role', roleFilter);
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_BASE}/admin/deleted-users?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load deleted records (HTTP ${res.status})`);
      }

      const data = await res.json();
      setRecords(data.records || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (err: any) {
      console.error('Failed to load deleted users:', err);
      setFeedback({ type: 'error', message: err.message || 'Error loading deleted records' });
    } finally {
      setLoading(false);
    }
  }, [token, page, roleFilter, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeletedUsers();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchDeletedUsers]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCsv = () => {
    if (!records.length) return;
    const headers = [
      'Record ID',
      'Original Role',
      'Anonymized Name',
      'Scrubbed Email',
      'Deletion Date',
      'Deleted By Admin ID',
      'Deletion Reason',
      'POPIA Compliance Basis',
    ];

    const rows = records.map((r) => [
      `"${r.id}"`,
      `"${r.role}"`,
      `"${r.anonymizedName}"`,
      `"${r.anonymizedEmail}"`,
      `"${new Date(r.deletedAt).toISOString()}"`,
      `"${r.deletedBy}"`,
      `"${r.reason.replace(/"/g, '""')}"`,
      `"${r.retentionPolicy.replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `popia_deleted_records_${new Date().toISOString().split('T')[0]}.csv`);
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
            <Archive size={24} color="#DFA34F" />
            Deleted Records & POPIA De-Identification Registry
          </h1>
          <p className="page-subtitle">
            Permanent compliance archive of scrubbed user accounts under POPIA Sections 14 & 24 (Right to be Forgotten & Lawful Retention).
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchDeletedUsers()}
            disabled={loading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCsv}
            disabled={!records.length}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={14} />
            <span>Export Audit CSV</span>
          </button>
        </div>
      </div>

      {/* POPIA Legal Notice Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '14px',
          padding: '16px 20px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(223, 163, 79, 0.08) 0%, rgba(223, 163, 79, 0.02) 100%)',
          border: '1px solid rgba(223, 163, 79, 0.28)',
          boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '9px',
            background: 'rgba(223, 163, 79, 0.16)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            marginTop: '2px',
          }}
        >
          <ShieldCheck size={20} color="#B45309" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#201712', marginBottom: '4px' }}>
            Statutory Retention & De-Identification Protocol (POPIA Act No. 4 of 2013)
          </div>
          <div style={{ fontSize: '0.8rem', color: '#766C64', lineHeight: 1.5 }}>
            Under POPIA Section 24, individuals have the right to request deletion of personal information. In accordance with South African National Health Act (Act 61 of 2003) and Tax Administration Act, historic financial invoices and clinical encounter records must be retained for statutory periods without personal identifiers. Personal identifying data (full name, email, phone, date of birth, banking details) has been permanently scrubbed, and accounts have been de-identified and excluded from all active directories.
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Card 1: Total Deleted */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#766C64', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Total De-Identified
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#201712', marginTop: '6px' }}>
                {summary.totalDeleted}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <UserX size={20} color="#991B1B" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '10px' }}>
            Total users scrubbed under POPIA
          </div>
        </div>

        {/* Card 2: Deleted Patients */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#766C64', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Scrubbed Patients
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#201712', marginTop: '6px' }}>
                {summary.deletedPatients}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} color="#2563EB" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '10px' }}>
            Personal health records de-identified
          </div>
        </div>

        {/* Card 3: Deleted Doctors */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#766C64', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Scrubbed Doctors
              </div>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#201712', marginTop: '6px' }}>
                {summary.deletedDoctors}
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#ECF9F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Stethoscope size={20} color="#18A875" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '10px' }}>
            HPCSA profiles & credentials wiped
          </div>
        </div>

        {/* Card 4: Compliance Standard */}
        <div className="admin-card" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#766C64', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Compliance Standard
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#18A875', marginTop: '10px' }}>
                POPIA Sec 14 & 24
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#ECF9F3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} color="#18A875" />
            </div>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '10px' }}>
            100% PII scrubbed & audit logged
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="admin-card"
        style={{
          padding: '16px 20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '16px',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Role Tabs */}
        <div style={{ display: 'flex', gap: '6px', background: '#F5EFE6', padding: '4px', borderRadius: '9px' }}>
          <button
            onClick={() => {
              setRoleFilter('all');
              setPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: roleFilter === 'all' ? '#FFFFFF' : 'transparent',
              color: roleFilter === 'all' ? '#201712' : '#766C64',
              boxShadow: roleFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            All Deleted ({summary.totalDeleted})
          </button>
          <button
            onClick={() => {
              setRoleFilter('patient');
              setPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: roleFilter === 'patient' ? '#FFFFFF' : 'transparent',
              color: roleFilter === 'patient' ? '#2563EB' : '#766C64',
              boxShadow: roleFilter === 'patient' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Patients ({summary.deletedPatients})
          </button>
          <button
            onClick={() => {
              setRoleFilter('doctor');
              setPage(1);
            }}
            style={{
              padding: '6px 14px',
              borderRadius: '7px',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: 'none',
              background: roleFilter === 'doctor' ? '#FFFFFF' : 'transparent',
              color: roleFilter === 'doctor' ? '#18A875' : '#766C64',
              boxShadow: roleFilter === 'doctor' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            Doctors ({summary.deletedDoctors})
          </button>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search
            size={16}
            color="#766C64"
            style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by ID, scrubbed email, reason..."
            className="admin-input"
            style={{ paddingLeft: '36px', width: '100%', fontSize: '0.82rem' }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="admin-card" style={{ overflow: 'hidden', padding: 0 }}>
        {loading ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#766C64' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
            <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Loading POPIA de-identified records…</p>
          </div>
        ) : records.length === 0 ? (
          <div style={{ padding: '60px 20px', textAlign: 'center', color: '#766C64' }}>
            <Archive size={36} color="#DFA34F" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
              No Deleted Records Found
            </h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto' }}>
              {search
                ? 'No de-identified records matched your search query.'
                : 'No user accounts have been deleted under POPIA yet.'}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAF7F2', borderBottom: '1px solid #E9E0D5', textAlign: 'left' }}>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                    Data Subject / Role
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                    Scrubbed Email & ID
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                    Deletion Date
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                    Audit Reason
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                    POPIA Status
                  </th>
                  <th style={{ padding: '14px 18px', fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', textAlign: 'right' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((rec) => {
                  const isDoctor = rec.role === 'doctor';
                  return (
                    <tr
                      key={rec.id}
                      style={{
                        borderBottom: '1px solid #F0E8DD',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FAF7F2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {/* Data Subject / Role */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '8px',
                              background: isDoctor ? '#ECF9F3' : '#EFF6FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            {isDoctor ? (
                              <Stethoscope size={16} color="#18A875" />
                            ) : (
                              <Users size={16} color="#2563EB" />
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#201712' }}>
                              {rec.anonymizedName}
                            </div>
                            <span
                              style={{
                                display: 'inline-block',
                                fontSize: '0.68rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                marginTop: '2px',
                                background: isDoctor ? 'rgba(24, 168, 117, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                                color: isDoctor ? '#18A875' : '#2563EB',
                              }}
                            >
                              {rec.role}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Scrubbed Email & ID */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '0.82rem', color: '#201712', fontFamily: 'monospace' }}>
                          {rec.anonymizedEmail}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.72rem',
                            color: '#766C64',
                            marginTop: '2px',
                          }}
                        >
                          <span style={{ fontFamily: 'monospace' }}>ID: {rec.id.slice(0, 12)}…</span>
                          <button
                            onClick={() => handleCopy(rec.id, rec.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#DFA34F' }}
                            title="Copy full UUID"
                          >
                            {copiedKey === rec.id ? <Check size={11} color="#18A875" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>

                      {/* Deletion Date */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <div style={{ fontSize: '0.82rem', color: '#201712', fontWeight: 500 }}>
                          {new Date(rec.deletedAt).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#766C64' }}>
                          {new Date(rec.deletedAt).toLocaleTimeString('en-ZA', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>

                      {/* Audit Reason */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', maxWidth: '300px' }}>
                        <div
                          style={{
                            fontSize: '0.8rem',
                            color: '#4B3F35',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                          title={rec.reason}
                        >
                          {rec.reason}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#766C64', marginTop: '2px' }}>
                          Auth: {rec.deletedBy.slice(0, 10)}…
                        </div>
                      </td>

                      {/* POPIA Status */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '999px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: '#ECF9F3',
                            color: '#18A875',
                            border: '1px solid #A7F3D0',
                          }}
                        >
                          <ShieldCheck size={12} />
                          <span>Scrubbed (POPIA)</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '14px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedRecord(rec)}
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
                          <span>Inspect</span>
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
              background: '#FAF7F2',
            }}
          >
            <div style={{ fontSize: '0.8rem', color: '#766C64' }}>
              Showing Page <strong>{page}</strong> of <strong>{totalPages}</strong> ({total} total deleted records)
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages || loading}
                className="btn-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Record Inspection Modal / Drawer */}
      {selectedRecord && (
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
              maxWidth: '560px',
              background: '#FFFFFF',
              border: '1px solid #E9E0D5',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '9px',
                    background: '#ECF9F3',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={20} color="#18A875" />
                </div>
                <div>
                  <h2 className="section-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                    POPIA Certificate of De-Identification
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#766C64', margin: '2px 0 0 0' }}>
                    Record Hash: {selectedRecord.id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* De-Identification Checklist */}
            <div
              style={{
                background: '#FAF7F2',
                borderRadius: '10px',
                padding: '14px 16px',
                marginBottom: '18px',
                border: '1px solid #E9E0D5',
              }}
            >
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '10px' }}>
                Cryptographic De-Identification Checklist
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Full Name Anonymized
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Email Address Scrubbed
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Phone Number Erased
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Date of Birth Purged
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Avatar / Photos Removed
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Bank Details Wiped
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Status Set to Banned
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', color: '#18A875', fontWeight: 600 }}>
                  <CheckCircle2 size={14} /> Audit Trail Stored
                </div>
              </div>
            </div>

            {/* Audit Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                  Original Account Role
                </div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#201712', textTransform: 'capitalize' }}>
                  {selectedRecord.role}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                  Scrubbed Synthetic Identifier
                </div>
                <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#201712', background: '#F5EFE6', padding: '6px 10px', borderRadius: '6px', marginTop: '3px' }}>
                  {selectedRecord.anonymizedEmail}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                  Deletion Reason (Recorded Under POPIA Sec 24)
                </div>
                <div style={{ fontSize: '0.85rem', color: '#201712', background: '#FFFBEB', padding: '8px 12px', borderRadius: '6px', border: '1px solid #FDE68A', marginTop: '3px' }}>
                  {selectedRecord.reason}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                  Statutory Retention Policy
                </div>
                <div style={{ fontSize: '0.8rem', color: '#4B3F35', lineHeight: 1.4, marginTop: '3px' }}>
                  {selectedRecord.retentionPolicy}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                    De-Identification Date
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#201712', marginTop: '2px' }}>
                    {new Date(selectedRecord.deletedAt).toLocaleString('en-ZA')}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                    Authorizing Admin ID
                  </div>
                  <div style={{ fontSize: '0.82rem', fontFamily: 'monospace', color: '#201712', marginTop: '2px' }}>
                    {selectedRecord.deletedBy.slice(0, 16)}…
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setSelectedRecord(null)} className="btn-primary">
                Close Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
