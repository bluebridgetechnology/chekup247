import type { Metadata } from 'next';
import PricingClient from './PricingClient';

export const metadata: Metadata = {
  title: 'Transparent Telehealth Pricing — Consultations from R350 | ChekUp247',
  description:
    'Clear flat-rate pricing for GP and specialist video consultations with no hidden fees. See what each consultation costs before you book on ChekUp247.',
  alternates: { canonical: '/pricing' },
  openGraph: {
    title: 'Transparent Telehealth Pricing — Consultations from R350 | ChekUp247',
    description:
      'Flat-rate GP and specialist video consultation pricing with no hidden fees.',
    url: '/pricing',
    type: 'website',
  },
};

export default function PricingPage() {
  return <PricingClient />;
}
