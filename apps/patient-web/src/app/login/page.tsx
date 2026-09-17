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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/profile';

  const { login, googleLogin } = useAuth();

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
      await login(email.trim(), password, rememberMe);
      router.push(redirectUrl);
    } catch (err: any) {
      setError(err.message || 'Invalid credentials. Please verify your email and password.');
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

        {/* Top Brand Logo Link */}
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '32px' }}>
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

        {/* Center Content: Trust Floating Bubble + Headline */}
        <div style={{ position: 'relative', zIndex: 1, margin: 'auto 0' }}>
          {/* Trust Floating Speech Bubble */}
          <div
            className="trust-floating-bubble"
            style={{
              position: 'relative',
              top: 'auto',
              right: 'auto',
              display: 'inline-block',
              transform: 'rotate(3deg)',
              marginBottom: '28px',
              backgroundColor: 'var(--color-cream-surface)',
              border: '1px solid var(--color-gold-border)',
              boxShadow: '0 12px 28px var(--color-chocolate-shadow)',
            }}
            aria-hidden="true"
          >
            <div
              className="trust-floating-text"
              style={{
                fontFamily: "'Caveat', cursive, sans-serif",
                fontSize: '1.32rem',
                fontWeight: 700,
                color: 'var(--color-chocolate-base)',
                lineHeight: 1.2,
              }}
            >
              Real people.
              <br />
              Real care.
            </div>
          </div>

          {/* Headline in var(--font-heading) */}
          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.1rem, 3.2vw, 2.75rem)',
              fontWeight: 700,
              lineHeight: 1.18,
              color: 'var(--color-white)',
              letterSpacing: '-0.025em',
              marginBottom: '16px',
            }}
          >
            Healthcare made effortless,<br />
            <span style={{ color: 'var(--color-gold-base)' }}>accessible 24/7.</span>
          </h1>

          <p
            style={{
              color: 'var(--color-white-78)',
              fontSize: '1rem',
              lineHeight: 1.6,
              maxWidth: '460px',
            }}
          >
            Connect with trusted, HPCSA-registered South African practitioners for consultations,
            sick notes, and direct digital prescriptions.
          </p>
        </div>

        {/* Social Proof Badges */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="auth-social-proof-grid">
            {/* 4.95★ Rating */}
            <div className="auth-social-badge">
              <div className="auth-social-badge-val">
                <Star
                  size={16}
                  fill="var(--color-star-gold)"
                  stroke="var(--color-star-gold)"
                  style={{ color: 'var(--color-star-gold)' }}
                />
                <span>4.95★</span>
              </div>
              <div className="auth-social-badge-lbl">Patient Rating</div>
            </div>

            {/* 120+ Verified Doctors */}
            <div className="auth-social-badge">
              <div className="auth-social-badge-val">
                <Users size={16} style={{ color: 'var(--color-gold-base)' }} />
                <span>120+</span>
              </div>
              <div className="auth-social-badge-lbl">Verified Doctors</div>
            </div>

            {/* 100% HPCSA & POPIA Compliant */}
            <div className="auth-social-badge">
              <div className="auth-social-badge-val">
                <ShieldCheck size={16} style={{ color: 'var(--color-status-online)' }} />
                <span>100%</span>
              </div>
              <div className="auth-social-badge-lbl">HPCSA & POPIA</div>
            </div>
          </div>
        </div>
      </div>

      {/* ====================================================================
          Right Column: Form Components Pane (Canvas Direct - No Card Box)
          ==================================================================== */}
      <div className="auth-form-pane">
        <div className="auth-form-wrapper">
          {/* Eyebrow: SECURE PATIENT ACCESS */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--color-gold-base)',
              marginBottom: '10px',
            }}
          >
            <ShieldCheck size={15} style={{ color: 'var(--color-gold-base)' }} />
            <span>SECURE PATIENT ACCESS</span>
          </div>

          {/* Heading */}
          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '2.15rem',
              fontWeight: 700,
              color: 'var(--color-chocolate-base)',
              marginBottom: '8px',
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

          {/* Google One-Click Login Button */}
          <button
            type="button"
            onClick={() => {
              googleLogin('mock-google-credential', email || 'patient@gmail.com', 'Google Patient')
                .then(() => router.push(redirectUrl))
                .catch((e: any) => setError(e.message));
            }}
            className="auth-btn-google"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="var(--color-google-blue)"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="var(--color-google-green)"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="var(--color-google-yellow)"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="var(--color-google-red)"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign In with Google</span>
          </button>

          {/* Divider */}
          <div className="auth-divider">
            <span>or sign in with email</span>
          </div>

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
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-chocolate-base)')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-gold-bronze)')}
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
              href="/register"
              style={{
                color: 'var(--color-chocolate-base)',
                fontWeight: 700,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
                transition: 'color 0.18s ease',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--color-gold-bronze)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--color-chocolate-base)')}
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

export default function PatientLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: 'calc(100vh - 74px)',
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

