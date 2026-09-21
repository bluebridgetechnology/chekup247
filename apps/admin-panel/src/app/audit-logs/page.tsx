'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  ShieldAlert,
  ShieldCheck,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Code,
  FileText,
  Lock,
  Eye,
  Database,
  Calendar,
  X,
  Copy,
  Check,
  Shield,
  User,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface AuditLogItem {
  id: string;
  userId?: string;
  user_id?: string;
  userRole?: string;
  user_role?: string;
  patientId?: string;
  patient_id?: string;
  action: string;
  resource?: string;
  ipAddress?: string;
  ip_address?: string;
  userAgent?: string;
  user_agent?: string;
  context?: string;
  metadata?: Record<string, any>;
  createdAt?: string;
  created_at?: string;
}

interface AuditLogResponse {
  logs: AuditLogItem[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
  summary?: {
    totalEvents: number;
    viewCount: number;
    exportCount: number;
    modificationCount: number;
  };
}

export function formatDisplayId(id: string | undefined | null, role?: string): string {
  if (!id || id === 'all' || id === 'none' || id === 'System') return id || '—';
  if (id.length <= 6 && /^[A-Z0-9]+$/i.test(id)) return id.toUpperCase();

  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const num = Math.abs(hash % 90000) + 10000; // 5 digits (10000 - 99999)

  const r = (role || '').toLowerCase();
  if (r === 'doctor' || r === 'practitioner') {
    return `P${num}`; // P for practice + 5 digits = 6 chars max
  }
  if (r === 'admin' || r === 'super_admin' || r === 'super admin') {
    return `A${num}`; // A for admin + 5 digits = 6 chars max
  }
  return `P${num}`; // P for patient + 5 digits = 6 chars max
}

export default function PopiaAuditLogInspectorPage() {
  const { token, isLoading: authLoading } = useAdminAuth();
  const [data, setData] = useState<AuditLogResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [resourceFilter, setResourceFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const fetchAuditLogs = useCallback(async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      if (!authLoading) {
        setIsLoading(false);
      }
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (roleFilter !== 'all') params.set('userRole', roleFilter);

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenToUse}`,
      };

      const res = await fetch(`${API_BASE}/admin/audit-logs?${params.toString()}`, {
        headers,
        credentials: 'include',
      });

      if (!res.ok) {
        if (res.status === 401) {
          setErrorMessage('Session unauthorized or expired. Please re-login to access POPIA audit records.');
          return;
        }
        throw new Error(`Failed to fetch audit logs (HTTP ${res.status})`);
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.error('Audit log fetch error:', err);
      setErrorMessage(err.message || 'Failed to load POPIA audit trail from server.');
    } finally {
      setIsLoading(false);
    }
  }, [page, limit, search, actionFilter, roleFilter, token, authLoading]);

  useEffect(() => {
    if (token || !authLoading) {
      fetchAuditLogs();
    }
  }, [fetchAuditLogs, token, authLoading]);

  const handleExportAuditTrail = () => {
    if (!data?.logs) return;
    const jsonStr = JSON.stringify(data.logs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `popia-audit-trail-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  };

  const actionStyles: Record<string, { bg: string; text: string; border: string }> = {
    VIEW: { bg: '#EFF6FF', text: '#1D4ED8', border: '#BFDBFE' },
    DOWNLOAD: { bg: '#ECFDF5', text: '#047857', border: '#A7F3D0' },
    CREATE: { bg: '#FAF5FF', text: '#7E22CE', border: '#E9D5FF' },
    UPDATE: { bg: '#FFFBEB', text: '#B45309', border: '#FDE68A' },
    EXPORT: { bg: '#FEF2F2', text: '#B91C1C', border: '#FECACA' },
    DELETE: { bg: '#FEE2E2', text: '#991B1B', border: '#FCA5A5' },
  };

  const roleStyles: Record<string, { bg: string; text: string }> = {
    doctor: { bg: '#FAF5EB', text: '#B98232' },
    patient: { bg: '#F3E8FF', text: '#6B21A8' },
    admin: { bg: '#2B170F', text: '#ECC27E' },
    system: { bg: '#F8F5EF', text: '#766C64' },
  };

  const logs = (data?.logs || []).filter((log) => {
    if (resourceFilter === 'all') return true;
    const res = (log.resource || log.metadata?.resource || '').toUpperCase();
    return res.includes(resourceFilter.toUpperCase());
  });

  const totalPages = data?.totalPages || Math.ceil((data?.total || 0) / limit) || 1;
  const summary = data?.summary || {
    totalEvents: data?.total || 0,
    viewCount: logs.filter((l) => (l.action || '').toUpperCase() === 'VIEW').length,
    exportCount: logs.filter((l) => ['EXPORT', 'DOWNLOAD'].includes((l.action || '').toUpperCase())).length,
    modificationCount: logs.filter((l) => ['CREATE', 'UPDATE', 'DELETE'].includes((l.action || '').toUpperCase())).length,
  };

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', color: '#201712' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  background: '#F7EFE3',
                  color: '#B98232',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Activity size={20} />
              </div>
              POPIA Health Record Audit Log
            </h1>
            <span
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '3px 8px',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Lock size={12} /> Compliance Officer Eyes Only
            </span>
          </div>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Mandatory immutable audit trail recording every access, creation, viewing, and transmission of Special Personal Information under POPIA Section 19.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchAuditLogs()}
            disabled={isLoading}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportAuditTrail}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Download size={15} />
            <span>Export Trail (JSON)</span>
          </button>
        </div>
      </div>

      {/* Stats Ribbon - 4 Cards Single Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: '16px',
        }}
      >
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Total Audit Events</span>
            <Activity size={18} color="#B98232" />
          </div>
          <div className="stat-number">{summary.totalEvents.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            All recorded security operations
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Clinical Record Views</span>
            <Eye size={18} color="#1D4ED8" />
          </div>
          <div className="stat-number" style={{ color: '#1D4ED8' }}>
            {summary.viewCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Read access by doctors & admins
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Data Exports / DSARs</span>
            <Download size={18} color="#B91C1C" />
          </div>
          <div className="stat-number" style={{ color: '#B91C1C' }}>
            {summary.exportCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            PDF downloads & DSAR extractions
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Record Modifications</span>
            <Database size={18} color="#0F8F72" />
          </div>
          <div className="stat-number" style={{ color: '#0F8F72' }}>
            {summary.modificationCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Prescriptions issued & notes updated
          </div>
        </div>
      </div>

      {/* Statutory Legal Safeguard Banner */}
      <div
        className="admin-card"
        style={{
          background: '#2B170F',
          color: '#FFFFFF',
          borderLeft: '4px solid #DFA34F',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
          padding: '16px 20px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'rgba(223, 163, 79, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ECC27E',
            flexShrink: 0,
          }}
        >
          <ShieldAlert size={20} />
        </div>
        <div>
          <div style={{ fontWeight: 700, color: '#FFFFFF', fontSize: '0.9rem', marginBottom: '2px' }}>
            Protection of Personal Information Act (POPIA No. 4 of 2013) — Section 19 Safeguards
          </div>
          <div style={{ fontSize: '0.8rem', color: '#E9E0D5', lineHeight: 1.4 }}>
            ChekUp247 maintains an immutable, tamper-evident cryptographic log of all access to health data, consultations, and prescriptions. All audit events are stored separately from clinical records on the operational database cluster.
          </div>
        </div>
      </div>

      {errorMessage && (
        <div
          style={{
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {errorMessage}
        </div>
      )}

      {/* Filter Toolbar */}
      <div
        className="admin-card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#766C64' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search by user ID, patient ID, IP address, or event..."
            className="admin-input"
            style={{ width: '100%', paddingLeft: '34px', fontSize: '0.825rem' }}
          />
        </div>

        {/* Action Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#766C64' }}>Action:</span>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
            style={{ fontSize: '0.825rem' }}
          >
            <option value="all">All Actions</option>
            <option value="VIEW">VIEW (Read)</option>
            <option value="DOWNLOAD">DOWNLOAD (PDF)</option>
            <option value="CREATE">CREATE (Issued)</option>
            <option value="UPDATE">UPDATE (Notes)</option>
            <option value="EXPORT">EXPORT (Extract)</option>
          </select>
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#766C64' }}>Role:</span>
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
            style={{ fontSize: '0.825rem' }}
          >
            <option value="all">All Roles</option>
            <option value="doctor">Doctor</option>
            <option value="patient">Patient</option>
            <option value="admin">Administrator</option>
            <option value="system">System Daemon</option>
          </select>
        </div>

        {/* Resource Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#766C64' }}>Resource:</span>
          <select
            value={resourceFilter}
            onChange={(e) => {
              setResourceFilter(e.target.value);
              setPage(1);
            }}
            className="admin-select"
            style={{ fontSize: '0.825rem' }}
          >
            <option value="all">All Resources</option>
            <option value="CONSULTATION_NOTES">Consultation Notes</option>
            <option value="PRESCRIPTION">Prescriptions</option>
            <option value="PATIENT_PROFILE">Patient Profiles</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table Container */}
      <div className="admin-table-container">
        {isLoading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
            <div>Loading immutable POPIA audit trail…</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <ShieldCheck size={36} color="#B98232" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <div style={{ fontWeight: 600, color: '#201712', marginBottom: '4px' }}>No audit records found</div>
            <div style={{ fontSize: '0.85rem' }}>No telemetry logs matched the specified filters.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Timestamp (SAST)</th>
                  <th>Accessing User</th>
                  <th>Role</th>
                  <th>Action</th>
                  <th>Target Resource</th>
                  <th>Patient ID</th>
                  <th>IP Address</th>
                  <th>Context / Event</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actType = (log.action || 'VIEW').toUpperCase();
                  const act = actionStyles[actType] || { bg: '#F8F5EF', text: '#766C64', border: '#E9E0D5' };
                  const userRole = (log.userRole || log.user_role || 'system').toLowerCase();
                  const rol = roleStyles[userRole] || { bg: '#F8F5EF', text: '#766C64' };
                  const rawDate = log.createdAt || log.created_at;
                  const dateStr = rawDate ? new Date(rawDate).toLocaleString('en-ZA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  }) : 'Unknown Date';
                  const userId = log.userId || log.user_id || 'System';
                  const patientId = log.patientId || log.patient_id || 'N/A';
                  const ipAddr = log.ipAddress || log.ip_address || '—';
                  const resName = log.resource || log.metadata?.resource || 'HEALTH_RECORD';
                  const eventCtx = log.context || log.metadata?.context || log.metadata?.reason || `POPIA ${log.action} access recorded`;

                  return (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', color: '#766C64', whiteSpace: 'nowrap' }}>
                        {dateStr}
                      </td>
                      <td>
                        <span style={{ fontFamily: 'monospace', color: '#201712', fontWeight: 600, fontSize: '0.8rem' }}>
                          {formatDisplayId(userId, userRole)}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: rol.bg,
                            color: rol.text,
                            textTransform: 'capitalize',
                          }}
                        >
                          {userRole}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            background: act.bg,
                            color: act.text,
                            border: `1px solid ${act.border}`,
                          }}
                        >
                          {actType}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#201712', fontFamily: 'monospace' }}>
                          {resName}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#766C64', fontFamily: 'monospace', fontWeight: 600 }}>
                          {formatDisplayId(patientId, 'patient')}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: '0.75rem', color: '#766C64', fontFamily: 'monospace' }}>
                          {ipAddr}
                        </span>
                      </td>
                      <td style={{ maxWidth: '280px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#201712', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {eventCtx}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.75rem',
                            padding: '4px 10px',
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
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
            style={{ padding: '6px 12px' }}
          >
            <ChevronLeft size={16} />
          </button>
          <span style={{ color: '#766C64', fontSize: '0.85rem', fontWeight: 600 }}>
            Page {page} of {totalPages} ({data?.total || 0} entries)
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-secondary"
            style={{ padding: '6px 12px' }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Slide-Over Drawer for Audit Log Details */}
      {selectedLog && (() => {
        const actType = (selectedLog.action || 'VIEW').toUpperCase();
        const act = actionStyles[actType] || { bg: '#F8F5EF', text: '#766C64', border: '#E9E0D5' };
        const userRole = (selectedLog.userRole || selectedLog.user_role || 'system').toLowerCase();
        const rol = roleStyles[userRole] || { bg: '#F8F5EF', text: '#766C64' };
        const rawDate = selectedLog.createdAt || selectedLog.created_at;
        const dateStr = rawDate ? new Date(rawDate).toLocaleString('en-ZA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) : 'Unknown Date';
        const rawUserId = selectedLog.userId || selectedLog.user_id || 'System';
        const rawPatientId = selectedLog.patientId || selectedLog.patient_id || 'N/A';
        const displayUserId = formatDisplayId(rawUserId, userRole);
        const displayPatientId = formatDisplayId(rawPatientId, 'patient');
        const ipAddr = selectedLog.ipAddress || selectedLog.ip_address || '—';
        const userAgent = selectedLog.userAgent || selectedLog.user_agent || 'Unknown';
        const resName = selectedLog.resource || selectedLog.metadata?.resource || 'HEALTH_RECORD';
        const eventCtx = selectedLog.context || selectedLog.metadata?.context || selectedLog.metadata?.reason || `POPIA ${selectedLog.action} access recorded`;

        const fullJson = JSON.stringify(
          {
            id: selectedLog.id,
            userId: displayUserId,
            userRole,
            patientId: displayPatientId,
            action: actType,
            resource: resName,
            ipAddress: ipAddr,
            userAgent,
            createdAt: dateStr,
            metadata: selectedLog.metadata || {},
          },
          null,
          2
        );

        const handleCopyJson = () => {
          navigator.clipboard.writeText(fullJson);
          setCopiedJson(true);
          setTimeout(() => setCopiedJson(false), 2000);
        };

        const handleCopyId = () => {
          navigator.clipboard.writeText(selectedLog.id);
          setCopiedId(true);
          setTimeout(() => setCopiedId(false), 2000);
        };

        return (
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
              onClick={() => setSelectedLog(null)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(32, 23, 18, 0.6)',
                backdropFilter: 'blur(4px)',
              }}
            />

            {/* Scrollable Drawer Sheet */}
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: '600px',
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
              {/* Header - Sticky at Top */}
              <div
                style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10,
                  padding: '16px 24px',
                  borderBottom: '1px solid #E9E0D5',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: '#F8F5EF',
                  boxSizing: 'border-box',
                  width: '100%',
                  flexShrink: 0,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                  <div
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: '#F7EFE3',
                      color: '#B98232',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#201712', margin: 0 }}>
                        Audit Event Record
                      </h2>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: act.bg,
                          color: act.text,
                          border: `1px solid ${act.border}`,
                        }}
                      >
                        {actType}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#766C64', marginTop: '2px' }}>
                      {dateStr}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#766C64',
                    cursor: 'pointer',
                    padding: '6px',
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              {/* Drawer Body - Flow Naturally */}
              <div
                style={{
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  flex: '1 0 auto',
                  boxSizing: 'border-box',
                  width: '100%',
                }}
              >
                {/* Event Summary Card */}
                <div
                  className="admin-card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #E9E0D5', paddingBottom: '8px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                      Event Identification
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyId}
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedId ? <Check size={11} color="#0F8F72" /> : <Copy size={11} />}
                      <span>{copiedId ? 'Copied' : 'Copy ID'}</span>
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px', width: '100%' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', color: '#766C64', marginBottom: '2px' }}>Event UUID</div>
                      <div
                        style={{
                          fontSize: '0.8rem',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: '#201712',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {selectedLog.id}
                      </div>
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', color: '#766C64', marginBottom: '2px' }}>Target Resource</div>
                      <div
                        style={{
                          fontSize: '0.825rem',
                          fontFamily: 'monospace',
                          fontWeight: 700,
                          color: '#201712',
                          wordBreak: 'break-word',
                          overflowWrap: 'anywhere',
                        }}
                      >
                        {resName}
                      </div>
                    </div>
                  </div>

                  <div style={{ minWidth: 0, width: '100%' }}>
                    <div style={{ fontSize: '0.72rem', color: '#766C64', marginBottom: '2px' }}>Context / Description</div>
                    <div
                      style={{
                        fontSize: '0.825rem',
                        color: '#201712',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {eventCtx}
                    </div>
                  </div>
                </div>

                {/* Actor & Patient Card */}
                <div
                  className="admin-card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase', borderBottom: '1px solid #E9E0D5', paddingBottom: '8px' }}>
                    Accessing Party & Data Subject
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px 16px', width: '100%' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', color: '#766C64', marginBottom: '2px' }}>Accessing User</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#201712',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {displayUserId}
                        </span>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            background: rol.bg,
                            color: rol.text,
                            textTransform: 'capitalize',
                            flexShrink: 0,
                          }}
                        >
                          {userRole}
                        </span>
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.72rem', color: '#766C64', marginBottom: '2px' }}>Patient (Data Subject)</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontSize: '0.85rem',
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            color: '#201712',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                          }}
                        >
                          {displayPatientId}
                        </span>
                        <span
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: '#ECF9F3',
                            color: '#0F8F72',
                            border: '1px solid #A7F3D0',
                            flexShrink: 0,
                          }}
                        >
                          POPIA
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ minWidth: 0, width: '100%', borderTop: '1px solid #F0ECE6', paddingTop: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#766C64', marginBottom: '2px' }}>IP Address</div>
                    <div
                      style={{
                        fontSize: '0.8rem',
                        fontFamily: 'monospace',
                        color: '#201712',
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {ipAddr}
                    </div>
                  </div>

                  <div style={{ minWidth: 0, width: '100%', borderTop: '1px solid #F0ECE6', paddingTop: '8px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#766C64', marginBottom: '2px' }}>Client User Agent</div>
                    <div
                      style={{
                        fontSize: '0.75rem',
                        fontFamily: 'monospace',
                        color: '#524943',
                        lineHeight: 1.4,
                        wordBreak: 'break-word',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {userAgent}
                    </div>
                  </div>
                </div>

                {/* POPIA Compliance Notice */}
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '8px',
                    background: '#F0FDF4',
                    border: '1px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    width: '100%',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  }}
                >
                  <Lock size={15} color="#166534" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ fontSize: '0.75rem', color: '#166534', lineHeight: 1.4 }}>
                    <strong>POPIA Section 19 Certified:</strong> This record is immutable and cryptographically bound to the audit ledger.
                  </div>
                </div>

                {/* JSON Metadata & Telemetry Payload */}
                <div
                  className="admin-card"
                  style={{
                    padding: '16px 20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#766C64', textTransform: 'uppercase' }}>
                      Raw JSON Telemetry Payload
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyJson}
                      className="btn-secondary"
                      style={{ fontSize: '0.72rem', padding: '2px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      {copiedJson ? <Check size={11} color="#0F8F72" /> : <Copy size={11} />}
                      <span>{copiedJson ? 'Copied' : 'Copy JSON'}</span>
                    </button>
                  </div>

                  <pre
                    style={{
                      background: '#FAF8F4',
                      border: '1px solid #E9E0D5',
                      borderRadius: '6px',
                      padding: '12px 14px',
                      fontSize: '0.72rem',
                      color: '#201712',
                      margin: 0,
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      boxSizing: 'border-box',
                    }}
                  >
                    {fullJson}
                  </pre>
                </div>
              </div>

              {/* Footer - Sticky at Bottom */}
              <div
                style={{
                  position: 'sticky',
                  bottom: 0,
                  zIndex: 10,
                  padding: '14px 24px',
                  borderTop: '1px solid #E9E0D5',
                  background: '#F8F5EF',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '10px',
                  flexShrink: 0,
                  marginTop: 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="btn-secondary"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  {copiedJson ? <Check size={14} color="#0F8F72" /> : <Copy size={14} />}
                  <span>{copiedJson ? 'Copied Payload' : 'Copy Full Payload'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLog(null)}
                  className="btn-primary"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
