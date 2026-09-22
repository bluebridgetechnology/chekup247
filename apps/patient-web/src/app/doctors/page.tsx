import type { Metadata } from 'next';
import DoctorsClient from './DoctorsClient';

export const metadata: Metadata = {
  title: 'Find a Verified Doctor Online — HPCSA GPs & Specialists | ChekUp247',
  description:
    'Search HPCSA-registered general practitioners and specialists for secure video consultations. Filter by specialty, language and availability, then book online.',
  alternates: { canonical: '/doctors' },
  openGraph: {
    title: 'Find a Verified Doctor Online — HPCSA GPs & Specialists | ChekUp247',
    description:
      'Browse verified HPCSA GPs and specialists for online video consultations across South Africa.',
    url: '/doctors',
    type: 'website',
  },
};

// ItemList structured data — a directory-listing signal for search engines.
// The live directory is fetched client-side, so this describes the specialties
// the directory covers rather than fabricating specific practitioner entries.
const itemListJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  name: 'ChekUp247 Verified Doctor Directory',
  description:
    'Verified HPCSA-registered general practitioners and specialists available for online video consultations in South Africa.',
  itemListElement: [
    'General Practice',
    'Paediatrics',
    'Dermatology',
    'Psychiatry',
    'Public Health',
  ].map((specialty, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: `${specialty} — Online Consultations`,
  })),
};

export default function DoctorsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <DoctorsClient />
    </>
  );
}
