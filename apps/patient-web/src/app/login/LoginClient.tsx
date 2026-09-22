'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Mail,
  Lock,
  AlertCircle,
  ShieldCheck,
  Eye,
  EyeOff,
  ArrowRight,
  Star,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ChekupCrossLogo } from '../../components/Navbar';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/appointments';

  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter both your email address and password');
      return;
    }

    setLoading(true);
    try {
      const data = await login(email.trim(), password, rememberMe);
      toastSuccess('Welcome back', data?.user?.fullName ? `Signed in as ${data.user.fullName}.` : 'You are now signed in.');
      router.push(redirectUrl);
    } catch (err: any) {
      const msg = errorMessage(err, 'Invalid credentials. Please verify your email and password.');
      setError(msg);
      toastError('Sign in failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-layout">
      {/* ====================================================================
          Left Column: Branded Visual Pane
          ==================================================================== */}
      <div className="auth-visual-pane">
        {/* Healthcare imagery backdrop with subtle ambient gold glow & chocolate overlay */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
          }}
          aria-hidden="true"
        >
          <Image
            src="/images/hero_bg.png"
            alt=""
            fill
            priority
            sizes="(max-width: 960px) 100vw, 50vw"
            style={{
              objectFit: 'cover',
              objectPosition: 'center',
              opacity: 0.16,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `
                radial-gradient(circle at 20% 20%, var(--color-gold-glow) 0%, transparent 55%),
                linear-gradient(180deg, var(--color-chocolate-fade-72) 0%, var(--color-chocolate-base) 100%)
              `,
            }}
          />
        </div>

        {/* Top: Brand Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ height: '36px', display: 'flex', alignItems: 'center' }}>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
              }}
            >
              <ChekupCrossLogo size={32} />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--color-white)',
                  letterSpacing: '-0.02em',
                }}
              >
                Chek<span style={{ color: 'var(--color-gold-base)' }}>Up</span>247
              </span>
            </Link>
          </div>
        </div>

        {/* Middle: Headline & Text — centred vertically between logo and stats */}
        <div style={{ marginTop: 'auto', marginBottom: 'auto', paddingTop: '32px', paddingBottom: '32px', position: 'relative', zIndex: 1, maxWidth: '460px' }}>
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.15rem',
              fontWeight: 700,
              lineHeight: 1.2,
              color: 'var(--color-white)',
              letterSpacing: '-0.025em',
              marginBottom: '10px',
            }}
          >
            Healthcare made effortless,<br />
            <span style={{ color: 'var(--color-gold-base)' }}>accessible 24/7.</span>
          </h1>

          <p
            style={{
              color: 'var(--color-white-78)',
              fontSize: '0.925rem',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Connect with trusted, HPCSA-registered South African practitioners for consultations,
            sick notes, and direct digital prescriptions.
          </p>
        </div>

        {/* Bottom: Stats Strip */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="auth-stats-strip">
            <div className="auth-stats-row">
              {/* 4.95★ Rating */}
              <div className="auth-stat-item">
                <div className="auth-stat-val">
                  <Star
                    size={16}
                    fill="var(--color-star-gold)"
                    stroke="var(--color-star-gold)"
                    style={{ color: 'var(--color-star-gold)' }}
                  />
                  <span>4.95★</span>
                </div>
                <div className="auth-stat-lbl">Patient Rating</div>
              </div>

              <div className="auth-stat-divider" aria-hidden="true" />

              {/* 120+ Verified Doctors */}
              <div className="auth-stat-item">
                <div className="auth-stat-val">
                  <Users size={16} style={{ color: 'var(--color-gold-base)' }} />
                  <span>120+</span>
                </div>
                <div className="auth-stat-lbl">Verified Doctors</div>
              </div>

              <div className="auth-stat-divider" aria-hidden="true" />

              {/* 100% HPCSA & POPIA Compliant */}
              <div className="auth-stat-item">
                <div className="auth-stat-val">
                  <ShieldCheck size={16} style={{ color: 'var(--color-status-online)' }} />
                  <span>100%</span>
                </div>
                <div className="auth-stat-lbl">HPCSA &amp; POPIA</div>
              </div>
            </div>

            <hr className="auth-stats-hr" />
          </div>
        </div>
      </div>

      {/* ====================================================================
          Right Column: Form Components Pane (Canvas Direct - No Card Box)
          ==================================================================== */}
      <div className="auth-form-pane">
        <div className="auth-form-wrapper">
          {/* LocumStaff SSO Button */}
          <button
            type="button"
            onClick={() => {/* LocumStaff SSO — coming soon */}}
            style={{
              width: '100%',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--color-gold-pale, #F0E5D3)',
              border: '1.5px solid var(--color-gold-border, rgba(223, 171, 98, 0.4))',
              color: 'var(--color-chocolate-base)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '0',
              transition: 'background-color 0.18s ease, border-color 0.18s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-gold-border, rgba(223, 171, 98, 0.25))';
              e.currentTarget.style.borderColor = 'var(--color-gold-base, #DFAB62)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-gold-pale, #F0E5D3)';
              e.currentTarget.style.borderColor = 'var(--color-gold-border, rgba(223, 171, 98, 0.4))';
            }}
          >
            <ShieldCheck size={18} style={{ color: 'var(--color-gold-bronze)' }} />
            Sign in with LocumStaff account
          </button>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              margin: '20px 0',
              color: 'var(--color-cream-text-muted)',
              fontSize: '0.78rem',
            }}
          >
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gold-border, rgba(223, 171, 98, 0.22))' }} />
            <span style={{ padding: '0 14px', fontWeight: 500 }}>or sign in with email</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--color-gold-border, rgba(223, 171, 98, 0.22))' }} />
          </div>

          {/* Heading */}
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.15rem',
              fontWeight: 700,
              color: 'var(--color-chocolate-base)',
              marginBottom: '10px',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
            }}
          >
            Welcome Back
          </h2>

          {/* Subtitle */}
          <p
            style={{
              color: 'var(--color-cream-text-muted)',
              fontSize: '0.925rem',
              lineHeight: 1.55,
              marginBottom: '28px',
            }}
          >
            Sign in to access your appointments, medical records, and e-prescriptions.
          </p>

          {/* Error Alert Box */}
          {error && (
            <div
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '12px 16px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--color-danger-bg)',
                border: '1px solid var(--color-danger)',
                color: 'var(--color-danger)',
                fontSize: '0.875rem',
                marginBottom: '20px',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {/* Form Inputs directly on canvas (NO card border/shadow/box) */}
          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="auth-input-group">
              <label htmlFor="auth-email" className="auth-label">
                Email Address
              </label>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <Mail size={18} />
                </span>
                <input
                  id="auth-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.co.za"
                  className="auth-input"
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="auth-input-group">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '7px',
                }}
              >
                <label htmlFor="auth-password" className="auth-label" style={{ marginBottom: 0 }}>
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  style={{
                    fontSize: '0.8125rem',
                    color: 'var(--color-gold-bronze)',
                    fontWeight: 600,
                    textDecoration: 'none',
                    transition: 'color 0.18s ease',
                  }}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--color-chocolate-base)')}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--color-gold-bronze)')}
                >
                  Forgot password?
                </Link>
              </div>
              <div className="auth-input-wrapper">
                <span className="auth-input-icon" aria-hidden="true">
                  <Lock size={18} />
                </span>
                <input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="auth-input-action"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{
                  width: '16px',
                  height: '16px',
                  marginRight: '10px',
                  accentColor: 'var(--color-gold-base)',
                  cursor: 'pointer',
                }}
              />
              <label
                htmlFor="remember"
                style={{
                  fontSize: '0.85rem',
                  color: 'var(--color-chocolate-base)',
                  fontWeight: 500,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                Keep me signed in on this device
              </label>
            </div>

            {/* Primary Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: '48px',
                fontSize: '0.95rem',
                fontWeight: 600,
              }}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Link to Register: Create Patient Account */}
          <div
            style={{
              marginTop: '24px',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--color-cream-text-muted)',
            }}
          >
            <span>Don&apos;t have an account? </span>
            <Link
              href={redirectUrl && redirectUrl !== '/appointments' && redirectUrl !== '/portal' ? `/register?redirect=${encodeURIComponent(redirectUrl)}` : '/register'}
              style={{
                color: 'var(--color-chocolate-base)',
                fontWeight: 700,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--color-gold-bronze)')}
              onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = 'var(--color-chocolate-base)')}
            >
              Create Patient Account
            </Link>
          </div>

          {/* Referral link for HPCSA doctors to the Doctor Portal */}
          <div
            style={{
              marginTop: '28px',
              paddingTop: '20px',
              borderTop: '1px solid var(--color-gold-border)',
              textAlign: 'center',
              fontSize: '0.85rem',
              color: 'var(--color-cream-text-muted)',
            }}
          >
            <span>Are you an HPCSA-registered healthcare provider?</span>
            <br />
            <a
              href={process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL || 'http://localhost:3001'}
              style={{
                color: 'var(--color-chocolate-base)',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-specialty-icon-bg)',
                border: '1px solid var(--color-gold-border)',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-gold-pale)';
                e.currentTarget.style.borderColor = 'var(--color-gold-base)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--color-specialty-icon-bg)';
                e.currentTarget.style.borderColor = 'var(--color-gold-border)';
              }}
            >
              <span>Sign In to Doctor Portal</span>
              <ArrowRight size={14} style={{ color: 'var(--color-gold-base)' }} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginClient() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'var(--color-cream-base)',
          }}
        >
          <p
            style={{
              color: 'var(--color-cream-text-muted)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.95rem',
            }}
          >
            Loading sign in...
          </p>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

