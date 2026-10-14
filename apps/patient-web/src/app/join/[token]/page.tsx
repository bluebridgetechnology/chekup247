'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChekupCrossLogo } from '../../../components/common/ChekupCrossLogo';
import { useAuth } from '../../../context/AuthContext';
import { formatClockTime, formatZoneAbbr } from '../../../lib/time';
import { QUICK_BOOK_ONLY } from '../../../lib/featureFlags';
import { QUICK_BOOK_URL } from '../../../lib/quickBook';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

type State =
  | { kind: 'loading' }
  | { kind: 'early'; opensAt: string; startsAt?: string; message: string }
  | { kind: 'error'; message: string };

/**
 * The "Join Your Consultation" button in a patient's email lands here. The link itself is the proof of
 * identity (it was sent to the patient's own inbox), so there is no code or password: we exchange it
 * for a session limited to this one booking and go straight to the consultation room.
 */
export default function JoinConsultationPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const { startGuestSession } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const startedRef = useRef(false);

  const exchange = useCallback(async () => {
    setState({ kind: 'loading' });
    try {
      const res = await fetch(`${API_BASE}/bookings/join-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params?.token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const message = typeof data.message === 'string' ? data.message : 'We could not open this link.';
        if (data.code === 'TOO_EARLY' && data.opensAt) {
          setState({ kind: 'early', opensAt: data.opensAt, startsAt: data.startsAt, message });
        } else {
          setState({ kind: 'error', message });
        }
        return;
      }
      startGuestSession(data.accessToken, data.user);
      router.replace(`/consultations/${data.bookingId}`);
    } catch {
      setState({ kind: 'error', message: 'We could not reach the server. Please check your connection and try again.' });
    }
  }, [params?.token, router, startGuestSession]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void exchange();
  }, [exchange]);

  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: 'var(--color-cream-base, #FAF6EE)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          background: '#fff',
          border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.35))',
          borderRadius: 22,
          padding: '34px 28px',
          textAlign: 'center',
          boxShadow: '0 8px 30px rgba(42, 23, 15, 0.06)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
          <ChekupCrossLogo />
        </div>

        {state.kind === 'loading' && (
          <>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: '0 0 8px' }}>
              Opening your consultation…
            </h1>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', margin: 0 }}>One moment while we get your room ready.</p>
          </>
        )}

        {state.kind === 'early' && (
          <>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: '0 0 8px' }}>
              Not open just yet
            </h1>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', margin: '0 0 6px', lineHeight: 1.5 }}>
              Your room opens at <strong>{formatClockTime(state.opensAt)} {formatZoneAbbr(state.opensAt)}</strong>
              {state.startsAt ? (
                <>
                  {' '}
                  (15 minutes before your {formatClockTime(state.startsAt)} start).
                </>
              ) : (
                '.'
              )}
            </p>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', margin: '0 0 18px', fontSize: '0.9rem' }}>
              Come back to this same button in your email then. The room closes when your booked time is over.
            </p>
            <button
              type="button"
              onClick={() => void exchange()}
              style={{
                padding: '12px 24px',
                borderRadius: 12,
                border: 'none',
                background: 'var(--color-chocolate-base, #2A170F)',
                color: '#FAF6EE',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Check again
            </button>
          </>
        )}

        {state.kind === 'error' && (
          <>
            <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--color-chocolate-base, #2A170F)', margin: '0 0 8px' }}>
              We couldn&apos;t open this link
            </h1>
            <p style={{ color: 'var(--color-cream-text-muted, #6B5E55)', margin: '0 0 18px', lineHeight: 1.5 }}>{state.message}</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => void exchange()}
                style={{
                  padding: '12px 22px',
                  borderRadius: 12,
                  border: '1px solid var(--color-gold-border, rgba(223, 171, 98, 0.45))',
                  background: '#fff',
                  color: 'var(--color-chocolate-base, #2A170F)',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <Link
                href={QUICK_BOOK_ONLY ? QUICK_BOOK_URL : '/'}
                style={{
                  padding: '12px 22px',
                  borderRadius: 12,
                  background: 'var(--color-chocolate-base, #2A170F)',
                  color: '#FAF6EE',
                  fontWeight: 700,
                  textDecoration: 'none',
                }}
              >
                Book a consultation
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
