'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Mail,
  Lock,
  Phone,
  Calendar,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';
import { ChekupCrossLogo } from '../../components/Navbar';
import { SolarIcon } from '../../components/SolarIcon';

const HIGHLIGHTS = [
  {
    icon: 'videocamera-record-bold-duotone',
    text: 'Instant video consultations with HPCSA-registered GPs',
  },
  {
    icon: 'document-medicine-bold-duotone',
    text: 'Valid digital e-prescriptions sent to any pharmacy',
  },
  {
    icon: 'bill-list-bold-duotone',
    text: 'Medical aid claimable invoices & ICD-10 codes',
  },
  {
    icon: 'shield-check-bold-duotone',
    text: 'POPIA-compliant end-to-end encrypted medical records',
  },
];

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect') || '/appointments';
  const { register, googleLogin } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState<string | null>(null);

  // Live password strength calculation
  const getPasswordStrength = () => {
    if (!password) return 0;
    let score = 0;
    if (password.length >= 8) score += 25;
    if (/[A-Z]/.test(password)) score += 25;
    if (/[0-9]/.test(password)) score += 25;
    if (/[^A-Za-z0-9]/.test(password)) score += 25;
    return score;
  };

  const strength = getPasswordStrength();
  const strengthColor =
    strength <= 25
      ? 'var(--color-danger)'
      : strength <= 50
      ? 'var(--color-warning)'
      : strength <= 75
      ? 'var(--color-gold-base)'
      : 'var(--color-success)';
  const strengthLabel =
    strength <= 25 ? 'Weak' : strength <= 50 ? 'Fair' : strength <= 75 ? 'Good' : 'Strong';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Please enter your full name');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await register({
        full_name: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim() || undefined,
        date_of_birth: dateOfBirth || undefined,
      });

      setRegisteredSuccess(res.verificationToken || 'sent');
      toastSuccess('Account created', 'Check your email for a verification code to activate your account.');
    } catch (err: any) {
      const msg = errorMessage(err, 'Registration failed. Please try again.');
      setError(msg);
      toastError('Registration failed', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = () => {
    setError(null);
    googleLogin('mock-google-credential', email || 'patient@gmail.com', fullName || 'Google Patient')
      .then(() => {
        toastSuccess('Account created with Google');
        router.push(redirectUrl);
      })
      .catch((e: any) => {
        const msg = errorMessage(e, 'Google sign-up failed. Please try again.');
        setError(msg);
        toastError('Google sign-up failed', msg);
      });
  };

  return (
    <div className="auth-split-layout">
      {/* Left side: Branded Visual Pane */}
      <div className="auth-visual-pane">
        {/* Top: Brand Logo */}
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            textDecoration: 'none',
            position: 'relative',
            zIndex: 1,
            width: 'fit-content',
          }}
          aria-label="Chekup247 Home"
        >
          <ChekupCrossLogo size={32} />
          <span
            style={{
              fontSize: '1.38rem',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1,
              fontFamily: 'var(--font-heading), sans-serif',
            }}
          >
            <span style={{ color: 'var(--color-white)' }}>Chekup</span>
            <span style={{ color: 'var(--color-gold-base)' }}>247</span>
          </span>
        </Link>

        {/* Center: Value Prop & Features List */}
        <div style={{ position: 'relative', zIndex: 1, margin: '48px 0 36px 0' }}>
          <div
            style={{
              color: 'var(--color-gold-base)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '14px',
              fontFamily: 'var(--font-sans)',
            }}
          >
            JOIN CHEKUP247
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
              fontWeight: 700,
              lineHeight: 1.18,
              color: 'var(--color-white)',
              letterSpacing: '-0.02em',
              marginBottom: '36px',
            }}
          >
            Skip the waiting room.
            <br />
            See a doctor today.
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {HIGHLIGHTS.map((item, idx) => (
              <div
                key={idx}
                className="hero-feature-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  fontSize: '0.9375rem',
                  color: 'var(--color-white-90)',
                  lineHeight: 1.45,
                }}
              >
                <div
                  className="hero-feature-box"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '9px',
                    flexShrink: 0,
                  }}
                >
                  <SolarIcon name={item.icon} size={18} color="var(--color-gold-base)" />
                </div>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom: Floating Trust Bubble */}
        <div style={{ position: 'relative', zIndex: 1, paddingTop: '12px' }}>
          <div
            className="trust-floating-bubble"
            style={{
              position: 'relative',
              top: 'unset',
              right: 'unset',
              display: 'inline-block',
              zIndex: 2,
            }}
            aria-hidden="true"
          >
            <div className="trust-floating-text">
              Real people.
              <br />
              Real care.
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Form Components Pane (NO CARD - on canvas directly) */}
      <div className="auth-form-pane">
        <div className="auth-form-wrapper">
          {registeredSuccess ? (
            /* Clean On-Page Verification Notification */
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div
                style={{
                  width: '72px',
                  height: '72px',
                  borderRadius: 'var(--radius-full)',
                  backgroundColor: 'var(--color-gold-pale)',
                  border: '1.5px solid var(--color-gold-border)',
                  color: 'var(--color-gold-dark)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '24px',
                }}
              >
                <CheckCircle2 size={38} />
              </div>

              <div
                style={{
                  color: 'var(--color-gold-base)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                ACCOUNT CREATED
              </div>

              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 2.5vw, 2.15rem)',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  marginBottom: '12px',
                }}
              >
                Check Your Inbox!
              </h2>

              <p
                style={{
                  color: 'var(--color-cream-text-muted)',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  marginBottom: '32px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                We have sent a secure email verification link to{' '}
                <strong style={{ color: 'var(--color-chocolate-base)' }}>{email}</strong>. Please
                click the link to verify your account and begin booking consultations with our GP network.
              </p>

              <Link
                href={`/verify-email?token=${registeredSuccess !== 'sent' ? registeredSuccess : ''}${redirectUrl && redirectUrl !== '/appointments' && redirectUrl !== '/portal' ? `&redirect=${encodeURIComponent(redirectUrl)}` : ''}`}
                className="btn-primary"
                style={{
                  width: '100%',
                  height: '48px',
                  fontSize: '0.95rem',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                }}
              >
                <span>Continue to Email Verification</span>
                <ArrowRight size={18} />
              </Link>
            </div>
          ) : (
            <>
              {/* Eyebrow */}
              <div
                style={{
                  color: 'var(--color-gold-base)',
                  fontSize: '0.8125rem',
                  fontWeight: 700,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: '8px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                GET STARTED IN MINUTES
              </div>

              {/* Heading */}
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.75rem, 2.5vw, 2.15rem)',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base)',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.2,
                  marginBottom: '8px',
                }}
              >
                Create Patient Account
              </h2>

              {/* Subtitle */}
              <p
                style={{
                  color: 'var(--color-cream-text-muted)',
                  fontSize: '0.9375rem',
                  lineHeight: 1.5,
                  marginBottom: '28px',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Connect with verified HPCSA medical doctors across South Africa in minutes.
              </p>

              {/* Error Alert */}
              {error && (
                <div
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
                    fontFamily: 'var(--font-sans)',
                  }}
                  role="alert"
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{error}</span>
                </div>
              )}

              {/* Quick Google Sign-Up Button */}
              <button
                type="button"
                onClick={handleGoogleSignUp}
                className="auth-btn-google"
                aria-label="Continue with Google"
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
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="auth-divider">
                <span>or sign up with email</span>
              </div>

              {/* Patient Registration Form */}
              <form onSubmit={handleSubmit} noValidate>
                {/* Full Name */}
                <div className="auth-input-group">
                  <label htmlFor="fullName" className="auth-label">
                    Full Name (as per ID)
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <User size={18} />
                    </span>
                    <input
                      id="fullName"
                      name="fullName"
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Sipho Ndlovu"
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div className="auth-input-group">
                  <label htmlFor="email" className="auth-label">
                    Email Address
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <Mail size={18} />
                    </span>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="sipho@example.co.za"
                      className="auth-input"
                    />
                  </div>
                </div>

                {/* Phone & Date of Birth (2-col grid) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                  }}
                >
                  {/* Phone */}
                  <div className="auth-input-group">
                    <label htmlFor="phone" className="auth-label">
                      Phone Number
                    </label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <Phone size={18} />
                      </span>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+27 82 000 0000"
                        className="auth-input"
                      />
                    </div>
                  </div>

                  {/* Date of Birth */}
                  <div className="auth-input-group">
                    <label htmlFor="dateOfBirth" className="auth-label">
                      Date of Birth
                    </label>
                    <div className="auth-input-wrapper">
                      <span className="auth-input-icon">
                        <Calendar size={18} />
                      </span>
                      <input
                        id="dateOfBirth"
                        name="dateOfBirth"
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="auth-input"
                      />
                    </div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="auth-input-group">
                  <label htmlFor="password" className="auth-label">
                    Password (min. 8 characters)
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <Lock size={18} />
                    </span>
                    <input
                      id="password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Create a strong password"
                      className="auth-input"
                      style={{ paddingRight: '46px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="auth-password-toggle"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* Live Strength Bar */}
                  {password && (
                    <div style={{ marginTop: '8px' }}>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.75rem',
                          fontFamily: 'var(--font-sans)',
                          marginBottom: '4px',
                        }}
                      >
                        <span style={{ color: 'var(--color-cream-text-muted)' }}>Strength:</span>
                        <span style={{ fontWeight: 600, color: strengthColor }}>{strengthLabel}</span>
                      </div>
                      <div
                        style={{
                          height: '4px',
                          width: '100%',
                          backgroundColor: 'var(--color-border)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            width: `${strength}%`,
                            backgroundColor: strengthColor,
                            transition: 'width 0.3s ease, background-color 0.3s ease',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="auth-input-group" style={{ marginBottom: '26px' }}>
                  <label htmlFor="confirmPassword" className="auth-label">
                    Confirm Password
                  </label>
                  <div className="auth-input-wrapper">
                    <span className="auth-input-icon">
                      <Lock size={18} />
                    </span>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className="auth-input"
                      style={{ paddingRight: '46px' }}
                    />
                  </div>
                </div>

                {/* Primary Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    height: '48px',
                    fontSize: '0.95rem',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.75 : 1,
                  }}
                >
                  {loading ? 'Creating Account...' : 'Complete Patient Registration'}
                </button>
              </form>

              {/* Link to /login */}
              <div
                style={{
                  marginTop: '26px',
                  textAlign: 'center',
                  fontSize: '0.875rem',
                  color: 'var(--color-cream-text-muted)',
                  fontFamily: 'var(--font-sans)',
                }}
              >
                Already registered?{' '}
                <Link
                  href={redirectUrl && redirectUrl !== '/appointments' && redirectUrl !== '/portal' ? `/login?redirect=${encodeURIComponent(redirectUrl)}` : '/login'}
                  style={{
                    color: 'var(--color-chocolate-base)',
                    fontWeight: 700,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                    textDecorationColor: 'var(--color-gold-base)',
                    transition: 'color 0.18s ease',
                  }}
                >
                  Sign In
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PatientRegisterPage() {
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
            Loading registration...
          </p>
        </div>
      }
    >
      <RegisterContent />
    </Suspense>
  );
}
