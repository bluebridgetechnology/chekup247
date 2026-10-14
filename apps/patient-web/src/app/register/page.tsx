import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SHOW_PATIENT_AUTH } from '../../lib/featureFlags';
import { QUICK_BOOK_URL } from '../../lib/quickBook';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Create Your Patient Account — ChekUp247',
  description: 'Create a ChekUp247 patient account to book verified doctors and attend secure online video consultations.',
  alternates: { canonical: '/register' },
  // Auth pages must not be indexed.
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  // Quick-Book-only mode: patient sign-in / registration are hidden
  if (!SHOW_PATIENT_AUTH) redirect(QUICK_BOOK_URL);
  return <RegisterClient />;
}
