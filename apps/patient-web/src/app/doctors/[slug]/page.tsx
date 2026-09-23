import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { DoctorBookingCalendar } from '../../../components/DoctorBookingCalendar';
import { DoctorProfileContent } from '../../../components/DoctorProfileContent';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Fallback doctor dataset for local SSR rendering when API is offline or initial boot
const MOCK_DOCTORS: Record<string, any> = {
  'dr-thabo-molefe': {
    id: 'doc-1',
    slug: 'dr-thabo-molefe',
    user: { full_name: 'Dr. Thabo Molefe', email: 'thabo.molefe@locumstaff.co.za' },
    hpcsa_number: 'MP 0689432',
    specialty: '',
    bio: 'Dr. Thabo Molefe is a compassionate General Practitioner with over 12 years of clinical practice across Gauteng. He holds an MBChB from the University of the Witwatersrand and specializes in acute infection management, metabolic disorders, and adolescent wellness.',
    rate_per_hour: 850.0,
    consultation_duration_minutes: 30,
    rating_avg: 5.0,
    reviews_count: 58,
    experience_years: '12+ Years Experience',
    facility_name: 'Netcare Sunninghill Hospital Suites',
    facility_address: 'Cnr Witkoppen & Nanyuki Rd, Sunninghill, Sandton, 2157',
    photo_url: '/images/doctor_thabo.jpg',
    education: [
      'MBChB — University of the Witwatersrand (2012)',
      'Diploma in Primary Healthcare & Chronic Disease (SAFP)',
      'Advanced Cardiac Life Support (ACLS) Certified',
    ],
    languages: ['English', 'isiZulu', 'Sesotho'],
    consultation_types: [
      'Video Telehealth Consultation',
      'Digital Prescription Renewal',
      'Medical Certificates / Sick Notes',
      'Specialist Referral Letters',
      'Chronic Medication Management',
    ],
    offers_video: true,
    offers_audio: true,
    offers_in_clinic: true,
    accepts_medical_aid: true,
    verification_status: 'verified',
    is_board_certified: true,
    board_certification_title: 'Board Certified',
  },
  'dr-sarah-van-der-merwe': {
    id: 'doc-2',
    slug: 'dr-sarah-van-der-merwe',
    user: { full_name: 'Dr. Sarah van der Merwe', email: 'sarah.vdm@locumstaff.co.za' },
    hpcsa_number: 'MP 0741890',
    specialty: '',
    bio: 'Dr. Sarah van der Merwe completed her medical degree at Stellenbosch University and has a dedicated focus on women’s wellness, hormonal health, preventive medicine, and paediatric consultations. She is known for her thorough, patient-first approach to telehealth.',
    rate_per_hour: 900.0,
    consultation_duration_minutes: 45,
    rating_avg: 4.9,
    reviews_count: 72,
    experience_years: '10+ Years Experience',
    facility_name: 'Mediclinic Cape Town Medical Suites',
    facility_address: '21 Hof Street, Oranjezicht, Cape Town, 8001',
    photo_url: '/images/doctor_sarah.jpg',
    education: [
      'MBChB — Stellenbosch University (2014)',
      'Diploma in Obstetrics & Gynaecology (Dip Obst SA)',
    ],
    languages: ['English', 'Afrikaans'],
    consultation_types: ['Video Telehealth', 'Women’s Health Screening', 'Contraceptive Counselling'],
    offers_video: true,
    offers_audio: false,
    offers_in_clinic: false,
    accepts_medical_aid: true,
    verification_status: 'verified',
    is_board_certified: true,
    board_certification_title: 'Board Certified',
  },
  'dr-priya-naidoo': {
    id: 'doc-3',
    slug: 'dr-priya-naidoo',
    user: { full_name: 'Dr. Priya Naidoo', email: 'priya.naidoo@locumstaff.co.za' },
    hpcsa_number: 'MP 0812304',
    specialty: '',
    bio: 'Dr. Priya Naidoo has 14 years of primary healthcare experience in KwaZulu-Natal. Specializing in diabetes, hypertension management, and lifestyle medicine, she provides thorough virtual consultations for chronic patients.',
    rate_per_hour: 780.0,
    consultation_duration_minutes: 60, // 1 hr consult example
    rating_avg: 4.85,
    reviews_count: 43,
    experience_years: '14+ Years Experience',
    facility_name: 'Life Entabeni Hospital Consulting Rooms',
    facility_address: '148 Mazisi Kunene Rd, Glenwood, Durban, 4001',
    photo_url: '/images/doctor_kevin.jpg',
    education: ['MBChB — University of KwaZulu-Natal (2010)', 'Fellowship in Primary Care Diabetology'],
    languages: ['English', 'isiZulu'],
    consultation_types: ['Chronic Condition Management', 'Lab Results Review', 'Video Telehealth'],
    offers_video: true,
    offers_audio: true,
    offers_in_clinic: false,
    accepts_medical_aid: false,
    verification_status: 'verified',
    is_board_certified: true,
    board_certification_title: 'Fellowship Certified',
  },
};

