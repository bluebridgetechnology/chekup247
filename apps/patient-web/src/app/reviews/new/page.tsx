'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Landing route for the "How was your consultation?" email and notification links.
 * Sends the patient to their booking with the review dialog ready (and the star they tapped).
 */
export default function ReviewLandingPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const bookingId = params.get('bookingId');
    const rating = Number(params.get('rating'));
    if (!bookingId) {
      router.replace('/appointments');
      return;
    }
    const qs = new URLSearchParams({ review: '1' });
    if (rating >= 1 && rating <= 5) qs.set('rating', String(rating));
    router.replace(`/bookings/${encodeURIComponent(bookingId)}?${qs.toString()}`);
  }, [router]);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader2 className="animate-spin" size={28} />
    </div>
  );
}
