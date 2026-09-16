'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  ShieldCheck,
  CreditCard,
  Download,
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileText,
  User,
  Building,
  Loader2,
  Wallet,
  Star,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { RescheduleModal } from '../../../components/RescheduleModal';
import { ReviewModal } from '../../../components/ReviewModal';

interface BookingDetail {
  id: string;
  patient_id: string;
  doctor_id: string;
  slot_id: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  price: number;
  payment_status: 'unpaid' | 'held' | 'released' | 'refunded';
  created_at: string;
  doctor?: {
    id: string;
    fullName: string;
    specialty: string;
    hpcsaNumber: string;
    ratePerHour: number;
    avatarUrl?: string | null;
    facilityName?: string | null;
    facilityAddress?: string | null;
  };
  slot?: {
    id: string;
    startTime: string;
    endTime: string;
  };
  payment?: {
    id: string;
    amount: number;
    provider: string;
    provider_ref: string;
    status: string;
    created_at: string;
  } | null;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const bookingId = params?.id as string;

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showCancelModal, setShowCancelModal] = useState<boolean>(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState<boolean>(false);
  const [existingReview, setExistingReview] = useState<any | null>(null);
  const [refundAction, setRefundAction] = useState<'credit' | 'refund'>('credit');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    let isMounted = true;

    async function loadBooking() {
      try {
        setIsLoading(true);
        if (bookingId) {
          try {
            const revRes = await fetch(`${API_BASE}/reviews/booking/${bookingId}`);
            if (revRes.ok) {
              const revData = await revRes.json();
              if (isMounted && revData && revData.id) {
                setExistingReview(revData);
              }
            }
          } catch (e) {}
        }

        if (bookingId && token) {
          const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setBooking(data);
              return;
            }
          }
        }

        // Mock fallback for testing
        if (isMounted) {
          const now = new Date();
          const start = new Date(now.getTime() + 2 * 60 * 60 * 1000);
          const end = new Date(start.getTime() + 45 * 60 * 1000);

          setBooking({
            id: bookingId || 'bk-demo-101',
            patient_id: user?.id || 'pat-1',
            doctor_id: 'doc-1',
            slot_id: 'slot-101',
            status: 'confirmed',
            price: 850.0,
            payment_status: 'held',
            created_at: new Date().toISOString(),
            doctor: {
              id: 'doc-1',
              fullName: 'Dr. Thabo Molefe',
              specialty: 'General Practitioner & Family Health',
              hpcsaNumber: 'MP 0689432',
              ratePerHour: 850.0,
              avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
              facilityName: 'Netcare Sunninghill Hospital Suites',
              facilityAddress: 'Cnr Witkoppen & Nanyuki Rd, Sunninghill, Sandton, 2157',
            },
            slot: {
              id: 'slot-101',
              startTime: start.toISOString(),
              endTime: end.toISOString(),
            },
            payment: {
              id: 'pay-101',
              amount: 850.0,
              provider: 'paystack',
              provider_ref: 'chk_ref_984321',
              status: 'success',
              created_at: new Date().toISOString(),
            },
          });
        }
      } catch (err) {
        console.warn('Could not load booking details:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadBooking();
    return () => {
      isMounted = false;
    };
  }, [bookingId, token, API_BASE]);

  const handleCancelBooking = async () => {
    if (!booking) return;

    setIsCancelling(true);
    try {
      if (token) {
        const res = await fetch(`${API_BASE}/bookings/${booking.id}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            reason: cancelReason || 'Cancelled by patient',
            action: refundAction,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Cancellation failed');
        }
      }

      setBooking((prev) =>
        prev ? { ...prev, status: 'cancelled', payment_status: 'refunded' } : null,
      );
      setShowCancelModal(false);
    } catch (err: any) {
      alert(err.message || 'Error cancelling booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const startIso = booking?.slot?.startTime;
  const formattedDate = startIso
    ? new Date(startIso).toLocaleDateString('en-ZA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'Upcoming Consultation';

  const formattedTime = startIso
    ? `${new Date(startIso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })} – ${new Date(booking?.slot?.endTime || startIso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })} SAST`
    : '10:00 – 10:45 SAST';

  const isJoinActive = () => {
    if (!startIso) return false;
    const diff = new Date(startIso).getTime() - Date.now();
    return diff <= 10 * 60 * 1000 && diff >= -60 * 60 * 1000;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-slate-50)', paddingBottom: '80px' }}>
      {/* Top Bar */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid var(--color-slate-200)', padding: '24px 0' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          <Breadcrumbs
            items={[
              { label: 'My Bookings', href: '/bookings' },
              { label: `Booking #${bookingId?.substring(0, 8) || 'Details'}` },
            ]}
          />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '12px',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                Consultation Details
              </h1>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.875rem', marginTop: '2px' }}>
                Booking ID: <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{booking?.id}</span>
              </p>
            </div>

            {booking && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.825rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    background:
                      booking.status === 'confirmed'
                        ? '#ecfdf5'
                        : booking.status === 'cancelled'
                        ? '#fef2f2'
                        : '#f1f5f9',
                    color:
                      booking.status === 'confirmed'
                        ? '#065f46'
                        : booking.status === 'cancelled'
                        ? '#991b1b'
                        : '#334155',
                    border: `1px solid ${
                      booking.status === 'confirmed'
                        ? '#a7f3d0'
                        : booking.status === 'cancelled'
                        ? '#fecaca'
                        : '#cbd5e1'
                    }`,
                  }}
                >
                  {booking.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1000px', marginTop: '32px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
          </div>
        ) : !booking ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              padding: '48px',
              textAlign: 'center',
              border: '1px solid var(--color-slate-200)',
            }}
          >
            <AlertCircle size={40} style={{ color: '#dc2626', margin: '0 auto 12px' }} />
            <h3>Booking Not Found</h3>
            <Link href="/bookings" style={{ color: 'var(--color-brand-600)', marginTop: '12px', display: 'inline-block' }}>
              Return to My Bookings
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {/* LEFT COLUMN: Doctor & Schedule & Video Call */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Video Room Launch Card */}
              {booking.status === 'confirmed' && (
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)',
                    borderRadius: '20px',
                    padding: '28px',
                    color: '#ffffff',
                    boxShadow: '0 8px 24px rgba(13, 148, 136, 0.3)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <Video size={22} />
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Virtual Video Consultation</h3>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: '#ccfbf1', marginBottom: '20px' }}>
                    Connect directly to the encrypted high-definition video room. Video and audio encryption are enabled end-to-end.
                  </p>

                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Link
                      href={`/consultations/${booking.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: 'var(--color-brand-800)',
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        textDecoration: 'none',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                      <Video size={18} />
                      <span>{isJoinActive() ? 'Join Video Room Now' : 'Enter Consultation Room'}</span>
                    </Link>

                    <span style={{ fontSize: '0.8rem', color: '#ccfbf1' }}>
                      {isJoinActive() ? 'Doctor is ready' : 'Room opens 10 min prior'}
                    </span>
                  </div>
                </div>
              )}

              {/* Doctor Details */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid var(--color-slate-200)',
                  padding: '24px',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '16px' }}>
                  Doctor Details
                </h3>

                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  <img
                    src={booking.doctor?.avatarUrl || 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80'}
                    alt={booking.doctor?.fullName || 'Doctor'}
                    style={{
                      width: '72px',
                      height: '72px',
                      borderRadius: '14px',
                      objectFit: 'cover',
                      border: '2px solid var(--color-brand-100)',
                    }}
                  />
                  <div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                      {booking.doctor?.fullName || 'Dr. Medical Practitioner'}
                    </div>
                    <div style={{ color: 'var(--color-brand-700)', fontWeight: 600, fontSize: '0.9rem' }}>
                      {booking.doctor?.specialty || 'General Practitioner'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', marginTop: '4px' }}>
                      HPCSA Registration: {booking.doctor?.hpcsaNumber || 'MP 0689432'}
                    </div>
                  </div>
                </div>

                {booking.doctor?.facilityName && (
                  <div
                    style={{
                      marginTop: '16px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--color-slate-100)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.85rem',
                      color: 'var(--color-slate-600)',
                    }}
                  >
                    <Building size={16} style={{ color: 'var(--color-slate-400)' }} />
                    <span>{booking.doctor.facilityName} ({booking.doctor.facilityAddress})</span>
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid var(--color-slate-200)',
                  padding: '24px',
                }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '16px' }}>
                  Appointment Schedule
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ background: 'var(--color-slate-50)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-400)', textTransform: 'uppercase' }}>
                      Date
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--color-slate-900)', marginTop: '4px' }}>
                      {formattedDate}
                    </div>
                  </div>

                  <div style={{ background: 'var(--color-slate-50)', padding: '14px', borderRadius: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-slate-400)', textTransform: 'uppercase' }}>
                      Time Window
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '0.925rem', color: 'var(--color-slate-900)', marginTop: '4px' }}>
                      {formattedTime}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Payment Receipt & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Receipt Box */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid var(--color-slate-200)',
                  padding: '24px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                  <CreditCard size={18} style={{ color: 'var(--color-brand-600)' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--color-slate-900)' }}>
                    Payment Receipt
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate-600)' }}>
                    <span>Consultation Charge</span>
                    <span style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      R{Number(booking.price).toFixed(2)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-slate-600)' }}>
                    <span>Platform Fee</span>
                    <span style={{ color: '#059669', fontWeight: 600 }}>R0.00 (Included)</span>
                  </div>

                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--color-slate-100)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      color: 'var(--color-slate-900)',
                    }}
                  >
                    <span>Total Paid:</span>
                    <span style={{ color: 'var(--color-brand-700)' }}>
                      R{Number(booking.price).toFixed(2)} (ZAR)
                    </span>
                  </div>

                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      background: 'var(--color-slate-50)',
                      fontSize: '0.8rem',
                      color: 'var(--color-slate-600)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div>
                      <strong>Provider:</strong> {booking.payment?.provider || 'Paystack ZAR Gateway'}
                    </div>
                    <div>
                      <strong>Reference:</strong>{' '}
                      <span style={{ fontFamily: 'monospace' }}>
                        {booking.payment?.provider_ref || 'chk_ref_' + booking.id.substring(0, 8)}
                      </span>
                    </div>
                    <div>
                      <strong>Status:</strong>{' '}
                      <span style={{ color: '#059669', fontWeight: 600 }}>
                        {booking.payment_status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PA-901: Post-Consultation Rating & Review Section */}
              {booking.status === 'completed' && (
                <div
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: '1px solid var(--color-slate-200)',
                    padding: '24px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <h3
                      style={{
                        fontSize: '1.05rem',
                        fontWeight: 700,
                        color: 'var(--color-slate-900)',
                        margin: 0,
                      }}
                    >
                      Consultation Feedback
                    </h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        background: existingReview ? '#ecfdf5' : 'rgba(14, 147, 132, 0.1)',
                        color: existingReview ? '#059669' : 'var(--color-brand-700)',
                      }}
                    >
                      {existingReview ? 'Review Submitted' : 'Feedback Pending'}
                    </span>
                  </div>

                  {existingReview ? (
                    <div
                      style={{
                        padding: '16px',
                        background: 'var(--color-slate-50)',
                        borderRadius: '12px',
                        border: '1px solid var(--color-slate-200)',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', gap: '3px' }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star
                              key={s}
                              size={16}
                              style={{
                                fill: s <= existingReview.rating ? '#f59e0b' : 'transparent',
                                color: s <= existingReview.rating ? '#f59e0b' : 'var(--color-slate-300)',
                              }}
                            />
                          ))}
                        </div>
                        <span
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            color: 'var(--color-slate-700)',
                          }}
                        >
                          {existingReview.rating} / 5.0
                        </span>
                      </div>
                      {existingReview.comment && (
                        <p
                          style={{
                            fontSize: '0.875rem',
                            color: 'var(--color-slate-700)',
                            margin: '6px 0 0',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-line',
                          }}
                        >
                          "{existingReview.comment}"
                        </p>
                      )}
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--color-slate-400)',
                          marginTop: '8px',
                        }}
                      >
                        Verified patient review recorded on{' '}
                        {new Date(existingReview.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--color-slate-500)',
                          lineHeight: 1.5,
                          marginBottom: '16px',
                        }}
                      >
                        Your consultation is complete. How was your experience with{' '}
                        {booking.doctor?.fullName || 'the practitioner'}? Please share your
                        rating and comments to help other patients.
                      </p>
                      <button
                        onClick={() => setShowReviewModal(true)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '12px',
                          border: 'none',
                          background: 'var(--color-brand-600)',
                          color: '#ffffff',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          boxShadow: '0 4px 12px rgba(14, 147, 132, 0.25)',
                        }}
                      >
                        <Star size={16} style={{ fill: '#ffffff' }} />
                        <span>Rate & Review Doctor</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Cancellation & Reschedule Engine (PA-801, PA-802) */}
              {booking.status === 'confirmed' && (() => {
                const slotStart = booking.slot?.startTime ? new Date(booking.slot.startTime) : null;
                const now = new Date();
                const hoursUntil = slotStart ? (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;
                const isOver24h = hoursUntil >= 24;
                const lateDeductionPercent = 30;
                const price = Number(booking.price || 0);
                const deductionAmount = Math.round(price * (lateDeductionPercent / 100) * 100) / 100;
                const remainderAmount = Math.max(0, price - deductionAmount);

                return (
                  <div
                    style={{
                      background: '#ffffff',
                      borderRadius: '18px',
                      border: '1px solid var(--color-slate-200)',
                      padding: '24px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-slate-900)', margin: 0 }}>
                        Cancellation & Rescheduling
                      </h3>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '8px',
                          background: isOver24h ? '#ecfdf5' : '#fffbeb',
                          color: isOver24h ? '#059669' : '#d97706',
                          border: isOver24h ? '1px solid #a7f3d0' : '1px solid #fde68a',
                        }}
                      >
                        {isOver24h ? '≥ 24h Window (No Penalty)' : '< 24h Window (30% Late Fee)'}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', lineHeight: 1.5, marginBottom: '16px' }}>
                      {isOver24h
                        ? 'Your consultation is at least 24 hours away. You can reschedule to another available slot on this doctor’s calendar for free, or cancel for a 100% full refund.'
                        : 'Short-notice cancellations within 24 hours allocate a 30% deduction fee to the consulting doctor. The remaining 70% is refunded to your card or wallet credits.'}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {isOver24h && (
                        <button
                          onClick={() => setShowRescheduleModal(true)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '12px',
                            border: 'none',
                            background: 'var(--color-brand-600)',
                            color: '#ffffff',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            transition: 'all 0.2s',
                          }}
                        >
                          <Calendar size={16} />
                          <span>Reschedule Consultation (Free)</span>
                        </button>
                      )}

                      <button
                        onClick={() => setShowCancelModal(true)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          borderRadius: '12px',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#dc2626',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                      >
                        Cancel This Consultation
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* PA-801: Dynamic Cancellation Modal */}
      {showCancelModal && booking && (() => {
        const slotStart = booking.slot?.startTime ? new Date(booking.slot.startTime) : null;
        const now = new Date();
        const hoursUntil = slotStart ? (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60) : 0;
        const isOver24h = hoursUntil >= 24;
        const lateDeductionPercent = 30;
        const price = Number(booking.price || 0);
        const deductionAmount = Math.round(price * (lateDeductionPercent / 100) * 100) / 100;
        const remainderAmount = Math.max(0, price - deductionAmount);

        return (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(15, 23, 42, 0.65)',
              backdropFilter: 'blur(6px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100,
              padding: '16px',
            }}
          >
            <div
              style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '32px',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <AlertCircle size={22} color={isOver24h ? '#059669' : '#dc2626'} />
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-slate-900)', margin: 0 }}>
                  Confirm Cancellation
                </h3>
              </div>

              {/* Status Alert Banner */}
              <div
                style={{
                  background: isOver24h ? '#ecfdf5' : '#fffbeb',
                  border: isOver24h ? '1px solid #a7f3d0' : '1px solid #fde68a',
                  color: isOver24h ? '#065f46' : '#92400e',
                  padding: '12px 16px',
                  borderRadius: '12px',
                  fontSize: '0.875rem',
                  margin: '16px 0',
                }}
              >
                {isOver24h ? (
                  <div>
                    <strong>Full Refund Eligible (≥ 24 Hours Away):</strong> Your appointment is scheduled for{' '}
                    {booking.slot?.startTime ? new Date(booking.slot.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' }) : 'later'}.
                    You will receive 100% of your R{price.toFixed(2)} payment.
                  </div>
                ) : (
                  <div>
                    <strong>Short-Notice Cancellation (&lt; 24 Hours Away):</strong>
                    <div style={{ marginTop: '4px', fontSize: '0.825rem' }}>
                      Per policy, a 30% doctor reservation fee (<strong>R{deductionAmount.toFixed(2)}</strong>) will be allocated to Dr. {booking.doctor?.fullName}.
                      The remaining 70% (<strong>R{remainderAmount.toFixed(2)}</strong>) is refunded to you.
                    </div>
                  </div>
                )}
              </div>

              {/* Refund Method Radio Selection */}
              <div style={{ margin: '18px 0' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-slate-700)', display: 'block', marginBottom: '10px' }}>
                  Choose Your Refund Preference:
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: refundAction === 'credit' ? '2px solid var(--color-brand-600)' : '1px solid var(--color-slate-200)',
                      background: refundAction === 'credit' ? 'var(--color-brand-50)' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="refundAction"
                      value="credit"
                      checked={refundAction === 'credit'}
                      onChange={() => setRefundAction('credit')}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                        Platform Wallet Credit (R{(isOver24h ? price : remainderAmount).toFixed(2)})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                        Instant credit, never expires, automatically usable on future bookings.
                      </div>
                    </div>
                  </label>

                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: refundAction === 'refund' ? '2px solid var(--color-brand-600)' : '1px solid var(--color-slate-200)',
                      background: refundAction === 'refund' ? 'var(--color-brand-50)' : '#ffffff',
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="radio"
                      name="refundAction"
                      value="refund"
                      checked={refundAction === 'refund'}
                      onChange={() => setRefundAction('refund')}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--color-slate-900)' }}>
                        Original Payment Card (R{(isOver24h ? price : remainderAmount).toFixed(2)})
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-slate-500)' }}>
                        Processed via Paystack back to your bank card within 3–5 business days.
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Optional reason */}
              <textarea
                rows={2}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (optional)"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-300)',
                  fontSize: '0.875rem',
                  marginBottom: '20px',
                  boxSizing: 'border-box',
                }}
              />

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setShowCancelModal(false)}
                  disabled={isCancelling}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '10px',
                    border: '1px solid var(--color-slate-300)',
                    background: '#ffffff',
                    color: 'var(--color-slate-700)',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Keep Appointment
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={isCancelling}
                  style={{
                    padding: '10px 22px',
                    borderRadius: '10px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {isCancelling ? 'Processing Cancellation...' : 'Confirm Cancellation'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* PA-802: Reschedule Calendar Modal */}
      {showRescheduleModal && booking && (
        <RescheduleModal
          isOpen={showRescheduleModal}
          onClose={() => setShowRescheduleModal(false)}
          bookingId={booking.id}
          doctorId={booking.doctor_id}
          doctorName={booking.doctor?.fullName}
          currentSlotTime={booking.slot?.startTime}
          token={token}
          onRescheduleSuccess={(updatedBooking) => {
            setBooking(updatedBooking);
            setShowRescheduleModal(false);
          }}
        />
      )}

      {/* PA-901: Post-Consultation Rating & Review Modal */}
      {showReviewModal && booking && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          bookingId={booking.id}
          doctorName={booking.doctor?.fullName}
          doctorSpecialty={booking.doctor?.specialty}
          doctorAvatar={booking.doctor?.avatarUrl || undefined}
          token={token}
          onReviewSubmitted={(saved) => {
            setExistingReview(saved);
            setShowReviewModal(false);
          }}
        />
      )}
    </div>
  );
}
