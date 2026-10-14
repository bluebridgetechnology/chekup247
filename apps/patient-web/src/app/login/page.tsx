import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SHOW_PATIENT_AUTH } from '../../lib/featureFlags';
import { QUICK_BOOK_URL } from '../../lib/quickBook';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In — ChekUp247',
  description: 'Sign in to your ChekUp247 patient account to manage bookings, consultations and prescriptions.',
  alternates: { canonical: '/login' },
  // Auth pages must not be indexed.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  // Quick-Book-only mode: patient sign-in / registration are hidden
  if (!SHOW_PATIENT_AUTH) redirect(QUICK_BOOK_URL);
  return <LoginClient />;
}
