import type { Metadata } from 'next';
import LoginClient from './LoginClient';

export const metadata: Metadata = {
  title: 'Sign In — ChekUp247',
  description: 'Sign in to your ChekUp247 patient account to manage bookings, consultations and prescriptions.',
  alternates: { canonical: '/login' },
  // Auth pages must not be indexed.
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginClient />;
}
