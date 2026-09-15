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
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Breadcrumbs } from '../../../components/Breadcrumbs';

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
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    let isMounted = true;

    async function loadBooking() {
      try {
        setIsLoading(true);
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
          body: JSON.stringify({ reason: cancelReason || 'Cancelled from booking details' }),
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

              {/* Cancellation & Policy */}
              <div
                style={{
                  background: '#ffffff',
                  borderRadius: '18px',
                  border: '1px solid var(--color-slate-200)',
                  padding: '24px',
                }}
              >
                <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-slate-900)', marginBottom: '10px' }}>
                  Cancellation & Refund Policy
                </h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--color-slate-500)', lineHeight: 1.5, marginBottom: '16px' }}>
                  You may cancel this appointment up to 2 hours prior to scheduled start time for a 100% refund. Refunds are instantly credited to your ChekUp247 platform wallet for convenient re-booking.
                </p>

                {booking.status === 'confirmed' && (
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.5)',
            backdropFilter: 'blur(4px)',
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
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '480px',
              width: '100%',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '12px' }}>
              Confirm Cancellation
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate-600)', marginBottom: '16px' }}>
              Are you sure you want to cancel your consultation with {booking?.doctor?.fullName}? Your slot will be reopened to other patients and a refund will be processed.
            </p>

            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                marginBottom: '20px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-300)',
                  background: '#ffffff',
                  cursor: 'pointer',
                }}
              >
                Go Back
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={isCancelling}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isCancelling ? 'Processing...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
