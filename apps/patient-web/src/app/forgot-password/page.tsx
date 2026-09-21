'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight } from 'lucide-react';
import { toastSuccess, toastError, errorMessage } from '../../lib/toast';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to request password reset');

      setSubmitted(true);
      if (data.resetToken) {
        setResetToken(data.resetToken);
      }
      toastSuccess('Reset link sent', 'Check your email for password reset instructions.');
    } catch (err: any) {
      const msg = errorMessage(err, 'Failed to request password reset link.');
      setError(msg);
      toastError('Could not send reset link', msg);
    } finally {
      setLoading(false);
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
          maxWidth: '460px',
          background: '#ffffff',
          borderRadius: 'var(--radius-xl)',
          padding: '40px',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--color-slate-200)',
        }}
      >
        {submitted ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#ecfdf5',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: '1.5rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
              Reset Link Dispatched
            </h2>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '24px' }}>
              If an account is associated with <strong>{email}</strong>, we have dispatched a secure password reset link. The link expires in 1 hour.
            </p>

            {resetToken && (
              <div
                style={{
                  background: 'var(--color-slate-50)',
                  border: '1px dashed var(--color-brand-400)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px',
                  marginBottom: '20px',
                  textAlign: 'left',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-brand-700)', marginBottom: '4px' }}>
                  DEV SHORTCUT (Reset Token):
                </div>
                <Link
                  href={`/reset-password?token=${resetToken}`}
                  style={{ fontSize: '0.8rem', color: 'var(--color-brand-600)', wordBreak: 'break-all' }}
                >
                  Click here to proceed directly to Password Reset
                </Link>
              </div>
            )}

            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-brand-600)',
                fontWeight: 600,
                fontSize: '0.9rem',
              }}
            >
              <ArrowLeft size={16} />
              <span>Return to Sign In</span>
            </Link>
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: '28px' }}>
              <Link
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: 'var(--color-slate-500)',
                  fontSize: '0.85rem',
                  marginBottom: '16px',
                }}
              >
                <ArrowLeft size={16} />
                <span>Back to Sign In</span>
              </Link>
              <h1 style={{ fontSize: '1.65rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                Reset Your Password
              </h1>
              <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>
                Enter the email address registered with your ChekUp247 account and we will send you a reset link.
              </p>
            </div>

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
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-slate-700)', marginBottom: '6px' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-slate-400)' }}>
                    <Mail size={18} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.co.za"
                    style={{
                      width: '100%',
                      padding: '10px 14px 10px 38px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-slate-300)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
                style={{ width: '100%', padding: '12px' }}
              >
                {loading ? 'Dispatching Link...' : 'Send Reset Link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
