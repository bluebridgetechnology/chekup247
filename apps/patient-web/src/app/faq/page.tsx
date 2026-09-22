import type { Metadata } from 'next';
import FaqClient from './FaqClient';
import { ALL_FAQS } from './faq-data';

export const metadata: Metadata = {
  title: 'FAQ — Virtual Consultations, Prescriptions & Medical Aid | ChekUp247',
  description:
    'Answers on booking online doctor consultations, payments and medical aid claims, e-prescriptions and sick notes, POPIA privacy, cancellations and refunds.',
  alternates: { canonical: '/faq' },
  openGraph: {
    title: 'FAQ — Virtual Consultations, Prescriptions & Medical Aid | ChekUp247',
    description:
      'Everything you need to know about ChekUp247: bookings, medical aid claims, e-prescriptions, sick notes, privacy and refunds.',
    url: '/faq',
    type: 'website',
  },
};

// FAQPage structured data — every Q&A on the page, sourced from the same
// ALL_FAQS array the accordion renders (single source of truth).
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: ALL_FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.a,
    },
  })),
};

export default function FaqPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqClient />
    </>
  );
}
