import type { Metadata } from 'next';
import HomeClient from './HomeClient';
import { HOMEPAGE_FAQS } from '../components/faq-data';

export const metadata: Metadata = {
  title: 'Online Doctor Consultations in South Africa | ChekUp247',
  description:
    'Consult verified HPCSA doctors online 24/7. Book virtual GP and specialist video consultations, get valid e-prescriptions and sick notes, and claim from your medical aid.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'Online Doctor Consultations in South Africa | ChekUp247',
    description:
      'Consult verified HPCSA doctors online 24/7. Virtual GP and specialist video consultations, e-prescriptions, sick notes and medical aid receipts.',
    url: '/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Online Doctor Consultations in South Africa | ChekUp247',
    description:
      'Consult verified HPCSA doctors online 24/7. Virtual GP and specialist video consultations, e-prescriptions and sick notes.',
  },
};

// FAQPage structured data — sourced from the same HOMEPAGE_FAQS the UI renders,
// so the schema can never drift from what the visitor actually sees.
const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: HOMEPAGE_FAQS.map((faq) => ({
    '@type': 'Question',
    name: faq.q,
    acceptedAnswer: {
      '@type': 'Answer',
      text: faq.a,
    },
  })),
};

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <HomeClient />
    </>
  );
}
