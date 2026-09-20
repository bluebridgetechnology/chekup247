'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChekupCrossLogo } from '../../components/common/ChekupCrossLogo';
import { SolarIcon } from '../../components/common/SolarIcon';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';

export default function DoctorLoginPage() {
  const router = useRouter();
  const { login } = useDoctorAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your practice email and password');
      return;
    }

    setLoading(true);
    try {
      await login(email.trim(), password);
      toastSuccess('Welcome back', 'Signed in to your practice portal.');
      router.push('/calendar');
    } catch (err: any) {
      const msg = errorMessage(err, 'Invalid credentials or doctor access restricted');
      setError(msg);
      toastError('Sign in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = () => {
    setEmail('doctor@chekup247.co.za');
    setPassword('DoctorChekup2026!');
    setError(null);
  };

  return (
    <div className="auth-split-layout">
      {/* LEFT COLUMN: Clean Brand & Trust Panel */}
      <div className="auth-visual-pane">
        {/* Brand Top Header */}
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '12px',
              textDecoration: 'none',
              marginBottom: '36px',
            }}
          >
            <ChekupCrossLogo size={32} />
            <span
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '1.4rem',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1,
              }}
            >
              <span style={{ color: '#ffffff' }}>Chekup</span>
              <span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
            </span>
          </Link>

          {/* Hero Content */}
          <div style={{ maxWidth: '420px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'rgba(223, 171, 98, 0.12)',
                border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
                color: 'var(--color-gold-base, #DFAB62)',
                fontSize: '0.74rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                marginBottom: '16px',
              }}
            >
              <SolarIcon name="shield-check-linear" size={14} color="var(--color-gold-base, #DFAB62)" />
              <span>HPCSA Compliant Practice</span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '2rem',
                fontWeight: 500,
                color: '#ffffff',
                lineHeight: 1.25,
                letterSpacing: '-0.02em',
                margin: '0 0 14px',
              }}
            >
              South Africa&apos;s Digital Clinical Practice
            </h1>

            <p
              style={{
                color: 'rgba(255, 255, 255, 0.7)',
                fontSize: '0.9rem',
                lineHeight: 1.6,
                margin: '0 0 28px',
                fontWeight: 400,
              }}
            >
              Connect with patients nationwide, issue compliant e-prescriptions with ICD-10 diagnostic codes, and automate medical practice earnings.
            </p>

            {/* Feature Points (clean inline rows without heavy boxes) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(223, 171, 98, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-gold-base, #DFAB62)',
                  }}
                >
                  <SolarIcon name="videocamera-record-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#ffffff' }}>
                    Encrypted Telehealth Consultations
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.55)', fontWeight: 400 }}>
                    HD virtual consultations with automated waiting queue.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(223, 171, 98, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-gold-base, #DFAB62)',
                  }}
                >
                  <SolarIcon name="document-text-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#ffffff' }}>
                    ICD-10 Coding &amp; E-Prescriptions
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.55)', fontWeight: 400 }}>
                    Digital scripts delivered directly to patient pharmacies.
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    background: 'rgba(223, 171, 98, 0.14)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    color: 'var(--color-gold-base, #DFAB62)',
                  }}
                >
                  <SolarIcon name="card-linear" size={18} color="var(--color-gold-base, #DFAB62)" />
                </div>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.85rem', color: '#ffffff' }}>
                    Automated Direct Settlements
                  </div>
                  <div style={{ fontSize: '0.76rem', color: 'rgba(255, 255, 255, 0.55)', fontWeight: 400 }}>
                    Scheduled EFT payouts with zero billing administration.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle Bottom Trust Note */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            marginTop: 'auto',
            paddingTop: '20px',
            borderTop: '1px solid rgba(223, 171, 98, 0.12)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '0.75rem',
            color: 'rgba(255, 255, 255, 0.55)',
            fontWeight: 400,
          }}
        >
          <SolarIcon name="shield-check-linear" size={15} color="var(--color-gold-base, #DFAB62)" />
          <span>Trusted by HPCSA registered doctors nationwide • 256-bit TLS</span>
        </div>
      </div>

      {/* RIGHT COLUMN: Clean Warm Cream Form Panel */}
      <div className="auth-form-pane">
        <div className="auth-form-wrapper">
          {/* Mobile-Only Header */}
          <div
            className="mobile-auth-brand"
            style={{
              display: 'none',
              textAlign: 'center',
              marginBottom: '24px',
            }}
          >
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
              }}
            >
              <ChekupCrossLogo size={28} />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.35rem',
                  fontWeight: 600,
                  color: 'var(--color-chocolate-base, #2A170F)',
                }}
              >
                Chekup<span style={{ color: 'var(--color-gold-base, #DFAB62)' }}>247</span>
              </span>
            </Link>
          </div>

          {/* Form Header */}
          <div style={{ marginBottom: '24px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '3px 10px',
                borderRadius: 'var(--radius-full, 9999px)',
                backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
                color: 'var(--color-chocolate-base, #2A170F)',
                border: '1px solid rgba(223, 171, 98, 0.25)',
                fontSize: '0.72rem',
                fontWeight: 600,
                marginBottom: '10px',
              }}
            >
              <SolarIcon name="stethoscope-linear" size={14} color="var(--color-chocolate-base)" />
              <span>Doctor Practice Suite</span>
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: '1.7rem',
                fontWeight: 600,
                color: 'var(--color-chocolate-base, #2A170F)',
                margin: '0 0 6px',
                letterSpacing: '-0.02em',
              }}
            >
              Doctor Sign In
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.85rem', margin: 0, fontWeight: 400 }}>
              Access your clinical queue, calendar availability, and prescriptions.
            </p>
          </div>

          {/* LocumStaff Social-Style Sign In Button (Brand Aligned, No Purple) */}
          <Link
            href="/callback?code=mock-locumstaff-sso-verified"
            style={{
              width: '100%',
              boxSizing: 'border-box',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              padding: '11px 16px',
              borderRadius: '11px',
              backgroundColor: '#ffffff',
              border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
              color: 'var(--color-chocolate-base, #2A170F)',
              fontSize: '0.85rem',
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: '0 1px 3px rgba(42, 23, 15, 0.04)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.backgroundColor = 'var(--color-cream-surface, #FDFBF7)';
              e.currentTarget.style.borderColor = 'var(--color-gold-base, #DFAB62)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(223, 171, 98, 0.15)';
            }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = 'var(--color-gold-border, rgba(223, 171, 98, 0.35))';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(42, 23, 15, 0.04)';
            }}
          >
            <ChekupCrossLogo size={20} />
            <span>Continue with LocumStaff</span>
          </Link>

          {/* Clean Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '18px 0',
              color: 'var(--color-cream-text-muted, #6B5E55)',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gold-border, rgba(223, 171, 98, 0.22))' }} />
            <span style={{ padding: '0 14px', fontWeight: 500, color: 'var(--color-cream-text-muted, #6B5E55)' }}>
              or sign in with email
            </span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gold-border, rgba(223, 171, 98, 0.22))' }} />
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 14px',
                borderRadius: '10px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#dc2626',
                fontSize: '0.825rem',
                marginBottom: '16px',
                fontWeight: 500,
              }}
            >
              <SolarIcon name="danger-circle-linear" size={16} color="#dc2626" style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Direct Login Form */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-input-group" style={{ marginBottom: '14px' }}>
              <label className="auth-label" style={{ fontWeight: 500, fontSize: '0.8rem', marginBottom: '5px' }}>
                Practice Email Address
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <SolarIcon name="letter-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dr.smith@example.co.za"
                  className="auth-input"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                    borderRadius: '10px',
                    height: '44px',
                    fontSize: '0.875rem',
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-input-group" style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
                <label className="auth-label" style={{ fontWeight: 500, fontSize: '0.8rem', margin: 0 }}>
                  Password
                </label>
                <Link
                  href="/login#forgot"
                  onClick={(e: React.MouseEvent) => {
                    e.preventDefault();
                    toastSuccess('Password Reset', 'Password reset link sent to your practice email if registered.');
                  }}
                  style={{
                    fontSize: '0.76rem',
                    color: 'var(--color-gold-bronze, #B88647)',
                    textDecoration: 'none',
                    fontWeight: 500,
                  }}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon">
                  <SolarIcon name="lock-password-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="auth-input"
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.28))',
                    borderRadius: '10px',
                    height: '44px',
                    fontSize: '0.875rem',
                    paddingRight: '40px',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-cream-text-muted, #6B5E55)',
                    cursor: 'pointer',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <SolarIcon name="eye-closed-linear" size={18} color="var(--color-cream-text-muted, #6B5E55)" />
                  ) : (
                    <SolarIcon name="eye-linear" size={18} color="var(--color-cream-text-muted, #6B5E55)" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Demo Doctor */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '7px', cursor: 'pointer', fontSize: '0.78rem', color: 'var(--color-cream-text-muted, #6B5E55)', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    accentColor: 'var(--color-gold-base, #DFAB62)',
                    width: '14px',
                    height: '14px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                  }}
                />
                <span>Remember this device</span>
              </label>

              {/* Quick Fill Test Doctor */}
              <button
                type="button"
                onClick={handleQuickFill}
                style={{
                  background: 'var(--color-cream-surface, #FDFBF7)',
                  border: '1px dashed var(--color-gold-border, rgba(223, 171, 98, 0.45))',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  color: 'var(--color-gold-bronze, #B88647)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
                title="Fill seeded test doctor credentials"
              >
                <SolarIcon name="user-check-linear" size={13} color="var(--color-gold-bronze, #B88647)" />
                <span>Demo (Dr. Molefe)</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: '44px',
                fontSize: '0.875rem',
                fontWeight: 600,
                borderRadius: '10px',
                boxShadow: '0 2px 6px rgba(42, 23, 15, 0.08)',
              }}
            >
              {loading ? (
                <span>Signing In...</span>
              ) : (
                <>
                  <span>Sign In to Practice Suite</span>
                  <SolarIcon name="arrow-right-linear" size={15} color="var(--color-chocolate-base, #2A170F)" />
                </>
              )}
            </button>
          </form>

          {/* Registration Link */}
          <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.825rem', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
            New medical practitioner?{' '}
            <Link
              href="/register"
              style={{
                color: 'var(--color-chocolate-base, #2A170F)',
                fontWeight: 600,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              Register HPCSA Practice
            </Link>
          </div>

          {/* Security & Compliance Footer */}
          <div
            style={{
              marginTop: '24px',
              paddingTop: '16px',
              borderTop: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.18))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.7rem',
              color: 'var(--color-cream-text-muted, #6B5E55)',
            }}
          >
            <SolarIcon name="shield-check-linear" size={14} color="var(--color-gold-bronze, #B88647)" />
            <span>256-bit TLS Encryption • POPIA &amp; HPCSA Act 101/1965 Compliant</span>
          </div>
        </div>
      </div>
    </div>
  );
}
