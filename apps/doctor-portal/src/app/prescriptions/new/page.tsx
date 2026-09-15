'use client';

import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import EPrescriptionBuilderPage from '../../consultations/[bookingId]/prescribe/page';

export default function NewPrescriptionRedirectPage() {
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
