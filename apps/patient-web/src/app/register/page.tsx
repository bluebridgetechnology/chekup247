import type { Metadata } from 'next';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Create Your Patient Account — ChekUp247',
  description: 'Create a ChekUp247 patient account to book verified doctors and attend secure online video consultations.',
  alternates: { canonical: '/register' },
  // Auth pages must not be indexed.
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return <RegisterClient />;
}