async function getDoctorData(slug: string) {
  try {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const apiBase = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api/v1`;
    const res = await fetch(`${apiBase}/doctors/${slug}`, {
      next: { revalidate: 60 },
    });

    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {
    // Return mock data if API is not running during SSG/build
  }

  return null;

  /* Generate generic profile matching slug if not found
  const cleanName = slug
    .replace(/^dr-?/i, '')
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

  return {
    id: 'doc-auto',
    slug,
    user: { full_name: `Dr. ${cleanName}` },
    hpcsa_number: 'MP 0784902',
    specialty: '',
    bio: `Dr. ${cleanName} is an HPCSA-registered General Practitioner practicing in South Africa, providing patient consultations via ChekUp247 Telehealth.`,
    rate_per_hour: 850.0,
    consultation_duration_minutes: 30,
    rating_avg: 5.0,
    reviews_count: 58,
    experience_years: '12+ Years Experience',
    facility_name: 'Netcare Sunninghill Hospital Suites',
    facility_address: 'Cnr Witkoppen & Nanyuki Rd, Sunninghill, Sandton, 2157',
    photo_url: '/images/doctor_thabo.jpg',
    education: ['MBChB — South African Medical Faculty'],
    languages: ['English'],
    consultation_types: [
      'Video Telehealth Consultation',
      'Digital Prescription Renewal',
      'Medical Certificates / Sick Notes',
      'Specialist Referral Letters',
      'Chronic Medication Management',
    ],
    offers_video: true,
    offers_audio: true,
    offers_in_clinic: false,
    accepts_medical_aid: true,
  }; */
}

async function getDoctorReviewsData(idOrSlug: string) {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';
    const res = await fetch(`${apiUrl}/reviews/doctor/${idOrSlug}`, {
      next: { revalidate: 30 },
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback on error
  }
  return null;
}

// SEO OpenGraph & Structured Data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const resolvedParams = await params;
  const doctor = await getDoctorData(resolvedParams.slug);
  if (!doctor) {
    return { title: 'Doctor profile unavailable | ChekUp247' };
  }

  const name = doctor.user?.full_name || 'Medical Doctor';
  const specialty = doctor.specialty || 'Doctor profile';
  const title = `${name} — ${specialty} | ChekUp247 Telehealth`;
  const description = doctor.bio || `View ${name}'s verified ChekUp247 practice profile.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'profile',
      images: doctor.photo_url ? [{ url: doctor.photo_url }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function DoctorProfilePage({ params }: PageProps) {
  const resolvedParams = await params;
  const doctor = await getDoctorData(resolvedParams.slug);

  if (!doctor) {
    notFound();
  }

  const reviewsData = await getDoctorReviewsData(doctor.id || resolvedParams.slug);

  const name = doctor.user?.full_name || 'Doctor';
  const displayName = name.startsWith('Dr.') || name.startsWith('Dr ') ? name : `Dr. ${name}`;

  // JSON-LD Physician Structured Data Schema
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Physician',
    name: displayName,
    medicalSpecialty: doctor.specialty,
    description: doctor.bio,
    image: doctor.photo_url,
    telephone: '+27 11 000 0247',
    priceRange: `R${doctor.rate_per_hour}`,
    address: {
      '@type': 'PostalAddress',
      streetAddress: doctor.facility_address || 'Cnr Witkoppen & Nanyuki Rd, Sunninghill, Sandton, 2157',
      addressCountry: 'ZA',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: (doctor.rating_avg || 5.0).toString(),
      reviewCount: (doctor.reviews_count || 58).toString(),
    },
  };

  return (
    <div className="doctor-profile-canvas">
      {/* Inject Google Rich Snippet JSON-LD Script */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Breadcrumb Header Bar */}
      <div className="doctor-breadcrumb-bar">
        <div className="doctor-layout-container">
          <Breadcrumbs
            items={[
              { label: 'Find a Doctor', href: '/doctors' },
              { label: displayName },
            ]}
          />
        </div>
      </div>

      {/* Main 2-Column Content Layout */}
      <div className="doctor-layout-container">
        <div className="doctor-profile-grid">
          {/* Left Column: Doctor Profile Bio, Services, Reviews */}
          <div>
            <DoctorProfileContent doctor={doctor} reviewsData={reviewsData} />
          </div>

          {/* Right Column: Sticky Instant Booking Calendar Widget */}
          <div style={{ position: 'sticky', top: '96px', zIndex: 10 }}>
            <DoctorBookingCalendar doctor={doctor} />
          </div>
        </div>
      </div>
    </div>
  );
}
