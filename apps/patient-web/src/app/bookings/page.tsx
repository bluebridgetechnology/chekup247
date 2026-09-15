'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  User,
  Filter,
  Plus,
  Loader2,
  ExternalLink,
  ChevronRight,
  Wallet,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export interface StitchedBooking {
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
    ratePerHour: number;
    avatarUrl?: string | null;
    facilityName?: string | null;
  };
  slot?: {
    id: string;
    startTime: string;
    endTime: string;
  };
}

export default function MyBookingsPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [bookings, setBookings] = useState<StitchedBooking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'past' | 'cancelled'>('upcoming');
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState<string>('');
  const [isCancelling, setIsCancelling] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  // Load Bookings
  const loadBookings = async () => {
    try {
      setIsLoading(true);
      if (token) {
        const res = await fetch(`${API_BASE}/bookings/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setBookings(data);
            return;
          }
        }
      }

      // Default mock bookings for preview and immediate testing
      const now = new Date();
      const inTwoHours = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      const inTwoHoursEnd = new Date(inTwoHours.getTime() + 45 * 60 * 1000);

      const pastDate = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const pastDateEnd = new Date(pastDate.getTime() + 45 * 60 * 1000);

      setBookings([
        {
          id: 'bk-demo-101',
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
            ratePerHour: 850.0,
            avatarUrl: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80',
            facilityName: 'Netcare Sunninghill Hospital Suites',
          },
          slot: {
            id: 'slot-101',
            startTime: inTwoHours.toISOString(),
            endTime: inTwoHoursEnd.toISOString(),
          },
        },
        {
          id: 'bk-demo-102',
          patient_id: user?.id || 'pat-1',
          doctor_id: 'doc-2',
          slot_id: 'slot-102',
          status: 'completed',
          price: 900.0,
          payment_status: 'released',
          created_at: pastDate.toISOString(),
          doctor: {
            id: 'doc-2',
            fullName: 'Dr. Sarah van der Merwe',
            specialty: 'Women’s Health & Primary Care',
            ratePerHour: 900.0,
            avatarUrl: 'https://images.unsplash.com/photo-1594824813501-48af52595a4b?auto=format&fit=crop&w=600&q=80',
            facilityName: 'Mediclinic Cape Town Medical Suites',
          },
          slot: {
            id: 'slot-102',
            startTime: pastDate.toISOString(),
            endTime: pastDateEnd.toISOString(),
          },
        },
      ]);
    } catch (e) {
      console.warn('Could not fetch bookings from API:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [token]);

  // Handle Booking Cancellation (BE-507)
  const handleConfirmCancel = async () => {
    if (!cancellingBookingId) return;

    setIsCancelling(true);
    try {
      if (token) {
        const res = await fetch(`${API_BASE}/bookings/${cancellingBookingId}/cancel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ reason: cancelReason || 'Patient cancelled via portal' }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || 'Failed to cancel booking');
        }
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) =>
          b.id === cancellingBookingId
            ? { ...b, status: 'cancelled', payment_status: 'refunded' }
            : b,
        ),
      );
      setCancellingBookingId(null);
      setCancelReason('');
    } catch (err: any) {
      alert(err.message || 'Could not cancel appointment');
    } finally {
      setIsCancelling(false);
    }
  };

  // Filter Bookings by Tab
  const filteredBookings = useMemo(() => {
    const now = Date.now();
    return bookings.filter((b) => {
      const isPastTime = b.slot?.startTime ? new Date(b.slot.startTime).getTime() < now : false;

      if (activeTab === 'cancelled') {
        return b.status === 'cancelled';
      }
      if (activeTab === 'past') {
        return b.status === 'completed' || (isPastTime && b.status !== 'cancelled');
      }
      // upcoming
      return (b.status === 'confirmed' || b.status === 'pending') && !isPastTime;
    });
  }, [bookings, activeTab]);

  // Helper to compute countdown text
  const getCountdownText = (startTime?: string) => {
    if (!startTime) return 'Upcoming';
    const diff = new Date(startTime).getTime() - Date.now();
    if (diff < 0) return 'Past Appointment';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const days = Math.floor(hours / 24);

    if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `Starts in ${hours} hr ${mins} min`;
    if (mins <= 5) return 'Ready to Join Now';
    return `Starts in ${mins} minutes`;
  };

  const isJoinActive = (startTime?: string) => {
    if (!startTime) return false;
    const diff = new Date(startTime).getTime() - Date.now();
    // Active 10 minutes prior to call up to 60 min after
    return diff <= 10 * 60 * 1000 && diff >= -60 * 60 * 1000;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-slate-50)', paddingBottom: '80px' }}>
      {/* Header */}
      <div style={{ background: '#ffffff', borderBottom: '1px solid var(--color-slate-200)', padding: '32px 0' }}>
        <div className="container" style={{ maxWidth: '1080px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                My Consultations
              </h1>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.925rem', marginTop: '4px' }}>
                Manage upcoming appointments, join video rooms, and access medical consultation history
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <Link
                href="/wallet"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: 'var(--color-slate-100)',
                  color: 'var(--color-slate-700)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                }}
              >
                <Wallet size={16} style={{ color: 'var(--color-brand-600)' }} />
                <span>My Wallet</span>
              </Link>

              <Link
                href="/doctors"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(13, 148, 136, 0.25)',
                }}
              >
                <Plus size={16} />
                <span>Book New Appointment</span>
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
              marginTop: '28px',
              borderBottom: '1px solid var(--color-slate-200)',
            }}
          >
            {(['upcoming', 'past', 'cancelled'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '10px 18px',
                  border: 'none',
                  background: 'none',
                  fontSize: '0.925rem',
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? 'var(--color-brand-600)' : 'var(--color-slate-500)',
                  borderBottom: activeTab === tab ? '2px solid var(--color-brand-600)' : '2px solid transparent',
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{tab}</span>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    background: activeTab === tab ? 'var(--color-brand-50)' : 'var(--color-slate-100)',
                    color: activeTab === tab ? 'var(--color-brand-700)' : 'var(--color-slate-600)',
                    fontWeight: 700,
                  }}
                >
                  {
                    bookings.filter((b) => {
                      const isPast = b.slot?.startTime ? new Date(b.slot.startTime).getTime() < Date.now() : false;
                      if (tab === 'cancelled') return b.status === 'cancelled';
                      if (tab === 'past') return b.status === 'completed' || (isPast && b.status !== 'cancelled');
                      return (b.status === 'confirmed' || b.status === 'pending') && !isPast;
                    }).length
                  }
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Bookings List Content */}
      <div className="container" style={{ maxWidth: '1080px', marginTop: '32px' }}>
        {isLoading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 0' }}>
            <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              border: '1px solid var(--color-slate-200)',
              padding: '56px 24px',
              textAlign: 'center',
            }}
          >
            <Calendar size={48} style={{ color: 'var(--color-slate-300)', margin: '0 auto 16px' }} />
            <h3 style={{ fontSize: '1.2rem', color: 'var(--color-slate-800)', fontWeight: 700 }}>
              No {activeTab} appointments found
            </h3>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', maxWidth: '420px', margin: '8px auto 24px' }}>
              {activeTab === 'upcoming'
                ? 'You have no scheduled consultations. Book an appointment with an HPCSA-verified doctor in minutes.'
                : `You do not have any ${activeTab} appointments recorded.`}
            </p>
            {activeTab === 'upcoming' && (
              <Link
                href="/doctors"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  textDecoration: 'none',
                }}
              >
                <span>Find an Available Doctor</span>
                <ArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredBookings.map((booking) => {
              const startIso = booking.slot?.startTime;
              const formattedDate = startIso
                ? new Date(startIso).toLocaleDateString('en-ZA', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })
                : 'Date Pending';
              const formattedTime = startIso
                ? `${new Date(startIso).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: false })} SAST`
                : '10:00 SAST';

              const countdown = getCountdownText(startIso);
              const joinReady = isJoinActive(startIso);

              return (
                <div
                  key={booking.id}
                  style={{
                    background: '#ffffff',
                    borderRadius: '18px',
                    border: '1px solid var(--color-slate-200)',
                    padding: '24px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.02)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '20px',
                  }}
                >
                  {/* Doctor Info & Schedule */}
                  <div style={{ display: 'flex', gap: '18px', alignItems: 'center', minWidth: '280px' }}>
                    <img
                      src={
                        booking.doctor?.avatarUrl ||
                        'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80'
                      }
                      alt={booking.doctor?.fullName || 'Doctor'}
                      style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '14px',
                        objectFit: 'cover',
                        border: '2px solid var(--color-brand-50)',
                      }}
                    />
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h3 style={{ fontSize: '1.15rem', color: 'var(--color-slate-900)', fontWeight: 700 }}>
                          {booking.doctor?.fullName || 'Dr. Medical Practitioner'}
                        </h3>
                        {booking.status === 'confirmed' && (
                          <span
                            style={{
                              background: '#ecfdf5',
                              color: '#065f46',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            CONFIRMED
                          </span>
                        )}
                        {booking.status === 'cancelled' && (
                          <span
                            style={{
                              background: '#fef2f2',
                              color: '#991b1b',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            CANCELLED
                          </span>
                        )}
                        {booking.status === 'completed' && (
                          <span
                            style={{
                              background: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                            }}
                          >
                            COMPLETED
                          </span>
                        )}
                      </div>

                      <div style={{ color: 'var(--color-brand-700)', fontSize: '0.85rem', fontWeight: 600, marginTop: '2px' }}>
                        {booking.doctor?.specialty || 'General Practitioner'}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '8px', fontSize: '0.825rem', color: 'var(--color-slate-600)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={15} style={{ color: 'var(--color-slate-400)' }} />
                          <span>{formattedDate}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Clock size={15} style={{ color: 'var(--color-slate-400)' }} />
                          <span>{formattedTime}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status & Countdown Pill */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '160px' }}>
                    {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: joinReady ? '#ecfdf5' : '#f0fdfa',
                          color: joinReady ? '#047857' : '#0f766e',
                          padding: '6px 12px',
                          borderRadius: '10px',
                          fontSize: '0.825rem',
                          fontWeight: 700,
                          border: `1px solid ${joinReady ? '#a7f3d0' : '#ccfbf1'}`,
                          width: 'fit-content',
                        }}
                      >
                        <Clock size={14} />
                        <span>{countdown}</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-400)' }}>
                      Fee: R{Number(booking.price).toFixed(2)} (ZAR) • {booking.payment_status}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {booking.status === 'confirmed' && (
                      <Link
                        href={`/consultation?booking=${booking.id}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '10px 18px',
                          borderRadius: '12px',
                          background: joinReady
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'var(--color-slate-100)',
                          color: joinReady ? '#ffffff' : 'var(--color-slate-600)',
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          textDecoration: 'none',
                          boxShadow: joinReady ? '0 4px 12px rgba(16, 185, 129, 0.3)' : 'none',
                          cursor: joinReady ? 'pointer' : 'default',
                        }}
                      >
                        <Video size={16} />
                        <span>{joinReady ? 'Join Video Room' : 'Join Link'}</span>
                      </Link>
                    )}

                    <Link
                      href={`/bookings/${booking.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        background: '#ffffff',
                        border: '1px solid var(--color-slate-300)',
                        color: 'var(--color-slate-700)',
                        fontWeight: 600,
                        fontSize: '0.875rem',
                        textDecoration: 'none',
                      }}
                    >
                      <span>Details</span>
                      <ChevronRight size={16} />
                    </Link>

                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => setCancellingBookingId(booking.id)}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '12px',
                          border: 'none',
                          background: 'none',
                          color: '#dc2626',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancellation Confirmation Modal */}
      {cancellingBookingId && (
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
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#dc2626', marginBottom: '12px' }}>
              <AlertCircle size={24} />
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                Cancel Consultation?
              </h3>
            </div>

            <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem', lineHeight: 1.5, marginBottom: '16px' }}>
              Are you sure you want to cancel this appointment? As per ChekUp247 policy, cancellations made more than 2 hours before the start time receive a 100% refund credited to your platform wallet or original payment method.
            </p>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
              Reason for Cancellation (Optional)
            </label>
            <textarea
              rows={2}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Schedule conflict, feeling better..."
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid var(--color-slate-300)',
                fontSize: '0.875rem',
                fontFamily: 'inherit',
                outline: 'none',
                marginBottom: '20px',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                onClick={() => setCancellingBookingId(null)}
                disabled={isCancelling}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-300)',
                  background: '#ffffff',
                  color: 'var(--color-slate-700)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Keep Appointment
              </button>

              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                style={{
                  padding: '10px 20px',
                  borderRadius: '10px',
                  border: 'none',
                  background: '#dc2626',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  cursor: isCancelling ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {isCancelling ? <Loader2 size={16} className="animate-spin" /> : null}
                <span>Confirm Cancellation</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
