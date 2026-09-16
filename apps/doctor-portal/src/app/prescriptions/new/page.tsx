'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EPrescriptionBuilderPage from '../../consultations/[bookingId]/prescribe/page';

function NewPrescriptionRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    if (bookingId) {
      router.replace(`/consultations/${bookingId}/prescribe`);
    }
  }, [bookingId, router]);

  return <EPrescriptionBuilderPage />;
}

export default function NewPrescriptionRedirectPage() {
  return (
    <Suspense fallback={<div style={{ padding: '24px', color: '#94a3b8' }}>Loading prescription builder...</div>}>
      <NewPrescriptionRedirectContent />
    </Suspense>
  );
}
