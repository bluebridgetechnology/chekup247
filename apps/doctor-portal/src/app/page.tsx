'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  Video,
  FileText,
  DollarSign,
  TrendingUp,
  UserCheck,
  AlertCircle,
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
} from 'lucide-react';
import { useDoctorAuth } from '../context/DoctorAuthContext';

export default function DoctorDashboardPage() {
  const { doctor, profile, isPendingVerification, isAuthenticated } = useDoctorAuth();

  const doctorName = doctor?.fullName || 'Dr. Practitioner';
  const isVerified = profile?.verificationStatus === 'verified';

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Welcome Banner */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '1.85rem', color: 'var(--color-slate-900)', marginBottom: '6px' }}>
          Good day, {doctorName} 👋
        </h1>
        <p style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem' }}>
          {isPendingVerification
            ? 'Your application is currently under review by our medical governance team.'
            : 'Here is your clinical schedule and practice activity overview for today.'}
        </p>
      </div>

      {/* RESTRICTED DASHBOARD STATE (DP-205) */}
      {isPendingVerification && (
        <div
          style={{
            background: '#fffbeb',
            border: '2px solid #fde68a',
            borderRadius: 'var(--radius-xl)',
            padding: '32px',
            marginBottom: '32px',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '20px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#fef3c7',
                color: '#d97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Clock size={32} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '1.35rem', color: '#92400e', fontWeight: 800 }}>
                  Account Pending HPCSA Verification
                </h2>
                <span
                  style={{
                    padding: '3px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: '1px solid #fcd34d',
                  }}
                >
                  STATUS: IN REVIEW
                </span>
              </div>

              <p style={{ color: '#78350f', fontSize: '0.925rem', lineHeight: 1.6, marginBottom: '20px' }}>
                Your submitted HPCSA credentials (<strong>{profile?.hpcsaNumber || 'Pending Check'}</strong>) and license documents are undergoing compliance audit by the ChekUp247 medical board.
              </p>

              {/* Review Timeline Checklist */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.75)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px',
                  border: '1px solid #fef08a',
                  marginBottom: '20px',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#92400e', marginBottom: '12px' }}>
                  VERIFICATION TIMELINE (24–48 HOURS):
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#10b981', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      ✓
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)', fontWeight: 500 }}>
                      Profile Onboarded
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#f59e0b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      ⋯
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-700)', fontWeight: 600 }}>
                      HPCSA Register Verification
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--color-slate-300)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>
                      3
                    </div>
                    <span style={{ fontSize: '0.85rem', color: 'var(--color-slate-400)' }}>
                      Admin Board Activation
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
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: '#ffffff',
                  border: '1px solid #fde68a',
                  color: '#92400e',
                  fontSize: '0.875rem',
                }}
              >
                <Lock size={18} style={{ flexShrink: 0, color: '#d97706' }} />
                <span>
                  <strong>Calendar & Patient Bookings are Temporarily Blocked:</strong> Once your profile is activated, your availability will automatically appear on the public ChekUp247 directory.
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Metrics Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '20px',
          marginBottom: '32px',
          opacity: isPendingVerification ? 0.6 : 1,
        }}
      >
        {/* Metric 1 */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              TODAY&apos;S APPOINTMENTS
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--color-brand-50)', color: 'var(--color-brand-600)' }}>
              <Calendar size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '4px' }}>
            {isPendingVerification ? '0' : '6'}
          </div>
          <div style={{ fontSize: '0.8rem', color: isPendingVerification ? 'var(--color-slate-400)' : 'var(--color-brand-600)', fontWeight: 600 }}>
            {isPendingVerification ? 'Booking blocked until verified' : 'Next starts in 18 minutes'}
          </div>
        </div>

        {/* Metric 2 */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              PENDING SCRIPTS
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#fffbeb', color: '#d97706' }}>
              <FileText size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '4px' }}>
            {isPendingVerification ? '0' : '2'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d97706', fontWeight: 600 }}>
            {isPendingVerification ? 'No consultations recorded' : 'Require ICD-10 signing'}
          </div>
        </div>

        {/* Metric 3 */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              WEEKLY EARNINGS
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: '#ecfdf5', color: '#059669' }}>
              <DollarSign size={18} />
            </div>
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-slate-900)', marginBottom: '4px' }}>
            {isPendingVerification ? 'R0.00' : 'R8,450.00'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>
            Rate: R{profile?.ratePerHour || 850}/hour
          </div>
        </div>

        {/* Metric 4 */}
        <div className="portal-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <span style={{ color: 'var(--color-slate-500)', fontSize: '0.85rem', fontWeight: 600 }}>
              VERIFICATION BADGE
            </span>
            <div style={{ padding: '8px', borderRadius: '8px', background: 'var(--color-brand-50)', color: 'var(--color-brand-600)' }}>
              <UserCheck size={18} />
            </div>
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isVerified ? '#059669' : '#d97706', marginBottom: '4px', paddingTop: '8px' }}>
            {isVerified ? 'VERIFIED HPCSA' : 'PENDING AUDIT'}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)', fontWeight: 600 }}>
            {profile?.specialty || 'General Practice'}
          </div>
        </div>
      </div>

      {/* Schedule Overview */}
      <div className="portal-card" style={{ opacity: isPendingVerification ? 0.6 : 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)', marginBottom: '4px' }}>
              Upcoming Consultations
            </h2>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.85rem' }}>
              High-definition Daily.co video consultation room queue.
            </p>
          </div>

          <Link
            href="/profile"
            style={{
              fontSize: '0.85rem',
              color: 'var(--color-brand-600)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span>Edit Practice Profile</span>
            <ArrowRight size={14} />
          </Link>
        </div>

        {isPendingVerification ? (
          <div style={{ padding: '48px 20px', textAlign: 'center', color: 'var(--color-slate-400)' }}>
            <Lock size={36} style={{ margin: '0 auto 12px auto', color: 'var(--color-slate-300)' }} />
            <p style={{ fontWeight: 600, color: 'var(--color-slate-600)', marginBottom: '4px' }}>
              Consultation Queue Inactive
            </p>
            <p style={{ fontSize: '0.85rem' }}>
              Bookings will automatically appear here once administrative verification is complete.
            </p>
          </div>
        ) : (
          <div style={{ border: '1px solid var(--color-slate-200)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--color-slate-100)', background: 'var(--color-slate-50)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--color-brand-100)', color: 'var(--color-brand-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  KM
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--color-slate-900)' }}>Kagiso Molefe</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-slate-500)' }}>Follow-up Consultation • SAST 14:00 - 14:30</div>
                </div>
              </div>
              <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                <Video size={16} />
                <span>Join Call</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
