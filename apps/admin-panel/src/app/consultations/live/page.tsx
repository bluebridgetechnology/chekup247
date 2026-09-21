'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  Radio,
  RefreshCw,
  Clock,
  Video,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAdminAuth } from '../../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface ConsultationRow {
  id: string;
  bookingId: string;
  videoRoomId: string;
  startedAt: string | null;
  endedAt: string | null;
  doctorJoinedAt: string | null;
  patientJoinedAt: string | null;
  isInFlight: boolean;
  durationSeconds: number;
  booking: {
    id: string;
    status: string;
    price: number;
    doctor: { id: string; name: string; specialty: string } | null;
    patient: { id: string; name: string } | null;
  } | null;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function LiveConsultationOversightPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading } = useAdminAuth();

  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [inFlightOnly, setInFlightOnly] = useState(true);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchConsultations = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (inFlightOnly) params.set('inFlightOnly', 'true');

      const res = await fetch(`${API_BASE}/admin/consultations?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setConsultations(data.consultations || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
      }
    } catch (err) {
      console.error('Failed to fetch consultations:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, inFlightOnly]);

  useEffect(() => {
    fetchConsultations();
  }, [fetchConsultations]);

  // Poll every 20s while showing in-flight sessions and auto-refresh is on
  useEffect(() => {
    if (!autoRefresh || !inFlightOnly) return;
    const interval = setInterval(() => fetchConsultations(), 20000);
    return () => clearInterval(interval);
  }, [autoRefresh, inFlightOnly, fetchConsultations]);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Activity size={24} color="var(--color-gold-bronze, #B88647)" />
            <h1 className="page-title">
              Live Consultation Telemetry
            </h1>
          </div>
          <p className="page-subtitle">
            Real-time telemetry of in-flight telehealth rooms, participant join timing, and duration tracking.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setInFlightOnly((v) => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '9px 16px',
              borderRadius: 'var(--radius-full, 9999px)',
              fontSize: '0.825rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: inFlightOnly
                ? '1.5px solid var(--color-chocolate-base, #2A170F)'
                : '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.3))',
              background: inFlightOnly ? 'var(--color-chocolate-base, #2A170F)' : 'var(--color-cream-surface, #FDFBF7)',
              color: inFlightOnly ? '#ffffff' : 'var(--color-chocolate-base, #2A170F)',
              transition: 'all 0.18s ease',
            }}
          >
            <Radio size={14} color={inFlightOnly ? 'var(--color-gold-primary, #E2B467)' : 'currentColor'} />
            <span>{inFlightOnly ? 'Showing In-Flight Only' : 'Showing All'}</span>
          </button>
          <button
            onClick={() => fetchConsultations()}
            className="btn-secondary"
            style={{
              padding: '9px 18px',
              fontSize: '0.825rem',
            }}
          >
            <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </div>

      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            Loading live clinical sessions…
          </div>
        ) : consultations.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            {inFlightOnly ? 'No telehealth consultations are currently in flight.' : 'No consultations found.'}
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Video Room / Session</th>
                <th>Doctor & Patient</th>
                <th>Join Timing</th>
                <th>Elapsed Duration</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {consultations.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>
                      <Video size={14} color="var(--color-gold-bronze, #B88647)" />
                      <span style={{ fontFamily: 'monospace' }}>{c.videoRoomId}</span>
                    </div>
                    <div style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.75rem', marginTop: '2px' }}>
                      Booking Fee: R{Number(c.booking?.price || 0).toFixed(2)}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--color-chocolate-base, #2A170F)' }}>{c.booking?.doctor?.name || 'Doctor'}</div>
                    <div style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.75rem', marginTop: '2px' }}>
                      {c.booking?.patient?.name || 'Patient'}
                    </div>
                  </td>
                  <td style={{ fontSize: '0.8rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    {c.doctorJoinedAt && <div>Doctor: {new Date(c.doctorJoinedAt).toLocaleTimeString()}</div>}
                    {c.patientJoinedAt && <div>Patient: {new Date(c.patientJoinedAt).toLocaleTimeString()}</div>}
                    {!c.doctorJoinedAt && !c.patientJoinedAt && (
                      <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)' }}>Not yet connected</span>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                      <Clock size={13} color="var(--color-gold-bronze, #B88647)" />
                      <span>{formatDuration(c.durationSeconds)}</span>
                    </div>
                  </td>
                  <td>
                    {c.isInFlight ? (
                      <span className="badge-status badge-status-active">
                        <Radio size={12} style={{ animation: 'pulse 2s infinite', color: '#10b981' }} />
                        In Progress
                      </span>
                    ) : (
                      <span className="badge-status badge-status-neutral">
                        Concluded
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {totalPages > 1 && (
          <div
            style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.2))',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'rgba(240, 229, 211, 0.3)',
            }}
          >
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-secondary"
              style={{ padding: '6px 12px' }}
            >
              <ChevronLeft size={16} />
            </button>
            <span style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.85rem', fontWeight: 600 }}>
              Page {page} of {totalPages} ({total} total)
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
      </div>
    </div>
  );
}
