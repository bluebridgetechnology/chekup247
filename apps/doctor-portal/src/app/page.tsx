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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const doctorName = doctor?.fullName || 'Dr. Practitioner';
  const isVerified = profile?.verificationStatus === 'verified';

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
        const [bookingsRes, earningsRes, rxRes] = await Promise.all([
          fetch(`${apiBase}/bookings/doctor`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch(`${apiBase}/doctors/me/earnings`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null),
          fetch(`${apiBase}/prescriptions`, {
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
      (new Date(nextBooking.slot.startTime).getTime() - Date.now()) / 60000,
    );
    return diffMins;
  }, [nextBooking]);

  return (
    <div style={{ maxWidth: '1240px', margin: '0 auto', paddingBottom: '48px' }}>
      {/* Welcome Banner */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '28px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.78rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--color-gold-bronze, #B88647)',
              }}
            >
              Doctor Practice Portal • ChekUp247
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--color-gold-base)' }} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-cream-text-muted)' }}>
              SAST {new Date().toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2rem',
              fontWeight: 800,
              color: 'var(--color-chocolate-base, #2A170F)',
              marginBottom: '6px',
              letterSpacing: '-0.02em',
            }}
          >
            Good day, {doctorName} 👋
          </h1>
          <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.95rem' }}>
            {isPendingVerification
              ? 'Your medical credentials are under expedited governance audit by the ChekUp247 clinical board.'
              : 'Here is your clinical schedule, daily consultation queue, and practice financial overview.'}
          </p>
        </div>

        {/* Action quick links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/calendar" className="btn-secondary">
            <SolarIcon name="calendar-linear" size={18} color="var(--color-chocolate-base, #2A170F)" />
            <span>Manage Shifts</span>
          </Link>
          <Link href="/appointments" className="btn-primary">
            <SolarIcon name="videocamera-record-bold" size={18} color="var(--color-chocolate-base, #2A170F)" />
            <span>Consultation Queue</span>
          </Link>
        </div>
      </div>

      {/* Holiday Mode Alert Banner */}
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

      {/* RESTRICTED DASHBOARD STATE (DP-205) - Warm Gold Bronze Styling */}
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
                    fontWeight: 800,
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
                  <strong>Calendar & Patient Bookings are Temporarily Paused:</strong> Once your HPCSA license is cleared, your bookable slots will instantly publish to the public ChekUp247 patient search directory.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Clinical Action Dock */}
      <div
        className="portal-card"
        style={{
          marginBottom: '32px',
          padding: '18px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '14px',
          background: 'var(--color-cream-surface, #FDFBF7)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              background: 'var(--color-gold-pale, #F0E5D3)',
              color: 'var(--color-chocolate-base, #2A170F)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <SolarIcon name="bolt-circle-bold" size={20} color="var(--color-gold-bronze, #B88647)" />
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: 700,
                fontSize: '0.95rem',
                color: 'var(--color-chocolate-base, #2A170F)',
              }}
            >
              Quick Clinical Dock
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
              Instant shortcuts for daily practitioner workflows
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <Link
            href="/calendar"
            className="specialty-chip"
            style={{ textDecoration: 'none' }}
          >
            <SolarIcon name="clock-circle-bold" size={16} color="var(--color-gold-bronze, #B88647)" />
            <span>Instant Availability</span>
          </Link>

          <Link
            href="/prescriptions/new"
            className="specialty-chip"
            style={{ textDecoration: 'none' }}
          >
            <SolarIcon name="pill-bold" size={16} color="var(--color-gold-bronze, #B88647)" />
            <span>Quick Prescribe</span>
          </Link>

          <Link
            href="/icd10"
            className="specialty-chip"
            style={{ textDecoration: 'none' }}
          >
            <SolarIcon name="magnifer-bold" size={16} color="var(--color-gold-bronze, #B88647)" />
            <span>ICD-10 Search</span>
          </Link>

          <Link
            href="/earnings"
            className="specialty-chip"
            style={{ textDecoration: 'none' }}
          >
            <SolarIcon name="wallet-money-bold" size={16} color="var(--color-gold-bronze, #B88647)" />
            <span>Practice Payouts</span>
          </Link>
        </div>
      </div>

      {/* 4 Clean Cream KPI Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
          opacity: isPendingVerification ? 0.8 : 1,
        }}
      >
        {/* Metric 1: Today's Appointments */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Today&apos;s Appointments
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="calendar-bold" size={20} color="var(--color-chocolate-base, #2A170F)" />
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.4rem',
              fontWeight: 800,
              color: 'var(--color-chocolate-base, #2A170F)',
              marginBottom: '4px',
              letterSpacing: '-0.02em',
            }}
          >
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
                  : `Next starts in ${nextBookingMinutes} mins`
                : 'No consultations remaining today'}
            </span>
          </div>
        </div>

        {/* Metric 2: Pending Prescriptions */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Issued Scripts
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="pill-bold" size={20} color="var(--color-chocolate-base, #2A170F)" />
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.4rem',
              fontWeight: 800,
              color: 'var(--color-chocolate-base, #2A170F)',
              marginBottom: '4px',
              letterSpacing: '-0.02em',
            }}
          >
            {isPendingVerification ? '0' : prescriptionsCount}
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--color-gold-bronze, #B88647)', fontWeight: 600 }}>
            {isPendingVerification ? 'No consultations recorded' : `${prescriptionsCount} verified scripts on ledger`}
          </div>
        </div>

        {/* Metric 3: Weekly Practice Earnings */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Practice Earnings
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="wallet-money-bold" size={20} color="var(--color-chocolate-base, #2A170F)" />
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.4rem',
              fontWeight: 800,
              color: 'var(--color-chocolate-base, #2A170F)',
              marginBottom: '4px',
              letterSpacing: '-0.02em',
            }}
          >
            {isPendingVerification
              ? 'R0.00'
              : `R${(earnings?.summary?.totalNet ?? 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          </div>
          <div style={{ fontSize: '0.825rem', color: '#059669', fontWeight: 600 }}>
            Rate: R{profile?.ratePerHour || 850}/hr • Available: R{(earnings?.summary?.availableBalance ?? 0).toFixed(2)}
          </div>
        </div>

        {/* Metric 4: HPCSA Status */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span
              style={{
                color: 'var(--color-cream-text-muted, #6B5E55)',
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              Verification Badge
            </span>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale, #F0E5D3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon
                name={isVerified ? 'shield-check-bold' : 'shield-warning-bold'}
                size={20}
                color={isVerified ? '#059669' : 'var(--color-gold-bronze, #B88647)'}
              />
            </div>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.45rem',
              fontWeight: 800,
              color: isVerified ? '#059669' : 'var(--color-gold-bronze, #B88647)',
              marginBottom: '4px',
              paddingTop: '6px',
            }}
          >
            {isVerified ? 'VERIFIED HPCSA' : 'PENDING AUDIT'}
          </div>
          <div style={{ fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)', fontWeight: 600 }}>
            {profile?.specialty || 'General Practice'} • HPCSA: {profile?.hpcsaNumber || 'Pending'}
          </div>
        </div>
      </div>

      {/* Upcoming Consultations Queue Preview */}
      <div className="portal-card" style={{ opacity: isPendingVerification ? 0.75 : 1 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          <div>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '1.3rem',
                color: 'var(--color-chocolate-base, #2A170F)',
                marginBottom: '4px',
              }}
            >
              Upcoming Consultations
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.875rem' }}>
              High-definition Daily.co encrypted video consultation room queue.
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

        {isPendingVerification ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-cream-text-muted)' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="lock-bold" size={28} color="var(--color-gold-bronze)" />
            </div>
            <p style={{ fontWeight: 700, color: 'var(--color-chocolate-base)', marginBottom: '4px', fontSize: '1rem' }}>
              Consultation Queue Paused
            </p>
            <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto' }}>
              Confirmed patient bookings will automatically populate here once HPCSA administrative verification completes.
            </p>
          </div>
        ) : upcomingBookings.length === 0 ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-cream-text-muted)' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--color-gold-pale)',
                margin: '0 auto 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <SolarIcon name="calendar-linear" size={26} color="var(--color-gold-bronze)" />
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
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
                <div
                  key={apt.id}
                  style={{
                    padding: '18px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '16px',
                    border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.22))',
                    borderRadius: '16px',
                    background: 'var(--color-cream-surface, #FDFBF7)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div className="doctor-avatar-circle">
                      {initials}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            fontFamily: 'var(--font-heading)',
                            fontWeight: 700,
                            fontSize: '1.05rem',
                            color: 'var(--color-chocolate-base, #2A170F)',
                          }}
                        >
                          {pName}
                        </div>
                        <span className="badge-gold">
                          {apt.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          fontSize: '0.825rem',
                          color: 'var(--color-cream-text-muted, #6B5E55)',
                          marginTop: '4px',
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <SolarIcon name="clock-circle-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
                          <span>SAST {dateLabel}</span>
                        </span>
                        <span>•</span>
                        <span style={{ color: '#059669', fontWeight: 700 }}>Fee: R{Number(apt.price || profile?.ratePerHour || 850).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {diffMins !== null && diffMins <= 60 && (
                      <span
                        style={{
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-full, 9999px)',
                          background: 'var(--color-gold-pale, #F0E5D3)',
                          border: '1px solid rgba(223, 171, 98, 0.4)',
                          color: 'var(--color-chocolate-base, #2A170F)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                        }}
                      >
                        <SolarIcon name="clock-circle-bold" size={13} color="var(--color-gold-bronze, #B88647)" />
                        <span>{diffMins <= 0 ? 'Now Live' : `Starts in ${diffMins} mins`}</span>
                      </span>
                    )}

                    <Link
                      href={`/consultations/${apt.id}`}
                      className="btn-primary"
                      style={{ padding: '9px 18px', fontSize: '0.85rem' }}
                    >
                      <SolarIcon name="videocamera-record-bold" size={16} color="var(--color-chocolate-base, #2A170F)" />
                      <span>Join Video Room</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
