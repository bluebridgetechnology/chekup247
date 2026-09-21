'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  FileText,
  DollarSign,
  UserCheck,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useDoctorAuth } from '../context/DoctorAuthContext';
import { SolarIcon } from '../components/common/SolarIcon';

export default function DoctorDashboardPage() {
  const { doctor, profile, token, isPendingVerification, isAuthenticated, toggleHolidayMode } = useDoctorAuth();

  const [appointments, setAppointments] = useState<any[]>([]);
  const [earnings, setEarnings] = useState<any | null>(null);
  const [prescriptionsCount, setPrescriptionsCount] = useState<number>(0);
  const [slots, setSlots] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [now, setNow] = useState<number>(Date.now());

  const doctorName = doctor?.fullName || 'Dr. Practitioner';
  const isVerified = profile?.verificationStatus === 'verified';

  // Time-of-day greeting (recomputes with the live clock tick)
  const greeting = useMemo(() => {
    const h = new Date(now).getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  }, [now]);

  // Live 1-minute tick so countdowns stay fresh without a refetch
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let isMounted = true;
    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

    async function loadDashboardData() {
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const [bookingsRes, earningsRes, rxRes, availRes] = await Promise.all([
          fetch(`${apiBase}/bookings/doctor`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch(`${apiBase}/doctors/me/earnings`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch(`${apiBase}/prescriptions`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch(`${apiBase}/doctors/me/availability`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
        ]);

        if (bookingsRes && bookingsRes.ok) {
          const bData = await bookingsRes.json();
          if (isMounted && Array.isArray(bData)) setAppointments(bData);
        }

        if (earningsRes && earningsRes.ok) {
          const eData = await earningsRes.json();
          if (isMounted) setEarnings(eData);
        }

        if (rxRes && rxRes.ok) {
          const rxData = await rxRes.json();
          if (isMounted && Array.isArray(rxData)) setPrescriptionsCount(rxData.length);
        }

        if (availRes && availRes.ok) {
          const aData = await availRes.json();
          if (isMounted && Array.isArray(aData?.slots)) setSlots(aData.slots);
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [token]);

  const todayStr = new Date().toDateString();

  const todayBookings = useMemo(() => {
    return appointments.filter((b) => {
      const bDate = b.slot?.startTime ? new Date(b.slot.startTime).toDateString() : '';
      return bDate === todayStr && b.status !== 'cancelled';
    });
  }, [appointments, todayStr]);

  const upcomingBookings = useMemo(() => {
    const nowMs = Date.now();
    return appointments
      .filter((b) => {
        if (b.status === 'cancelled' || b.status === 'completed') return false;
        const startMs = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
        return startMs > nowMs - 30 * 60 * 1000;
      })
      .sort((a, b) => {
        const timeA = a.slot?.startTime ? new Date(a.slot.startTime).getTime() : 0;
        const timeB = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
        return timeA - timeB;
      });
  }, [appointments]);

  const nextBooking = upcomingBookings[0] || null;
  const nextBookingMinutes = useMemo(() => {
    if (!nextBooking?.slot?.startTime) return null;
    const diffMins = Math.round(
      (new Date(nextBooking.slot.startTime).getTime() - now) / 60000,
    );
    return diffMins;
  }, [nextBooking, now]);

  // Join window: room joinable from 10 min before start until 30 min after
  const nextBookingJoinable =
    nextBookingMinutes !== null && nextBookingMinutes <= 10 && nextBookingMinutes >= -30;

  // Remaining consultations today (not yet completed/cancelled, still ahead or in progress)
  // This-week window (Mon 00:00 → Sun 23:59, local)
  const weekStats = useMemo(() => {
    const d = new Date(now);
    const day = (d.getDay() + 6) % 7; // 0 = Monday
    const weekStart = new Date(d);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(d.getDate() - day);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    const inWeek = (iso?: string) => {
      if (!iso) return false;
      const t = new Date(iso).getTime();
      return t >= weekStart.getTime() && t < weekEnd.getTime();
    };

    const weekBookings = appointments.filter((b) => inWeek(b.slot?.startTime) && b.status !== 'cancelled');
    const completedThisWeek = weekBookings.filter((b) => b.status === 'completed').length;

    const openSlotsThisWeek = slots.filter((s) => !s.isBooked && inWeek(s.startTime)).length;
    const futureOpenSlots = slots.filter(
      (s) => !s.isBooked && s.startTime && new Date(s.startTime).getTime() > now,
    ).length;

    return {
      consultationsThisWeek: weekBookings.length,
      completedThisWeek,
      openSlotsThisWeek,
      futureOpenSlots,
    };
  }, [appointments, slots, now]);

  // Requires-attention items
  const attentionItems = useMemo(() => {
    const items: Array<{ id: string; icon: string; label: string; sub: string; href: string; tone: 'warn' | 'info' }> = [];

    const pendingConfirmations = appointments.filter((b) => b.status === 'pending');
    if (pendingConfirmations.length > 0) {
      items.push({
        id: 'pending',
        icon: 'clock-circle-linear',
        label: `${pendingConfirmations.length} booking${pendingConfirmations.length > 1 ? 's' : ''} awaiting confirmation`,
        sub: 'Review and confirm pending patient requests',
        href: '/appointments',
        tone: 'warn',
      });
    }

    // Completed consultations without an issued script yet (clinical follow-up proxy)
    const completedCount = appointments.filter((b) => b.status === 'completed').length;
    const notesOutstanding = Math.max(0, completedCount - prescriptionsCount);
    if (notesOutstanding > 0) {
      items.push({
        id: 'notes',
        icon: 'document-text-linear',
        label: `${notesOutstanding} consultation${notesOutstanding > 1 ? 's' : ''} may need clinical notes or a script`,
        sub: 'Finalize records to stay HPCSA-compliant',
        href: '/prescriptions',
        tone: 'warn',
      });
    }

    // Profile completeness nudge
    const missing: string[] = [];
    if (!doctor?.avatarUrl) missing.push('profile photo');
    if (!profile?.bio) missing.push('bio');
    if (!profile?.signatureUrl) missing.push('e-signature');
    if (missing.length > 0 && !isPendingVerification) {
      items.push({
        id: 'profile',
        icon: 'user-circle-linear',
        label: 'Complete your practice profile',
        sub: `Add your ${missing.join(', ')} to boost patient trust`,
        href: '/profile',
        tone: 'info',
      });
    }

    return items;
  }, [appointments, prescriptionsCount, doctor?.avatarUrl, profile?.bio, profile?.signatureUrl, isPendingVerification]);

  const ratingAvg = profile?.ratingAvg || 0;
  const availableBalance = earnings?.summary?.availableBalance ?? 0;
  const heldBalance = Math.max(0, (earnings?.summary?.totalNet ?? 0) - (earnings?.summary?.totalPaidOut ?? 0) - availableBalance);
  const nextPayoutDate = earnings?.summary?.nextPayoutDate
    ? new Date(earnings.summary.nextPayoutDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
    : null;

  // Format a compact "starts in" / "live" label
  const nextStartsLabel = useMemo(() => {
    if (nextBookingMinutes === null) return '';
    if (nextBookingMinutes <= 0) return 'In progress now';
    if (nextBookingMinutes < 60) return `Starts in ${nextBookingMinutes} min`;
    const hrs = Math.floor(nextBookingMinutes / 60);
    const mins = nextBookingMinutes % 60;
    return `Starts in ${hrs}h ${mins}m`;
  }, [nextBookingMinutes]);

  /* ──────────────────────────────────────────────────────────────────────────
     Today's Schedule summary — shared between mobile card and sidebar card
     ────────────────────────────────────────────────────────────────────────── */
  const scheduleCard = (
    <div className="kpi-card" style={{ padding: '18px 22px' }}>
      <div
        style={{
          fontSize: '0.72rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--color-cream-text-muted, #6B5E55)',
          marginBottom: '12px',
        }}
      >
        Today&apos;s Schedule
      </div>
      <div className="schedule-summary-grid">
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div className="stat-number" style={{ fontSize: '1.65rem', marginBottom: '2px' }}>
            {todayBookings.length}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 500 }}>
            Appointments
          </div>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 0', borderLeft: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))' }}>
          <div className="stat-number" style={{ fontSize: '1.65rem', marginBottom: '2px' }}>
            {String(weekStats.openSlotsThisWeek).padStart(2, '0')}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 500 }}>
            Available Slots
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* ═══════════════════════════════════════════════════════════════════
          Welcome Banner
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="welcome-banner"
        style={{
          background: 'linear-gradient(120deg, var(--color-gold-glow, rgba(223, 171, 98, 0.14)) 0%, var(--color-cream-surface, #FDFBF7) 70%)',
          border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
          borderRadius: '20px',
          padding: '24px 26px',
          marginBottom: '28px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                }}
              >
                Doctor Practice Portal • ChekUp247
              </span>
              <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-gold-base)' }} />
              <span style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted)' }}>
                SAST {new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <h1 className="page-title">
              {greeting}, {doctorName} 👋
            </h1>
            <p className="page-subtitle">
              {isPendingVerification
                ? 'Your medical credentials are under expedited governance audit by the ChekUp247 clinical board.'
                : "Here's what's happening with your practice today."}
            </p>
          </div>

        </div>

        {/* Action buttons row */}
        <div className="welcome-actions" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Link href="/appointments" className="btn-primary">
            <SolarIcon name="calendar-linear" size={17} color="var(--color-chocolate-base, #2A170F)" />
            <span>View Appointments</span>
          </Link>
          <Link href="/prescriptions/new" className="btn-secondary">
            <SolarIcon name="document-text-linear" size={17} color="var(--color-chocolate-base, #2A170F)" />
            <span>Write E-Prescription</span>
          </Link>
          <Link href="/icd10" className="btn-secondary">
            <SolarIcon name="magnifer-linear" size={17} color="var(--color-chocolate-base, #2A170F)" />
            <span>ICD-10 Lookup</span>
          </Link>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Holiday Mode Alert Banner
          ═══════════════════════════════════════════════════════════════════ */}
      {profile?.isOnHoliday && (
        <div
          style={{
            padding: '16px 22px',
            borderRadius: '16px',
            background: '#fffbeb',
            border: '1.5px solid #fde68a',
            color: '#92400e',
            marginBottom: '28px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
            boxShadow: '0 2px 10px rgba(217, 119, 6, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: '#fef3c7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="sun-2-bold" size={22} color="#b45309" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#92400e' }}>
                Holiday Mode is Active
              </div>
              <div style={{ fontSize: '0.825rem', color: '#b45309' }}>
                Your calendar slots and profile are currently hidden from patient discovery searches.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              if (toggleHolidayMode) await toggleHolidayMode(false);
            }}
            className="btn-secondary"
            style={{
              padding: '8px 18px',
              fontSize: '0.825rem',
              fontWeight: 700,
              background: '#fff',
              color: '#92400e',
              border: '1.5px solid #f59e0b',
            }}
          >
            Resume Practice (Turn Off)
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          RESTRICTED DASHBOARD STATE (DP-205) - Warm Gold Bronze Styling
          ═══════════════════════════════════════════════════════════════════ */}
      {isPendingVerification && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(240, 229, 211, 0.45) 0%, rgba(253, 251, 247, 0.95) 100%)',
            border: '1.5px solid var(--color-gold-bronze, #B88647)',
            borderRadius: '24px',
            padding: '28px 32px',
            marginBottom: '32px',
            boxShadow: '0 8px 28px rgba(42, 23, 15, 0.05)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                border: '1.5px solid var(--color-gold-base, #DFAB62)',
                color: 'var(--color-chocolate-base, #2A170F)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SolarIcon name="shield-warning-bold" size={28} color="var(--color-gold-bronze, #B88647)" />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '8px' }}>
                <h2
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.35rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontWeight: 'var(--font-heading-weight, 400)',
                  }}
                >
                  Account Pending HPCSA Verification Audit
                </h2>
                <span
                  style={{
                    padding: '4px 12px',
                    borderRadius: 'var(--radius-full, 9999px)',
                    background: 'var(--color-gold-pale, #F0E5D3)',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    border: '1px solid var(--color-gold-base, #DFAB62)',
                    letterSpacing: '0.04em',
                  }}
                >
                  AUDIT IN PROGRESS
                </span>
              </div>

              <p
                style={{
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  fontSize: '0.925rem',
                  lineHeight: 1.6,
                  marginBottom: '20px',
                }}
              >
                Your submitted HPCSA credentials (<strong>{profile?.hpcsaNumber || 'Pending Check'}</strong>) and medical practice license documents are currently being cross-referenced with the HPCSA National Register by ChekUp247 medical governance.
              </p>

              {/* Review Timeline Checklist */}
              <div
                style={{
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  borderRadius: '16px',
                  padding: '20px 24px',
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    color: 'var(--color-chocolate-base, #2A170F)',
                    marginBottom: '14px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                  }}
                >
                  Verification Timeline (Estimated 24–48 Hours):
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: '#ecfdf5',
                        border: '1px solid #10b981',
                        color: '#059669',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-chocolate-base)', fontWeight: 600 }}>
                      Profile Onboarded
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--color-gold-primary, #E2B467)',
                        color: 'var(--color-chocolate-base)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        boxShadow: '0 0 0 3px var(--color-gold-glow)',
                      }}
                    >
                      2
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-chocolate-base)', fontWeight: 700 }}>
                      HPCSA Register Verification
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--color-gold-pale, #F0E5D3)',
                        color: 'var(--color-cream-text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                      }}
                    >
                      3
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-cream-text-muted)' }}>
                      Medical Board Activation
                    </span>
                  </div>
                </div>
              </div>

              {/* Blocked Calendar Notice */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 18px',
                  borderRadius: '12px',
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontSize: '0.875rem',
                }}
              >
                <SolarIcon name="lock-bold" size={18} color="var(--color-gold-bronze, #B88647)" />
                <span>
                  <strong>Calendar &amp; Patient Bookings are Temporarily Paused:</strong> Once your HPCSA license is cleared, your bookable slots will instantly publish to the public ChekUp247 patient search directory.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          4 KPI Metric Cards
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="dashboard-kpi-grid"
        style={{ opacity: isPendingVerification ? 0.8 : 1 }}
      >
        {/* Card 1: Today's Appointments */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="stat-label">
              Today&apos;s Appointments
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="calendar-bold" size={18} color="var(--color-gold-bronze, #B88647)" />
            </div>
          </div>
          <div className="stat-number" style={{ marginBottom: '4px' }}>
            {isPendingVerification ? '0' : todayBookings.length}
          </div>
          <div
            style={{
              fontSize: '0.825rem',
              color: isPendingVerification ? 'var(--color-cream-text-muted)' : '#059669',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {!isPendingVerification && todayBookings.length > 0 && <span className="doctor-availability-dot" />}
            <span>
              {isPendingVerification
                ? 'Bookings paused until verified'
                : nextBookingMinutes !== null
                ? nextBookingMinutes <= 0
                  ? 'Consultation in progress'
                  : `Next in ${nextBookingMinutes}m`
                : 'No more bookings scheduled'}
            </span>
          </div>
        </div>

        {/* Card 2: Issued Scripts */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="stat-label">
              Issued Scripts
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="pill-bold" size={18} color="var(--color-gold-bronze, #B88647)" />
            </div>
          </div>
          <div className="stat-number" style={{ marginBottom: '4px' }}>
            {isPendingVerification ? '0' : prescriptionsCount}
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 600 }}>
            {isPendingVerification ? 'No consultations recorded' : `${prescriptionsCount} verified scripts on ledger`}
          </div>
        </div>

        {/* Card 3: Practice Earnings */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="stat-label">
              Practice Earnings
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="wallet-money-bold" size={18} color="var(--color-gold-bronze, #B88647)" />
            </div>
          </div>
          <div className="stat-number" style={{ marginBottom: '4px' }}>
            {isPendingVerification
              ? 'R0.00'
              : `R${(earnings?.summary?.totalNet ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 500, lineHeight: 1.5 }}>
            <span style={{ color: '#059669', fontWeight: 700 }}>R{availableBalance.toFixed(2)}</span> available
            {heldBalance > 0 && <> • R{heldBalance.toFixed(2)} held</>}
            {nextPayoutDate && <> • Payout {nextPayoutDate}</>}
          </div>
        </div>

        {/* Card 4: This Week's Consultations */}
        <div className="kpi-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span className="stat-label">
              This Week
            </span>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="chart-2-bold" size={18} color="var(--color-gold-bronze, #B88647)" />
            </div>
          </div>
          <div className="stat-number" style={{ marginBottom: '4px' }}>
            {isPendingVerification ? '0' : weekStats.consultationsThisWeek}
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 600 }}>
            {isPendingVerification
              ? 'No activity yet'
              : weekStats.completedThisWeek > 0
              ? `${weekStats.completedThisWeek} completed`
              : 'No consultations yet'}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          Mobile-only: Today's Schedule above main content grid
          ═══════════════════════════════════════════════════════════════════ */}
      {!isPendingVerification && (
        <div className="dashboard-schedule-mobile">{scheduleCard}</div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Main Content + Right Sidebar Grid
          ═══════════════════════════════════════════════════════════════════ */}
      {!isPendingVerification && (
        <div className="dashboard-content-grid">
          {/* ─── Main Column ────────────────────────────────────────────── */}
          <div className="dashboard-main">
            {/* Today's Appointments */}
            <div className="kpi-card" style={{ padding: '20px 22px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <SolarIcon name="calendar-linear" size={18} color="var(--color-gold-bronze, #B88647)" />
                  <div>
                    <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                      Today&apos;s Appointments
                    </div>
                    <div style={{ fontSize: '0.76rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                      {new Date().toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <Link
                  href="/calendar"
                  style={{ fontSize: '0.8rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none' }}
                >
                  <span>View Calendar</span>
                  <SolarIcon name="alt-arrow-right-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                </Link>
              </div>

              {todayBookings.length === 0 ? (
                <div style={{ padding: '24px 8px', textAlign: 'center', color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.875rem' }}>
                  No appointments scheduled for today.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {todayBookings
                    .sort((a, b) => {
                      const ta = a.slot?.startTime ? new Date(a.slot.startTime).getTime() : 0;
                      const tb = b.slot?.startTime ? new Date(b.slot.startTime).getTime() : 0;
                      return ta - tb;
                    })
                    .slice(0, 5)
                    .map((apt: any, idx: number, arr: any[]) => {
                      const time = apt.slot?.startTime
                        ? new Date(apt.slot.startTime).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', hour12: true })
                        : '--:--';
                      const status: string = apt.status || 'confirmed';
                      const startMs = apt.slot?.startTime ? new Date(apt.slot.startTime).getTime() : 0;
                      const isLive = status !== 'completed' && startMs - now <= 10 * 60 * 1000 && now - startMs <= 45 * 60 * 1000;

                      const statusStyle =
                        status === 'completed'
                          ? { bg: '#ECFDF5', fg: '#047857', label: 'Completed' }
                          : isLive
                          ? { bg: '#EFF6FF', fg: '#1D4ED8', label: 'In Progress' }
                          : { bg: '#FEF3E2', fg: '#B45309', label: 'Upcoming' };

                      return (
                        <div
                          key={apt.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '14px',
                            padding: '13px 0',
                            borderBottom: idx < arr.length - 1 ? '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.16))' : 'none',
                          }}
                        >
                          <div style={{ width: '68px', flexShrink: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)' }}>
                            {time}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {apt.patient?.fullName || 'Confirmed Patient'}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                              Video Consultation
                            </div>
                          </div>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              padding: '3px 10px',
                              borderRadius: '9999px',
                              background: statusStyle.bg,
                              color: statusStyle.fg,
                              flexShrink: 0,
                            }}
                          >
                            {statusStyle.label}
                          </span>
                          <Link
                            href={`/consultations/${apt.id}`}
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--color-chocolate-base, #2A170F)',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textDecoration: 'none',
                              flexShrink: 0,
                            }}
                          >
                            <span>{status === 'completed' ? 'View Notes' : 'View Details'}</span>
                            <SolarIcon name="alt-arrow-right-linear" size={13} color="var(--color-cream-text-muted, #6B5E55)" />
                          </Link>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Requires Your Attention */}
            {attentionItems.length > 0 && (
              <div className="kpi-card" style={{ padding: '20px 22px' }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--color-cream-text-muted, #6B5E55)',
                    marginBottom: '14px',
                  }}
                >
                  Requires Your Attention
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attentionItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '11px 12px',
                        borderRadius: '12px',
                        border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                        background: 'var(--color-cream-base, #FAF6EE)',
                        textDecoration: 'none',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))')}
                      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.backgroundColor = 'var(--color-cream-base, #FAF6EE)')}
                    >
                      <div
                        style={{
                          width: '34px',
                          height: '34px',
                          borderRadius: '10px',
                          flexShrink: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: item.tone === 'warn' ? '#FEF3E2' : 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                        }}
                      >
                        <SolarIcon name={item.icon} size={17} color={item.tone === 'warn' ? '#B45309' : 'var(--color-gold-bronze, #B88647)'} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-cream-text-muted, #6B5E55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.sub}
                        </div>
                      </div>
                      <span style={{ flexShrink: 0, display: 'flex' }}>
                        <SolarIcon name="alt-arrow-right-linear" size={16} color="var(--color-cream-text-muted, #6B5E55)" />
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Consultations Queue */}
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <div>
                  <h2
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.2rem',
                      fontWeight: 700,
                      color: 'var(--color-chocolate-base, #2A170F)',
                      marginBottom: '4px',
                    }}
                  >
                    Upcoming Consultations
                  </h2>
                  <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.85rem' }}>
                    Your queued patients, ready for secure, encrypted video consultations.
                  </p>
                </div>

                <Link
                  href="/appointments"
                  style={{
                    fontSize: '0.85rem',
                    color: 'var(--color-gold-bronze, #B88647)',
                    fontWeight: 700,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    textDecoration: 'none',
                  }}
                >
                  <span>View All Appointments</span>
                  <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                </Link>
              </div>

              {upcomingBookings.length === 0 ? (
                <div
                  className="doctor-table-card"
                  style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-cream-text-muted)' }}
                >
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                      margin: '0 auto 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="calendar-linear" size={24} color="var(--color-gold-bronze)" />
                  </div>
                  <p style={{ fontWeight: 700, color: 'var(--color-chocolate-base)', marginBottom: '4px', fontSize: '1.05rem' }}>
                    No Upcoming Consultations
                  </p>
                  <p style={{ fontSize: '0.875rem', maxWidth: '440px', margin: '0 auto 16px' }}>
                    Your scheduled patient appointments will appear here with direct one-click access to the Daily.co video consultation room.
                  </p>
                  <Link href="/calendar" className="btn-primary" style={{ display: 'inline-flex', padding: '8px 18px', fontSize: '0.85rem' }}>
                    Open Clinical Calendar
                  </Link>
                </div>
              ) : (
                <>
                {/* Desktop table */}
                <div className="doctor-table-card doctor-table-view">
                  <div className="doctor-table-scroll">
                    <table className="doctor-table">
                      <thead>
                        <tr>
                          <th>Patient</th>
                          <th>Schedule</th>
                          <th style={{ textAlign: 'center' }}>Status</th>
                          <th style={{ textAlign: 'right' }}>Fee</th>
                          <th style={{ textAlign: 'right', paddingRight: '18px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingBookings.slice(0, 5).map((apt: any) => {
                          const pName = apt.patient?.fullName || 'Confirmed Patient';
                          const initials = pName
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .substring(0, 2)
                            .toUpperCase();

                          const sTime = apt.slot?.startTime
                            ? new Date(apt.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                            : '--:--';
                          const eTime = apt.slot?.endTime
                            ? new Date(apt.slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                            : '--:--';

                          const isToday = apt.slot?.startTime
                            ? new Date(apt.slot.startTime).toDateString() === todayStr
                            : false;
                          const dateLabel = isToday
                            ? `Today • ${sTime} – ${eTime}`
                            : apt.slot?.startTime
                            ? `${new Date(apt.slot.startTime).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} • ${sTime}`
                            : 'Scheduled';

                          const diffMins = apt.slot?.startTime
                            ? Math.round((new Date(apt.slot.startTime).getTime() - Date.now()) / 60000)
                            : null;

                          return (
                            <tr key={apt.id}>
                              {/* Patient — avatar + name */}
                              <td>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div
                                    className="doctor-avatar-circle"
                                    style={{ width: '36px', height: '36px', fontSize: '0.82rem' }}
                                  >
                                    {initials}
                                  </div>
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      fontSize: '0.9rem',
                                      color: 'var(--color-chocolate-base, #2A170F)',
                                    }}
                                  >
                                    {pName}
                                  </span>
                                </div>
                              </td>

                              {/* Schedule */}
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '5px',
                                      fontSize: '0.84rem',
                                      color: 'var(--color-chocolate-base, #2A170F)',
                                      fontWeight: 500,
                                    }}
                                  >
                                    <SolarIcon name="clock-circle-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                                    <span>SAST {dateLabel}</span>
                                  </span>
                                  {diffMins !== null && diffMins <= 60 && (
                                    <span
                                      style={{
                                        fontSize: '0.74rem',
                                        fontWeight: 700,
                                        color: diffMins <= 0 ? '#047857' : 'var(--color-gold-bronze, #B88647)',
                                      }}
                                    >
                                      {diffMins <= 0 ? '● Now Live' : `Starts in ${diffMins} mins`}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Status */}
                              <td style={{ textAlign: 'center' }}>
                                <span className="badge-gold">
                                  {apt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                                </span>
                              </td>

                              {/* Fee */}
                              <td style={{ textAlign: 'right', color: '#059669', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                R{Number(apt.price || profile?.ratePerHour || 850).toFixed(2)}
                              </td>

                              {/* Action */}
                              <td style={{ textAlign: 'right', paddingRight: '16px' }}>
                                <Link
                                  href={`/consultations/${apt.id}`}
                                  className="btn-primary"
                                  style={{ padding: '7px 14px', fontSize: '0.8rem' }}
                                >
                                  <SolarIcon name="videocamera-record-bold" size={15} color="var(--color-chocolate-base, #2A170F)" />
                                  <span>Join Room</span>
                                </Link>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile stacked cards */}
                <div className="doctor-cards-view">
                  {upcomingBookings.slice(0, 5).map((apt: any) => {
                    const pName = apt.patient?.fullName || 'Confirmed Patient';
                    const initials = pName
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const sTime = apt.slot?.startTime
                      ? new Date(apt.slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '--:--';
                    const eTime = apt.slot?.endTime
                      ? new Date(apt.slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
                      : '--:--';

                    const isToday = apt.slot?.startTime
                      ? new Date(apt.slot.startTime).toDateString() === todayStr
                      : false;
                    const dateLabel = isToday
                      ? `Today • ${sTime} – ${eTime}`
                      : apt.slot?.startTime
                      ? `${new Date(apt.slot.startTime).toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' })} • ${sTime}`
                      : 'Scheduled';

                    const diffMins = apt.slot?.startTime
                      ? Math.round((new Date(apt.slot.startTime).getTime() - Date.now()) / 60000)
                      : null;

                    return (
                      <div key={apt.id} className="doctor-mobile-card">
                        <div className="doctor-mobile-card-row">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                            <div
                              className="doctor-avatar-circle"
                              style={{ width: '38px', height: '38px', fontSize: '0.82rem' }}
                            >
                              {initials}
                            </div>
                            <span
                              style={{
                                fontWeight: 700,
                                fontSize: '0.95rem',
                                color: 'var(--color-chocolate-base, #2A170F)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {pName}
                            </span>
                          </div>
                          <span className="badge-gold" style={{ flexShrink: 0 }}>
                            {apt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                          </span>
                        </div>

                        <div className="doctor-mobile-card-row" style={{ fontSize: '0.84rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <SolarIcon name="clock-circle-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                            <span>SAST {dateLabel}</span>
                          </span>
                          <span style={{ color: '#059669', fontWeight: 700 }}>
                            R{Number(apt.price || profile?.ratePerHour || 850).toFixed(2)}
                          </span>
                        </div>

                        {diffMins !== null && diffMins <= 60 && (
                          <div
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: diffMins <= 0 ? '#047857' : 'var(--color-gold-bronze, #B88647)',
                            }}
                          >
                            {diffMins <= 0 ? '● Now Live' : `Starts in ${diffMins} mins`}
                          </div>
                        )}

                        <Link
                          href={`/consultations/${apt.id}`}
                          className="btn-primary"
                          style={{ width: '100%', padding: '10px', fontSize: '0.85rem' }}
                        >
                          <SolarIcon name="videocamera-record-bold" size={16} color="var(--color-chocolate-base, #2A170F)" />
                          <span>Join Video Room</span>
                        </Link>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
            </div>
          </div>

          {/* ─── Right Sidebar ─────────────────────────────────────────── */}
          <div className="dashboard-sidebar">
            {/* Today's Schedule (desktop only) */}
            <div className="dashboard-schedule-desktop">{scheduleCard}</div>

            {/* Next Appointment */}
            <div className="kpi-card" style={{ padding: '22px', display: 'flex', flexDirection: 'column' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  marginBottom: '16px',
                }}
              >
                Next Appointment
              </div>

              {nextBooking ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
                    <div
                      className="doctor-avatar-circle"
                      style={{ width: '52px', height: '52px', fontSize: '1.05rem' }}
                    >
                      {(nextBooking.patient?.fullName || 'Confirmed Patient')
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.05rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                        {nextBooking.patient?.fullName || 'Confirmed Patient'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                        Video Consultation
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                      marginBottom: '10px',
                    }}
                  >
                    <SolarIcon name="clock-circle-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)' }}>
                      {nextBooking.slot?.startTime
                        ? new Date(nextBooking.slot.startTime).toLocaleString('en-ZA', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false,
                          }) + ' SAST'
                        : 'Scheduled'}
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: nextBookingJoinable ? '#047857' : 'var(--color-gold-bronze, #B88647)',
                      marginBottom: '16px',
                    }}
                  >
                    {nextBookingJoinable ? '● Ready to start now' : nextStartsLabel}
                  </div>

                  <Link
                    href={`/consultations/${nextBooking.id}`}
                    className="btn-primary"
                    style={{ width: '100%', padding: '12px', fontSize: '0.9rem', marginTop: 'auto' }}
                  >
                    <SolarIcon name="videocamera-record-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Start Consultation</span>
                  </Link>
                </>
              ) : (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '16px 8px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '14px',
                      background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '12px',
                    }}
                  >
                    <SolarIcon name="calendar-linear" size={22} color="var(--color-gold-bronze, #B88647)" />
                  </div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-chocolate-base, #2A170F)', marginBottom: '4px' }}>
                    No upcoming consultation
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
                    Your next booked patient will appear here.
                  </div>
                </div>
              )}
            </div>

            {/* This Week */}
            <div className="kpi-card" style={{ padding: '20px 22px' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--color-cream-text-muted, #6B5E55)',
                  marginBottom: '14px',
                }}
              >
                This Week
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {/* Consultations this week */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    <SolarIcon name="calendar-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                    Consultations
                  </span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    {weekStats.consultationsThisWeek}
                  </span>
                </div>

                {/* Completed */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    <SolarIcon name="check-circle-linear" size={16} color="#059669" />
                    Completed
                  </span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 'var(--font-heading-weight, 400)', color: '#059669' }}>
                    {weekStats.completedThisWeek}
                  </span>
                </div>

                {/* Open availability */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    <SolarIcon name="clock-circle-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                    Open slots this week
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-heading)',
                      fontSize: '1.1rem',
                      fontWeight: 'var(--font-heading-weight, 400)',
                      color: weekStats.openSlotsThisWeek === 0 ? '#B45309' : 'var(--color-chocolate-base, #2A170F)',
                    }}
                  >
                    {weekStats.openSlotsThisWeek}
                  </span>
                </div>

                {/* Rating */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    paddingTop: '14px',
                    borderTop: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.18))',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    <SolarIcon name="star-linear" size={16} color="var(--color-gold-base, #DFAB62)" />
                    Patient rating
                  </span>
                  <span style={{ fontFamily: 'var(--font-heading)', fontSize: '1.1rem', fontWeight: 'var(--font-heading-weight, 400)', color: 'var(--color-chocolate-base, #2A170F)' }}>
                    {ratingAvg > 0 ? `${ratingAvg.toFixed(1)} / 5` : '—'}
                  </span>
                </div>

                {weekStats.openSlotsThisWeek === 0 && (
                  <Link
                    href="/calendar"
                    className="btn-secondary"
                    style={{ width: '100%', padding: '9px', fontSize: '0.82rem', marginTop: '2px' }}
                  >
                    <SolarIcon name="calendar-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                    <span>Publish Availability</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          Pending Verification: Upcoming Consultations Locked State
          ═══════════════════════════════════════════════════════════════════ */}
      {isPendingVerification && (
        <div style={{ opacity: 0.75 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '14px',
            }}
          >
            <div>
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base, #2A170F)',
                  marginBottom: '4px',
                }}
              >
                Upcoming Consultations
              </h2>
              <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.85rem' }}>
                Your queued patients, ready for secure, encrypted video consultations.
              </p>
            </div>
          </div>

          <div
            className="doctor-table-card"
            style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-cream-text-muted)' }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                background: 'var(--color-gold-glow, rgba(223, 171, 98, 0.12))',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="lock-bold" size={26} color="var(--color-gold-bronze)" />
            </div>
            <p style={{ fontWeight: 700, color: 'var(--color-chocolate-base)', marginBottom: '4px', fontSize: '1rem' }}>
              Consultation Queue Paused
            </p>
            <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
              Confirmed patient bookings will automatically populate here once HPCSA administrative verification completes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
