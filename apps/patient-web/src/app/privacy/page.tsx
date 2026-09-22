import type { Metadata } from 'next';
import PrivacyClient from './PrivacyClient';

export const metadata: Metadata = {
  title: 'POPIA Privacy Notice — ChekUp247',
  description:
    'How ChekUp247 protects your personal and health information under POPIA (Protection of Personal Information Act) and the National Health Act.',
  alternates: { canonical: '/privacy' },
  // Legal document, not a search target.
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return <PrivacyClient />;
}
