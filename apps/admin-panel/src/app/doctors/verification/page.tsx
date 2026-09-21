'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Clock,
  AlertCircle,
  RefreshCw,
  Search,
  Eye,
  X,
  FileCheck,
  UserCheck,
  FileX,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Award,
} from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface PendingDoctor {
  id: string;
  slug?: string;
  user?: {
    id?: string;
    full_name: string;
    email: string;
    phone?: string;
  };
  hpcsa_number: string;
  specialty: string;
  rate_per_hour: number;
  verification_status: string;
  verification_source: string;
  created_at: string;
  bio?: string;
  facility_name?: string;
  facility_address?: string;
  documents_url?: string[];
}

export default function DoctorVerificationQueuePage() {
  const router = useRouter();
  const { admin, token, isAuthenticated, isLoading: authLoading } = useAdminAuth();

  const [doctors, setDoctors] = useState<PendingDoctor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 15;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Inspector Drawer State
  const [inspectingDoctor, setInspectingDoctor] = useState<PendingDoctor | null>(null);

  // Approval Modal State
  const [approvingDoctor, setApprovingDoctor] = useState<PendingDoctor | null>(null);
  const [approvalNotes, setApprovalNotes] = useState('HPCSA certificate and identity documents audited and approved.');

  // Rejection Modal State
  const [rejectingDoctor, setRejectingDoctor] = useState<PendingDoctor | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionError, setRejectionError] = useState('');

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const fetchPendingDoctors = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`${API_BASE}/admin/doctors/pending?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!res.ok) {
        throw new Error(`Failed to load pending verifications (${res.status})`);
      }

      const data = await res.json();
      setDoctors(data.doctors || []);
      setTotal(data.total || 0);
    } catch (err: any) {
      console.error('Failed to fetch pending doctors:', err.message);
      setError(err.message || 'Failed to fetch pending verifications');
      setDoctors([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [token, page, limit, search]);

  useEffect(() => {
    if (token) {
      fetchPendingDoctors();
    }
  }, [fetchPendingDoctors, token]);

  // Execute Approval
  const confirmApprove = async () => {
    if (!approvingDoctor) return;
    const docId = approvingDoctor.id;
    setProcessingId(docId);
    setFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/admin/doctors/${docId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notes: approvalNotes.trim() }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Approval failed (${res.status})`);
      }

      // Optimistic update
      setDoctors((prev) => prev.filter((d) => d.id !== docId));
      setTotal((prev) => Math.max(0, prev - 1));
      if (inspectingDoctor?.id === docId) setInspectingDoctor(null);
      setApprovingDoctor(null);

      setFeedback({
        type: 'success',
        message: `Doctor ${approvingDoctor.user?.full_name} (${approvingDoctor.hpcsa_number}) has been approved and activated!`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to approve doctor' });
    } finally {
      setProcessingId(null);
    }
  };

  // Execute Rejection
  const confirmReject = async () => {
    if (!rejectingDoctor) return;
    if (!rejectionReason.trim()) {
      setRejectionError('Rejection reason is mandatory for regulatory compliance.');
      return;
    }

    const docId = rejectingDoctor.id;
    setProcessingId(docId);
    setFeedback(null);

    try {
      const res = await fetch(`${API_BASE}/admin/doctors/${docId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
        credentials: 'include',
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Rejection failed (${res.status})`);
      }

      // Optimistic update
      setDoctors((prev) => prev.filter((d) => d.id !== docId));
      setTotal((prev) => Math.max(0, prev - 1));
      if (inspectingDoctor?.id === docId) setInspectingDoctor(null);
      setRejectingDoctor(null);
      setRejectionReason('');
      setRejectionError('');

      setFeedback({
        type: 'success',
        message: `Doctor registration rejected. Audit notification recorded.`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to reject doctor' });
    } finally {
      setProcessingId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  if (authLoading || !admin) {
    return (
      <div style={{ color: '#766C64', textAlign: 'center', padding: '60px' }}>
        Verifying administrator credentials...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div className="page-eyebrow">
            <Award size={13} />
            <span>HPCSA Compliance & Credentialing</span>
          </div>
          <h1 className="page-title">
            Doctor Verification Queue
          </h1>
          <p className="page-subtitle">
            Inspect uploaded certificates, audit medical council credentials, and verify direct GP applicants.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchPendingDoctors()}
          disabled={loading}
          className="btn-secondary"
          style={{
            fontSize: '0.8125rem',
            padding: '8px 16px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh Queue</span>
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
            onClick={() => fetchPendingDoctors()}
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

      {/* Search Ribbon */}
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
        <div style={{ flex: 1, minWidth: '280px', position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#766C64' }} />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search doctor name, HPCSA license, email, or specialty..."
            className="admin-input"
            style={{
              width: '100%',
              paddingLeft: '36px',
              fontSize: '0.8125rem',
              height: '38px',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              fontSize: '0.78rem',
              fontWeight: 700,
              backgroundColor: '#FFFBEB',
              color: '#D88A24',
              border: '1px solid #FDE68A',
            }}
          >
            {total} Pending Applicant{total === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Queue List / Table */}
      {loading ? (
        <div className="admin-card" style={{ padding: '60px 20px', textAlign: 'center', color: '#766C64' }}>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px', color: '#DFA34F' }} />
          <p style={{ fontSize: '0.85rem', fontWeight: 500 }}>Loading pending HPCSA doctor verifications...</p>
        </div>
      ) : doctors.length === 0 ? (
        <div
          className="admin-card"
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: '#ECF9F3',
              border: '1px solid #A7F3D0',
              color: '#18A875',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px auto',
            }}
          >
            <CheckCircle2 size={30} />
          </div>
          <h3 className="section-title" style={{ marginBottom: '6px' }}>
            Queue is Clear!
          </h3>
          <p className="section-subtitle">
            All medical practitioner registration applications have been audited and verified.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {doctors.map((doc) => {
            const isProcessing = processingId === doc.id;
            const initial = doc.user?.full_name ? doc.user.full_name.replace('Dr. ', '').trim()[0] : 'D';

            return (
              <div
                key={doc.id}
                className="admin-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  backgroundColor: '#FFFFFF',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '14px',
                  }}
                >
                  {/* Doctor Profile Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '10px',
                        background: '#2B170F',
                        border: '1.5px solid #DFA34F',
                        color: '#DFA34F',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      {initial}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#201712', margin: 0 }}>
                          {doc.user?.full_name || 'Dr. Medical Practitioner'}
                        </h2>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontSize: '0.725rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: '4px',
                            backgroundColor: '#F8F5EF',
                            border: '1px solid #E9E0D5',
                            color: '#B98232',
                          }}
                        >
                          {doc.hpcsa_number}
                        </span>
                      </div>
                      <div style={{ color: '#766C64', fontSize: '0.8125rem', marginTop: '2px' }}>
                        {doc.user?.email} • {doc.user?.phone || 'No phone provided'}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: '#FFFBEB',
                        color: '#D88A24',
                        border: '1px solid #FDE68A',
                      }}
                    >
                      <Clock size={11} />
                      <span>PENDING AUDIT</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setInspectingDoctor(doc)}
                      className="btn-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <Eye size={13} />
                      <span>Inspect</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRejectingDoctor(doc)}
                      disabled={isProcessing}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        borderRadius: '9999px',
                        background: '#FEF2F2',
                        color: '#991B1B',
                        border: '1px solid #FECACA',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <XCircle size={13} />
                      <span>Reject</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setApprovingDoctor(doc);
                        setApprovalNotes('HPCSA certificate and identity documents audited and approved.');
                      }}
                      disabled={isProcessing}
                      className="btn-primary"
                      style={{
                        padding: '6px 16px',
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <CheckCircle2 size={13} />
                      <span>Approve</span>
                    </button>
                  </div>
                </div>

                {/* Summary Metadata Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                    gap: '10px',
                    backgroundColor: '#FAF8F5',
                    border: '1px solid #E9E0D5',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div>
                    <span style={{ color: '#766C64', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Specialty</span>
                    <span style={{ color: '#201712', fontWeight: 600 }}>{doc.specialty || 'General Practitioner'}</span>
                  </div>
                  <div>
                    <span style={{ color: '#766C64', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Consultation Rate</span>
                    <span style={{ color: '#18A875', fontWeight: 700 }}>R {Number(doc.rate_per_hour || 0).toFixed(2)}/hr</span>
                  </div>
                  <div>
                    <span style={{ color: '#766C64', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Verification Source</span>
                    <span style={{ color: '#201712', fontWeight: 600, textTransform: 'capitalize' }}>
                      {doc.verification_source || 'Direct Platform'}
                    </span>
                  </div>
                  <div>
                    <span style={{ color: '#766C64', fontSize: '0.7rem', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Uploaded Documents</span>
                    <span style={{ color: '#201712', fontWeight: 600 }}>
                      {doc.documents_url?.length || 0} credential file(s)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div
              style={{
                padding: '12px 18px',
                borderRadius: '12px',
                border: '1px solid #E9E0D5',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
              }}
            >
              <span style={{ fontSize: '0.8125rem', color: '#766C64', fontWeight: 500 }}>
                Showing {doctors.length} of {total} applicants (Page {page} of {totalPages})
              </span>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  <ChevronLeft size={13} /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem' }}
                >
                  Next <ChevronRight size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Split-Screen Inspector Drawer */}
      {inspectingDoctor && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setInspectingDoctor(null)}
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
                    Doctor Credential Audit
                  </h2>
                  <span
                    className="table-badge-booking-id"
                    style={{ fontSize: '0.78rem', color: '#B98232' }}
                  >
                    {inspectingDoctor.hpcsa_number}
                  </span>
                </div>
                <p className="section-subtitle">
                  HPCSA Statutory Regulatory Audit • Medical Practitioners Act 56 of 1974
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingDoctor(null)}
                className="btn-icon"
                style={{ width: '32px', height: '32px' }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* POPIA Compliance Notice */}
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
                  <strong>Section 19 POPIA Privilege:</strong> Credential auditing event logged to immutable compliance ledger.
                </span>
              </div>

              {/* Doctor Details */}
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                  <Stethoscope size={13} /> Applicant Profile
                </div>
                <div style={{ fontWeight: 700, color: '#201712', fontSize: '1rem' }}>
                  {inspectingDoctor.user?.full_name}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#766C64', marginTop: '2px' }}>
                  {inspectingDoctor.user?.email} • {inspectingDoctor.user?.phone || 'No phone'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: '#201712', marginTop: '4px', fontWeight: 600 }}>
                  {inspectingDoctor.specialty} • R{Number(inspectingDoctor.rate_per_hour || 0).toFixed(2)}/hr
                </div>
                {inspectingDoctor.facility_name && (
                  <div style={{ fontSize: '0.78rem', color: '#766C64', marginTop: '2px' }}>
                    Facility: {inspectingDoctor.facility_name} {inspectingDoctor.facility_address ? `(${inspectingDoctor.facility_address})` : ''}
                  </div>
                )}
                {inspectingDoctor.bio && (
                  <p style={{ fontSize: '0.8125rem', color: '#201712', marginTop: '10px', lineHeight: 1.5, borderTop: '1px solid #F0ECE6', paddingTop: '10px' }}>
                    {inspectingDoctor.bio}
                  </p>
                )}
              </div>

              {/* Uploaded Documents List */}
              <div style={{ background: '#FFFFFF', padding: '16px', borderRadius: '12px', border: '1px solid #E9E0D5' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#B98232', fontWeight: 700, marginBottom: '10px', textTransform: 'uppercase' }}>
                  <FileText size={13} /> Uploaded Credential Documents ({inspectingDoctor.documents_url?.length || 0})
                </div>
                {!inspectingDoctor.documents_url || inspectingDoctor.documents_url.length === 0 ? (
                  <p style={{ fontSize: '0.8125rem', color: '#766C64', margin: 0 }}>
                    No document attachments uploaded with this application.
                  </p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {inspectingDoctor.documents_url.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #E9E0D5',
                          backgroundColor: '#FAF8F5',
                          textDecoration: 'none',
                          color: '#201712',
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <FileCheck size={15} color="#18A875" />
                          <span>Credential Certificate #{idx + 1}</span>
                        </div>
                        <ExternalLink size={13} color="#766C64" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions inside drawer */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setRejectingDoctor(inspectingDoctor)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '9999px',
                    backgroundColor: '#FEF2F2',
                    color: '#991B1B',
                    border: '1px solid #FECACA',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Reject Application
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setApprovingDoctor(inspectingDoctor);
                    setApprovalNotes('HPCSA certificate and identity documents audited and approved.');
                  }}
                  className="btn-primary"
                  style={{
                    padding: '8px 20px',
                    fontSize: '0.8125rem',
                  }}
                >
                  Approve & Activate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {approvingDoctor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(42, 23, 15, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '20px',
          }}
          onClick={() => setApprovingDoctor(null)}
        >
          <div
            className="admin-card"
            style={{
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ECF9F3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#18A875' }}>
                <CheckCircle2 size={20} />
              </div>
              <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                Approve Doctor Registration
              </h2>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#766C64', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to verify and activate <strong>{approvingDoctor.user?.full_name}</strong> ({approvingDoctor.hpcsa_number})? This will enable their profile for patient bookings across South Africa.
            </p>

            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Audit & Verification Notes
            </label>
            <textarea
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              rows={3}
              className="admin-input"
              style={{ width: '100%', marginBottom: '20px', resize: 'vertical' }}
            />

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setApprovingDoctor(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                disabled={processingId === approvingDoctor.id}
                className="btn-primary"
                style={{ padding: '8px 20px', fontSize: '0.8125rem' }}
              >
                {processingId === approvingDoctor.id ? 'Approving...' : 'Confirm Approval'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectingDoctor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(42, 23, 15, 0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 60,
            padding: '20px',
          }}
          onClick={() => setRejectingDoctor(null)}
        >
          <div
            className="admin-card"
            style={{
              padding: '28px',
              width: '100%',
              maxWidth: '480px',
              backgroundColor: '#FFFFFF',
              boxShadow: '0 10px 35px rgba(0, 0, 0, 0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#991B1B' }}>
                <XCircle size={20} />
              </div>
              <h2 className="section-title" style={{ fontSize: '1.2rem', margin: 0, color: '#991B1B' }}>
                Reject Doctor Registration
              </h2>
            </div>

            <p style={{ fontSize: '0.85rem', color: '#766C64', lineHeight: 1.5, marginBottom: '14px' }}>
              Rejecting <strong>{rejectingDoctor.user?.full_name}</strong> ({rejectingDoctor.hpcsa_number}). Please state the regulatory reason for the audit trail.
            </p>

            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#201712', marginBottom: '6px' }}>
              Mandatory Rejection Reason *
            </label>
            <textarea
              value={rejectionReason}
              onChange={(e) => {
                setRejectionReason(e.target.value);
                if (rejectionError) setRejectionError('');
              }}
              rows={3}
              placeholder="e.g. HPCSA certificate expired or illegible copy uploaded..."
              className="admin-input"
              style={{
                width: '100%',
                marginBottom: rejectionError ? '6px' : '20px',
                resize: 'vertical',
                borderColor: rejectionError ? '#DC2626' : undefined,
              }}
            />
            {rejectionError && (
              <div style={{ color: '#DC2626', fontSize: '0.75rem', marginBottom: '16px', fontWeight: 600 }}>
                {rejectionError}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setRejectingDoctor(null)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={processingId === rejectingDoctor.id}
                style={{
                  padding: '8px 18px',
                  borderRadius: '9999px',
                  backgroundColor: '#991B1B',
                  color: '#FFFFFF',
                  border: 'none',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  cursor: processingId === rejectingDoctor.id ? 'not-allowed' : 'pointer',
                }}
              >
                {processingId === rejectingDoctor.id ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
