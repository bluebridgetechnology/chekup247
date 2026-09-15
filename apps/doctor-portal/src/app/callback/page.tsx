'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { useDoctorAuth } from '../../context/DoctorAuthContext';

function SsoCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleSsoCallback } = useDoctorAuth();

  const code = searchParams?.get('code');
  const codeVerifier = searchParams?.get('code_verifier') || undefined;
  const state = searchParams?.get('state') || undefined;

  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus('error');
      setErrorMessage('Missing OIDC authorization code in redirect callback.');
      return;
    }

    let isMounted = true;

    async function executeExchange() {
      try {
        await handleSsoCallback(code!, codeVerifier, state);
        if (isMounted) {
          setStatus('success');
          setTimeout(() => {
            router.push('/');
          }, 1500);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(err.message || 'Federated SSO token exchange failed.');
        }
      }
    }

    executeExchange();

    return () => {
      isMounted = false;
    };
  }, [code, codeVerifier, state, handleSsoCallback, router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px',
        background: 'linear-gradient(180deg, var(--color-slate-900) 0%, #090d16 100%)',
        color: '#ffffff',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'rgba(30, 41, 59, 0.75)',
          backdropFilter: 'blur(16px)',
          borderRadius: 'var(--radius-xl)',
          padding: '44px 36px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          textAlign: 'center',
        }}
      >
        {/* Dual Branding Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              color: '#38bdf8',
            }}
          >
            LocumStaff
          </div>

          <div style={{ color: 'var(--color-slate-500)', fontSize: '1.25rem' }}>⇄</div>

          <div
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-800) 100%)',
              border: '1px solid var(--color-brand-400)',
              fontWeight: 800,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              color: '#ffffff',
            }}
          >
            ChekUp247
          </div>
        </div>

        {status === 'exchanging' && (
          <div>
            <div style={{ display: 'inline-flex', marginBottom: '20px', color: 'var(--color-brand-400)' }}>
              <Loader2 size={48} className="animate-spin" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
              Authenticating with LocumStaff SSO...
            </h2>
            <p style={{ color: 'var(--color-slate-400)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Verifying cryptographic OIDC PKCE token with LocumStaff Key Services. Establishing secure doctor practice session.
            </p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <CheckCircle2 size={40} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
              Doctor Verified & Authenticated
            </h2>
            <p style={{ color: 'var(--color-slate-300)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Welcome back to ChekUp247 Practice Suite. Launching your clinical dashboard...
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-300)', fontSize: '0.85rem' }}>
              <Loader2 size={16} className="animate-spin" />
              <span>Redirecting...</span>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
              }}
            >
              <AlertCircle size={40} />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>
              SSO Handshake Failed
            </h2>
            <p style={{ color: 'var(--color-slate-300)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.6 }}>
              {errorMessage || 'Unable to exchange LocumStaff authorization code. The token may have expired.'}
            </p>
            <Link
              href="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-brand-500)',
                color: '#ffffff',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <span>Return to Doctor Sign In</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SsoCallbackPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
          <p>Processing LocumStaff authentication...</p>
        </div>
      }
    >
      <SsoCallbackContent />
    </Suspense>
  );
}
