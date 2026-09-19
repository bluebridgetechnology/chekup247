import type { Metadata } from 'next';
import '../styles/globals.css';
import { LayoutShell } from '../components/LayoutShell';
import { AuthProvider } from '../context/AuthContext';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chekup247.co.za';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ChekUp247 — Telehealth & Virtual Doctor Consultations in South Africa',
    template: '%s | ChekUp247 Telehealth',
  },
  description:
    'Consult verified HPCSA doctors in South Africa 24/7. Fast, secure virtual video consultations, sick notes, and valid e-prescriptions with ICD-10 diagnostic codes.',
  keywords: [
    'Telehealth South Africa',
    'Online Doctor Consultation',
    'Virtual GP South Africa',
    'HPCSA Registered Doctors',
    'E-prescription South Africa',
    'Medical Aid Telehealth Discovery Bonitas',
    'ChekUp247',
    'Sick Note Online',
  ],
  authors: [{ name: 'ChekUp247 Clinical Team' }],
  creator: 'ChekUp247 (Pty) Ltd',
  publisher: 'ChekUp247 Healthcare',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_ZA',
    url: siteUrl,
    siteName: 'ChekUp247 Telehealth',
    title: 'ChekUp247 — Virtual Healthcare with Verified HPCSA Doctors',
    description:
      'Skip the clinic waiting room. Connect with certified general practitioners and specialists in South Africa in minutes.',
    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'ChekUp247 Telehealth Platform South Africa',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ChekUp247 — Virtual Doctor Consultations in South Africa',
    description:
      'Certified HPCSA medical doctors available 24/7 for video consultations and e-prescriptions across South Africa.',
    images: [`${siteUrl}/og-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MedicalBusiness',
    name: 'ChekUp247 Telehealth',
    alternateName: 'ChekUp247 (Pty) Ltd',
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    description:
      'Certified South African telehealth platform connecting patients with HPCSA-registered medical doctors for virtual consultations and valid e-prescriptions.',
    telephone: '+27-11-000-0247',
    email: 'support@chekup247.co.za',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '150 West Street',
      addressLocality: 'Sandton',
      addressRegion: 'Gauteng',
      postalCode: '2196',
      addressCountry: 'ZA',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: -26.1076,
      longitude: 28.0567,
    },
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
        'Sunday',
      ],
      opens: '00:00',
      closes: '23:59',
    },
    medicalSpecialty: [
      'GeneralPractice',
      'Pediatrics',
      'Dermatology',
      'Psychiatry',
      'PublicHealth',
    ],
    availableService: [
      {
        '@type': 'MedicalProcedure',
        name: 'Telehealth Video Consultation',
      },
      {
        '@type': 'MedicalProcedure',
        name: 'Electronic Prescription (ICD-10 Coded)',
      },
    ],
    priceRange: 'R350 - R950',
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* WCAG 2.1 AA Accessibility: Skip to Main Content */}
        <a href="#main-content" className="skip-to-content">
          Skip to main content
        </a>
        <AuthProvider>
          <LayoutShell>{children}</LayoutShell>
        </AuthProvider>
      </body>
    </html>
  );
}
