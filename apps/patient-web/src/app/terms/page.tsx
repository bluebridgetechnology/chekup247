import type { Metadata } from 'next';
import TermsClient from './TermsClient';

export const metadata: Metadata = {
  title: 'Terms of Service — ChekUp247 Telehealth Agreement',
  description:
    'The terms and conditions governing your use of the ChekUp247 telehealth platform and services.',
  alternates: { canonical: '/terms' },
  // Legal document, not a search target.
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return <TermsClient />;
}
