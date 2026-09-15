'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function ConsultationRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('booking') || searchParams.get('bookingId');

  useEffect(() => {
    if (bookingId) {
      router.replace(`/consultations/${bookingId}`);
    } else {
      router.replace('/bookings');
    }
  }, [bookingId, router]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        gap: '16px',
      }}
    >
      <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
      <p style={{ color: 'var(--color-slate-600)', fontSize: '0.95rem' }}>
        Redirecting to consultation workspace...
      </p>
    </div>
  );
}

export default function ConsultationRedirectPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '60vh',
          }}
        >
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
        </div>
      }
    >
      <ConsultationRedirectInner />
    </Suspense>
  );
}
