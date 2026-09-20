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
  const tokenParam = searchParams?.get('token') || '';

  const { verifyEmail } = useAuth();

  const [tokenInput, setTokenInput] = useState(tokenParam);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeVerification = async (tok: string) => {
    if (!tok.trim()) {
      setError('Please provide a valid verification token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyEmail(tok.trim());
      setSuccess(true);
      toastSuccess('Email verified', 'Your account is now active.');
      const redirectTarget = searchParams?.get('redirect') || '/appointments';
      setTimeout(() => {
        router.push(redirectTarget);
      }, 2500);
    } catch (err: any) {
      const msg = errorMessage(err, 'Verification token is invalid or has expired.');
      setError(msg);
      toastError('Verification failed', msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tokenParam) {
      setTokenInput(tokenParam);
      executeVerification(tokenParam);
    }
  }, [tokenParam]);

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
              Your patient account is now fully active. Redirecting you to your profile dashboard...
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
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginBottom: '28px' }}>
              Enter the verification token sent to your email address or click the activation link in your message.
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
              <div style={{ marginBottom: '20px', textAlign: 'left' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Verification Token
                </label>
                <input
                  type="text"
                  required
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Paste 64-character token here"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--color-slate-300)',
                    fontSize: '0.9rem',
                    fontFamily: 'monospace',
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
                    <span>Verifying Token...</span>
                  </>
                ) : (
                  <span>Verify Email Address</span>
                )}
              </button>
            </form>

            <div style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
              Didn&apos;t receive the email? Check your spam folder or{' '}
              <Link href="/login" style={{ color: 'var(--color-brand-600)', fontWeight: 600 }}>
                Sign In to re-send
              </Link>
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

