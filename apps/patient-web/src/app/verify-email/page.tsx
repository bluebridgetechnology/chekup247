'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, AlertCircle, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams?.get('token') || searchParams?.get('code') || '';
  const emailParam = searchParams?.get('email') || '';

  const { verifyEmail, verifyOtp, resendOtp } = useAuth();

  const [emailInput, setEmailInput] = useState(emailParam);
  const [tokenInput, setTokenInput] = useState(tokenParam);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);

  const executeVerification = async (codeOrToken: string, emailAddr?: string) => {
    const trimmedCode = codeOrToken.trim();
    if (!trimmedCode) {
      setError('Please provide a valid verification code');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const activeEmail = (emailAddr || emailInput).trim();
      // If code is 6 digits and email is provided, use verifyOtp
      if (/^\d{6}$/.test(trimmedCode) && activeEmail) {
        await verifyOtp(activeEmail, trimmedCode);
      } else {
        await verifyEmail(trimmedCode);
      }
      setSuccess(true);
      toastSuccess('Email verified', 'Your account is now active.');
      const redirectTarget = searchParams?.get('redirect') || '/appointments';
      setTimeout(() => {
        router.push(redirectTarget);
      }, 2000);
    } catch (err: any) {
      const msg = errorMessage(err, 'Verification code is invalid or has expired.');
      setError(msg);
      toastError('Verification failed', msg);
    } finally {
      setLoading(false);
    }
  };

  // Only auto-verify if a token was explicitly provided in the URL (e.g. from an email link)
  useEffect(() => {
    if (tokenParam) {
      setTokenInput(tokenParam);
      executeVerification(tokenParam, emailParam);
    }
  }, [tokenParam]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    const targetEmail = (emailInput || emailParam).trim();
    if (!targetEmail || !targetEmail.includes('@')) {
      setError('Please enter a valid email address to resend the code.');
      return;
    }

    setResending(true);
    setError(null);
    try {
      await resendOtp(targetEmail);
      toastSuccess('Code resent', 'A new 6-digit verification code has been dispatched.');
      setResendCooldown(60);
    } catch (err: any) {
      const msg = errorMessage(err, 'Failed to resend verification code.');
      setError(msg);
      toastError('Resend failed', msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <div
      style={{
        minHeight: 'calc(100vh - 72px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 16px',
        background: 'linear-gradient(180deg, var(--color-slate-50) 0%, #ffffff 100%)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-slate-200)',
          textAlign: 'center',
        }}
      >
        {success ? (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <CheckCircle2 size={40} />
            </div>
            <h1 style={{ fontSize: '1.65rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
              Email Verified Successfully!
            </h1>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem', marginBottom: '24px' }}>
              Your patient account is now fully active. Redirecting you to your appointments dashboard...
            </p>
            <Link href="/appointments" className="btn-primary" style={{ width: '100%' }}>
              <span>Go to My Appointments</span>
              <ArrowRight size={18} />
            </Link>
          </div>
        ) : (
          <div>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--color-brand-50)',
                color: 'var(--color-brand-600)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <Mail size={28} />
            </div>

            <h1 style={{ fontSize: '1.65rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
              Verify Your Email
            </h1>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginBottom: '24px' }}>
              {emailInput ? (
                <>
                  We sent a 6-digit verification code to{' '}
                  <strong style={{ color: 'var(--color-slate-800)' }}>{emailInput}</strong>.
                  Enter the code below to activate your account.
                </>
              ) : (
                'Enter the 6-digit verification code sent to your email address.'
              )}
            </p>

            {error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-danger-bg)',
                  border: '1px solid #fecaca',
                  color: 'var(--color-danger)',
                  fontSize: '0.875rem',
                  marginBottom: '20px',
                  textAlign: 'left',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                executeVerification(tokenInput);
              }}
            >
              {!emailParam && (
                <div style={{ marginBottom: '16px', textAlign: 'left' }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--color-slate-700)',
                      marginBottom: '6px',
                    }}
                  >
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              )}

              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    color: 'var(--color-slate-700)',
                    marginBottom: '6px',
                  }}
                >
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={64}
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="e.g. 482910"
                  autoComplete="one-time-code"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '1.25rem',
                    fontFamily: 'monospace',
                    letterSpacing: '4px',
                    textAlign: 'center',
                    outline: 'none',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <span>Verify Account</span>
                )}
              </button>
            </form>

            <div style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
              Didn&apos;t receive the code?{' '}
              <button
                type="button"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
                style={{
                  background: 'none',
                  border: 'none',
                  color: resendCooldown > 0 ? 'var(--color-slate-400)' : 'var(--color-brand-600)',
                  fontWeight: 600,
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : resending ? 'Resending...' : 'Resend Code'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--color-slate-500)' }}>Loading email verification...</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}

