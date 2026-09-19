'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ConsultationsIndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/appointments');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F4EC',
        gap: '16px',
      }}
    >
      <Loader2 size={36} className="animate-spin" style={{ color: '#B88647' }} />
      <p style={{ color: '#6B5E55', fontSize: '0.95rem' }}>
        Redirecting to your appointments...
      </p>
    </div>
  );
}
