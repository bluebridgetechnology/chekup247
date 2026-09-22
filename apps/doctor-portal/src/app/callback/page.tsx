'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { SolarIcon } from '../../components/common/SolarIcon';
import { useDoctorAuth } from '../../context/DoctorAuthContext';
import { toastSuccess, toastError } from '../../lib/toast';

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
    if (!state) {
      setStatus('error');
      setErrorMessage('Missing OIDC state parameter — this sign-in link is invalid or incomplete.');
      return;
    }

    let isMounted = true;

    async function executeExchange() {
      try {
        await handleSsoCallback(code!, codeVerifier, state);
        if (isMounted) {
          setStatus('success');
          toastSuccess('Signed in via LocumStaff', 'Launching your clinical dashboard.');
          setTimeout(() => {
            router.push('/');
          }, 1500);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          const _msg = err instanceof Error && err.message ? err.message : 'Federated SSO token exchange failed.';
          setErrorMessage(_msg);
          toastError('SSO sign-in failed', _msg);
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
        background: 'linear-gradient(180deg, var(--color-chocolate-base, #2A170F) 0%, #1c0f09 100%)',
        color: 'var(--color-chocolate-base, #2A170F)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--color-cream-surface, #FDFBF7)',
          borderRadius: 'var(--radius-xl)',
          padding: '44px 36px',
          border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.25))',
          boxShadow: '0 25px 50px -12px rgba(42, 23, 15, 0.35)',
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
              background: 'var(--color-cream-bg, #F7F1E8)',
              border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              color: 'var(--color-chocolate-base, #2A170F)',
            }}
          >
            LocumStaff
          </div>

          <div style={{ color: 'var(--color-gold-bronze, #B88647)', fontSize: '1.25rem' }}>⇄</div>

          <div
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--color-gold-base, #DFAB62) 0%, var(--color-gold-bronze, #B88647) 100%)',
              border: '1px solid var(--color-gold-base, #DFAB62)',
              fontWeight: 700,
              fontSize: '1rem',
              letterSpacing: '-0.02em',
              color: 'var(--color-chocolate-base, #2A170F)',
            }}
          >
            ChekUp247
          </div>
        </div>

        {status === 'exchanging' && (
          <div>
            <div style={{ display: 'inline-flex', marginBottom: '20px', color: 'var(--color-gold-bronze, #B88647)' }}>
              <SolarIcon name="refresh-linear" size={48} className="animate-spin" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-chocolate-base, #2A170F)' }}>
              Authenticating with LocumStaff SSO...
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Verifying your LocumStaff identity and establishing a secure doctor practice session.
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
              <SolarIcon name="check-circle-linear" size={40} color="#10b981" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-chocolate-base, #2A170F)' }}>
              Doctor Verified &amp; Authenticated
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.9rem', marginBottom: '24px' }}>
              Welcome back to ChekUp247 Practice Suite. Launching your clinical dashboard...
            </p>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--color-gold-bronze, #B88647)', fontSize: '0.85rem' }}>
              <SolarIcon name="refresh-linear" size={16} className="animate-spin" />
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
              <SolarIcon name="danger-circle-linear" size={40} color="#ef4444" />
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px', color: 'var(--color-chocolate-base, #2A170F)' }}>
              SSO Handshake Failed
            </h2>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: 1.6 }}>
              {errorMessage || 'Unable to exchange LocumStaff authorization code. The token may have expired.'}
            </p>
            <Link
              href="/login"
              className="btn-primary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                fontWeight: 600,
                fontSize: '0.9rem',
                textDecoration: 'none',
              }}
            >
              <span>Return to Doctor Sign In</span>
              <SolarIcon name="arrow-right-linear" size={16} color="var(--color-chocolate-base, #2A170F)" />
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
