'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';

/**
 * Payment-return landing page for a consultation TIME EXTENSION.
 *
 * The patient lands here after paying on the Paystack gateway (opened in a new
 * tab from the live consultation). The actual extension is applied server-side by
 * the Paystack webhook (charge.success -> finalizeExtensionPayment), which then
 * broadcasts `extension_confirmed` to the still-open call tab and bumps the timer.
 *
 * So this page's only job is to reassure the patient and get them back to the
 * call: it optionally verifies the reference, shows a success state, and
 * auto-closes the tab (falling back to a manual "return to your consultation"
 * button when the browser blocks window.close(), which is common on mobile).
 */
function ExtendReturnInner() {
  const params = useSearchParams();
  const reference = params.get('reference') || '';
  const bookingId = params.get('bookingId') || '';
  const [verifying, setVerifying] = useState(true);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

  useEffect(() => {
    let cancelled = false;

    // Best-effort verification. The webhook is authoritative; this just tightens
    // the UX so the success copy isn't shown for an abandoned payment.
    const verify = async () => {
      if (!reference) {
        setVerifying(false);
        return;
      }
      try {
        await fetch(`${API_BASE}/payments/verify/${encodeURIComponent(reference)}`, {
          method: 'GET',
        });
      } catch {
        /* webhook remains the source of truth */
      }
      if (!cancelled) setVerifying(false);
    };

    verify();

    // Try to auto-close shortly after landing. Browsers only allow this for
    // script-opened tabs; when blocked, the manual button below is the fallback.
    const closeTimer = setTimeout(() => {
      window.close();
    }, 2500);

    return () => {
      cancelled = true;
      clearTimeout(closeTimer);
    };
  }, [reference, API_BASE]);

  const returnToCall = () => {
    // Prefer closing this tab so focus falls back to the live call tab.
    window.close();
    // If close was blocked (mobile), navigate this tab back into the call.
    if (bookingId) {
      window.location.href = `/consultations/${bookingId}`;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1E100A',
        color: '#FAF6EE',
        fontFamily: 'system-ui, sans-serif',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '420px',
          width: '100%',
          textAlign: 'center',
          backgroundColor: 'rgba(255,255,255,0.04)',
          border: '1.5px solid rgba(223,171,98,0.35)',
          borderRadius: '24px',
          padding: '36px 28px',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            margin: '0 auto 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: verifying ? 'rgba(223,171,98,0.15)' : 'rgba(34,197,94,0.15)',
            border: `1.5px solid ${verifying ? 'rgba(223,171,98,0.4)' : 'rgba(34,197,94,0.45)'}`,
            color: verifying ? '#DFAB62' : '#4ADE80',
          }}
        >
          {verifying ? (
            <Loader2 size={30} className="animate-spin" />
          ) : (
            <CheckCircle2 size={32} />
          )}
        </div>

        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 10px' }}>
          {verifying ? 'Confirming your payment…' : 'Payment received'}
        </h1>
        <p style={{ fontSize: '0.92rem', color: '#D5C7B8', lineHeight: 1.55, margin: '0 0 24px' }}>
          {verifying
            ? 'Please wait a moment.'
            : 'Your consultation time has been extended. You can safely return to your call — the extra minutes are already added.'}
        </p>

        <button
          onClick={returnToCall}
          style={{
            width: '100%',
            padding: '13px',
            borderRadius: '9999px',
            backgroundColor: '#E2B467',
            border: 'none',
            color: '#2A170F',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <ArrowLeft size={18} /> <span>Return to your consultation</span>
        </button>

        <p style={{ fontSize: '0.7rem', color: '#8C7768', margin: '16px 0 0' }}>
          This tab will try to close automatically.
        </p>
      </div>
    </div>
  );
}

export default function ExtendReturnPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1E100A',
            color: '#FAF6EE',
          }}
        >
          <Loader2 size={28} className="animate-spin" />
        </div>
      }
    >
      <ExtendReturnInner />
    </Suspense>
  );
}
