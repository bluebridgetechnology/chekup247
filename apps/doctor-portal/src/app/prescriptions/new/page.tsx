'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { SelectPrescriptionPatientModal } from '../../../components/prescriptions/SelectPrescriptionPatientModal';
import { SolarIcon } from '../../../components/common/SolarIcon';
import Link from 'next/link';

function NewPrescriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');

  useEffect(() => {
    if (bookingId) {
      router.replace(`/consultations/${bookingId}/prescribe`);
    }
  }, [bookingId, router]);

  if (bookingId) {
    return (
      <div style={{ padding: '40px 24px', textAlign: 'center', color: 'var(--color-cream-text-muted, #6B5E55)' }}>
        <p>Loading prescription builder for consultation #{bookingId.substring(0, 8)}...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '32px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/prescriptions"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: 'var(--color-gold-bronze, #B88647)',
            textDecoration: 'none',
            fontWeight: 700,
            marginBottom: '12px',
          }}
        >
          <SolarIcon name="arrow-left-linear" size={16} color="var(--color-gold-bronze, #B88647)" />
          <span>Back to E-Prescriptions</span>
        </Link>
        <h1 className="page-title">Raise New Electronic Prescription</h1>
        <p className="page-subtitle">
          Select a patient who has completed a consultation with you to generate an HPCSA-compliant digital prescription.
        </p>
      </div>

      <SelectPrescriptionPatientModal
        isOpen={true}
        onClose={() => router.push('/prescriptions')}
      />
    </div>
  );
}

export default function NewPrescriptionPage() {
  return (
    <Suspense fallback={<div style={{ padding: '36px', color: '#94a3b8' }}>Loading prescription flow...</div>}>
      <NewPrescriptionContent />
    </Suspense>
  );
}
