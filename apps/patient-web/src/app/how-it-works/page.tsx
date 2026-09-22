import type { Metadata } from 'next';
import HowItWorksClient from './HowItWorksClient';

export const metadata: Metadata = {
  title: 'How Virtual Consultations Work — 3 Simple Steps | ChekUp247',
  description:
    'See how ChekUp247 works: choose a verified doctor and time slot, pay securely, attend your encrypted video consultation, and receive a valid e-prescription.',
  alternates: { canonical: '/how-it-works' },
  openGraph: {
    title: 'How Virtual Consultations Work — 3 Simple Steps | ChekUp247',
    description:
      'Choose a verified doctor, attend a secure video consultation, and receive a valid e-prescription — book online healthcare in a few simple steps.',
    url: '/how-it-works',
    type: 'website',
  },
};

// HowTo structured data — mirrors the on-page patient journey steps.
const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: 'How to book an online doctor consultation on ChekUp247',
  description:
    'Book a verified HPCSA doctor, attend a secure video consultation, and receive a valid e-prescription in a few simple steps.',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Choose your doctor & time slot',
      text:
        'Browse our network of certified healthcare professionals and specialists. Filter by specialty, language, and location, then select a time that works for you.',
      url: 'https://chekup247.com/doctors',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Secure payment',
      text:
        'Pay safely using your Visa, Mastercard, or other supported payment methods. Your payment is held securely and only disbursed to the doctor after your consultation is complete.',
      url: 'https://chekup247.com/pricing',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Join your video call',
      text:
        'At your scheduled time, join your encrypted video room and talk face-to-face with your physician from any device.',
      url: 'https://chekup247.com/how-it-works',
    },
    {
      '@type': 'HowToStep',
      position: 4,
      name: 'Receive your e-prescription',
      text:
        'After your consultation, download your valid e-prescription, sick note, and itemized medical aid receipt directly from your dashboard.',
      url: 'https://chekup247.com/how-it-works',
    },
  ],
};

export default function HowItWorksPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <HowItWorksClient />
    </>
  );
}
