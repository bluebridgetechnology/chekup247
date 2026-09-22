import type { Metadata } from 'next';
import AboutClient from './AboutClient';

export const metadata: Metadata = {
  title: 'About ChekUp247 — Virtual Healthcare for All South Africans',
  description:
    'Our mission is to make quality telehealth accessible across all 9 provinces — connecting South Africans with verified HPCSA doctors for secure virtual consultations.',
  alternates: { canonical: '/about' },
  openGraph: {
    title: 'About ChekUp247 — Virtual Healthcare for All South Africans',
    description:
      'Making quality telehealth accessible across all 9 South African provinces with verified HPCSA doctors and secure virtual consultations.',
    url: '/about',
    type: 'website',
  },
};

// Organization structured data — reinforces the brand knowledge panel.
const organizationJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ChekUp247 Telehealth',
  legalName: 'ChekUp247 (Pty) Ltd',
  url: 'https://chekup247.com',
  logo: 'https://chekup247.com/logo.png',
  description:
    'A certified South African telehealth platform connecting patients with HPCSA-registered doctors for virtual consultations, e-prescriptions and sick notes across all nine provinces.',
  areaServed: {
    '@type': 'Country',
    name: 'South Africa',
  },
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'customer support',
    telephone: '+27-11-000-0247',
    email: 'support@chekup247.com',
    availableLanguage: ['English'],
  },
};

export default function AboutPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <AboutClient />
    </>
  );
}
