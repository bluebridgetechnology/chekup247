'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function CheckoutRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/bookings/checkout${params ? `?${params}` : ''}`);
  }, [router, searchParams]);

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-brand-600)' }} />
    </div>
  );
}

export default function CheckoutRedirectPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '80vh' }} />}>
      <CheckoutRedirectInner />
    </Suspense>
  );
}
