'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Star,
  EyeOff,
  Eye,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  X,
  MessageSquare,
  ShieldAlert,
  Search,
  User,
  Stethoscope,
} from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

interface ReviewRow {
  id: string;
  bookingId: string;
  patientName: string;
  doctorName: string;
  rating: number;
  comment: string | null;
  isHidden: boolean;
  hiddenReason: string | null;
  createdAt: string;
}

interface ReviewSummary {
  total: number;
  visibleCount: number;
  hiddenCount: number;
  averageRating: number;
}

export default function ReviewModerationPage() {
  const router = useRouter();
  const { token, isAuthenticated, isLoading } = useAdminAuth();

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [summary, setSummary] = useState<ReviewSummary>({
    total: 0,
    visibleCount: 0,
    hiddenCount: 0,
    averageRating: 5.0,
  });
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [visibilityFilter, setVisibilityFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const [hideModalFor, setHideModalFor] = useState<ReviewRow | null>(null);
  const [hideReason, setHideReason] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const fetchReviews = useCallback(async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) {
      if (!isLoading) setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (visibilityFilter === 'visible') params.set('hidden', 'false');
      if (visibilityFilter === 'hidden') params.set('hidden', 'true');

      const res = await fetch(`${API_BASE}/admin/reviews?${params.toString()}`, {
        headers: { Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
        setTotal(data.total || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary) {
          setSummary(data.summary);
        } else {
          const revs = data.reviews || [];
          const vis = revs.filter((r: any) => !r.isHidden).length;
          const hid = revs.filter((r: any) => r.isHidden).length;
          const avg = revs.length > 0 ? revs.reduce((acc: number, r: any) => acc + (r.rating || 0), 0) / revs.length : 5;
          setSummary({
            total: data.total || 0,
            visibleCount: vis,
            hiddenCount: hid,
            averageRating: Number(avg.toFixed(1)),
          });
        }
      }
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, visibilityFilter, isLoading]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleUnhide = async (id: string) => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) return;

    setBusyId(id);
    try {
      const res = await fetch(`${API_BASE}/admin/reviews/${id}/hide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
        body: JSON.stringify({ hidden: false }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to unhide review');
      setFeedback({ type: 'success', message: 'Review restored to public doctor profile.' });
      fetchReviews();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  const submitHide = async () => {
    const tokenToUse = token || (typeof window !== 'undefined' ? localStorage.getItem('chekup_admin_token') : null);
    if (!tokenToUse) return;

    if (!hideModalFor || !hideReason.trim()) return;
    setBusyId(hideModalFor.id);
    try {
      const res = await fetch(`${API_BASE}/admin/reviews/${hideModalFor.id}/hide`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tokenToUse}` },
        credentials: 'include',
        body: JSON.stringify({ hidden: true, reason: hideReason }),
      });
      if (!res.ok) throw new Error((await res.json()).message || 'Failed to hide review');
      setFeedback({ type: 'success', message: 'Review hidden from doctor profile and logged.' });
      setHideModalFor(null);
      setHideReason('');
      fetchReviews();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message });
    } finally {
      setBusyId(null);
    }
  };

  // Client-side search and rating filter
  const filteredReviews = reviews.filter((r) => {
    if (ratingFilter !== 'all' && r.rating !== Number(ratingFilter)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchDoc = (r.doctorName || '').toLowerCase().includes(q);
      const matchPat = (r.patientName || '').toLowerCase().includes(q);
      const matchComment = (r.comment || '').toLowerCase().includes(q);
      return matchDoc || matchPat || matchComment;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px', color: '#201712' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
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
              <Star size={20} fill="#B98232" />
            </div>
            Review Moderation & Compliance
          </h1>
          <p className="page-subtitle" style={{ margin: 0 }}>
            Moderate patient reviews for clinical compliance, conduct standards, and transparency while maintaining audit logs.
          </p>
        </div>

        <button
          onClick={() => fetchReviews()}
          disabled={loading}
          className="btn-secondary"
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={14} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
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
            <span className="stat-label">Total Reviews</span>
            <MessageSquare size={18} color="#B98232" />
          </div>
          <div className="stat-number">{summary.total.toLocaleString()}</div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            All submitted patient ratings
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Platform Average</span>
            <Star size={18} fill="#B98232" color="#B98232" />
          </div>
          <div className="stat-number" style={{ color: '#B98232' }}>
            {summary.averageRating.toFixed(1)} / 5.0
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Across verified consultations
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Public / Visible</span>
            <Eye size={18} color="#0F8F72" />
          </div>
          <div className="stat-number" style={{ color: '#0F8F72' }}>
            {summary.visibleCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Active on doctor directory
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span className="stat-label">Flagged / Hidden</span>
            <EyeOff size={18} color="#B91C1C" />
          </div>
          <div className="stat-number" style={{ color: '#B91C1C' }}>
            {summary.hiddenCount.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#766C64', marginTop: '4px' }}>
            Excluded from rating calculations
          </div>
        </div>
      </div>

      {feedback && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: feedback.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            border: `1px solid ${feedback.type === 'success' ? '#86EFAC' : '#FECACA'}`,
            color: feedback.type === 'success' ? '#166534' : '#991B1B',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          {feedback.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
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
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by doctor, patient, or review comment..."
            className="admin-input"
            style={{ width: '100%', paddingLeft: '34px', fontSize: '0.825rem' }}
          />
        </div>

        {/* Visibility Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#766C64' }}>Visibility:</span>
          <div style={{ display: 'inline-flex', background: '#F8F5EF', padding: '2px', borderRadius: '6px', border: '1px solid #E9E0D5' }}>
            {[
              { id: 'all', label: 'All' },
              { id: 'visible', label: 'Public' },
              { id: 'hidden', label: 'Hidden' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setVisibilityFilter(tab.id as any);
                  setPage(1);
                }}
                style={{
                  border: 'none',
                  background: visibilityFilter === tab.id ? '#2B170F' : 'transparent',
                  color: visibilityFilter === tab.id ? '#ECC27E' : '#766C64',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  padding: '4px 10px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Rating Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#766C64' }}>Score:</span>
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(e.target.value)}
            className="admin-select"
            style={{ fontSize: '0.825rem' }}
          >
            <option value="all">All Stars</option>
            <option value="5">5 Stars (★★★★★)</option>
            <option value="4">4 Stars (★★★★)</option>
            <option value="3">3 Stars (★★★)</option>
            <option value="2">2 Stars (★★)</option>
            <option value="1">1 Star (★)</option>
          </select>
        </div>
      </div>

      {/* Reviews Table Container */}
      <div className="admin-table-container">
        {loading ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px auto' }} />
            <div>Loading review ledger…</div>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div style={{ padding: '60px 24px', textAlign: 'center', color: '#766C64' }}>
            <Star size={36} color="#B98232" style={{ margin: '0 auto 12px auto', opacity: 0.6 }} />
            <div style={{ fontWeight: 600, color: '#201712', marginBottom: '4px' }}>No reviews found</div>
            <div style={{ fontSize: '0.85rem' }}>No reviews match the selected filter criteria.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Attending Doctor</th>
                  <th>Patient</th>
                  <th>Rating</th>
                  <th>Feedback Comment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredReviews.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: '#FAF5EB',
                            color: '#B98232',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                          }}
                        >
                          <Stethoscope size={14} />
                        </div>
                        <span style={{ fontWeight: 700, color: '#201712' }}>{r.doctorName}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#766C64', fontSize: '0.825rem' }}>
                        <User size={13} />
                        <span>{r.patientName}</span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= r.rating ? '#B98232' : 'none'}
                              color={s <= r.rating ? '#B98232' : '#D1D5DB'}
                            />
                          ))}
                        </div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#201712', marginLeft: '4px' }}>
                          {r.rating}.0
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: '340px' }}>
                      <p style={{ margin: 0, fontSize: '0.825rem', color: '#201712', lineHeight: 1.4 }}>
                        {r.comment ? `"${r.comment}"` : <span style={{ color: '#766C64', fontStyle: 'italic' }}>No written feedback provided</span>}
                      </p>
                      {r.isHidden && r.hiddenReason && (
                        <div style={{ fontSize: '0.72rem', color: '#B91C1C', marginTop: '4px', fontWeight: 600 }}>
                          Reason: {r.hiddenReason}
                        </div>
                      )}
                    </td>
                    <td>
                      {r.isHidden ? (
                        <span className="badge-status-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <EyeOff size={11} /> Hidden
                        </span>
                      ) : (
                        <span className="badge-status-completed" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Eye size={11} /> Visible
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#766C64', whiteSpace: 'nowrap' }}>
                      {new Date(r.createdAt).toLocaleDateString('en-ZA')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {r.isHidden ? (
                        <button
                          onClick={() => handleUnhide(r.id)}
                          disabled={busyId === r.id}
                          className="btn-secondary"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                          <Eye size={12} />
                          <span>{busyId === r.id ? 'Restoring...' : 'Restore'}</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setHideModalFor(r)}
                          disabled={busyId === r.id}
                          className="btn-secondary"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.75rem',
                            padding: '4px 10px',
                            color: '#B91C1C',
                            borderColor: '#FECACA',
                          }}
                        >
                          <EyeOff size={12} />
                          <span>Hide</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
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
            Page {page} of {totalPages} ({total} entries)
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

      {/* Hide Review Modal */}
      {hideModalFor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(32, 23, 18, 0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '16px',
          }}
        >
          <div
            className="admin-card"
            style={{
              background: '#FFFFFF',
              width: '100%',
              maxWidth: '460px',
              padding: '24px',
              borderRadius: '12px',
              border: '1px solid #E9E0D5',
              boxShadow: '0 20px 40px rgba(32, 23, 18, 0.15)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#B91C1C',
                  }}
                >
                  <ShieldAlert size={18} />
                </div>
                <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#201712', margin: 0 }}>
                  Hide Review from Profile
                </h2>
              </div>
              <button
                onClick={() => setHideModalFor(null)}
                style={{ background: 'transparent', border: 'none', color: '#766C64', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.825rem', color: '#766C64', lineHeight: 1.5, marginBottom: '16px' }}>
              Hiding this review will remove it from <strong>{hideModalFor.doctorName}</strong>&apos;s public doctor directory and recalculate their aggregate rating score.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#201712', marginBottom: '6px' }}>
                Compliance & Moderation Reason
              </label>
              <textarea
                value={hideReason}
                onChange={(e) => setHideReason(e.target.value)}
                rows={3}
                placeholder="Specify the reason (e.g. Hate speech, personally identifiable medical data, harassment)..."
                className="admin-input"
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setHideModalFor(null)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitHide}
                disabled={!hideReason.trim() || busyId === hideModalFor.id}
                className="btn-primary"
                style={{ background: '#B91C1C', borderColor: '#B91C1C', color: '#FFFFFF' }}
              >
                {busyId === hideModalFor.id ? 'Hiding Review...' : 'Confirm & Hide'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
