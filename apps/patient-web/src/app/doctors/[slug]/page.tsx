import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '../../../components/Breadcrumbs';
import { DoctorBookingCalendar } from '../../../components/DoctorBookingCalendar';
import { DoctorProfileContent } from '../../../components/DoctorProfileContent';

interface PageProps {
  params: Promise<{ slug: string }>;
}

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
    // Do not render fabricated clinical data when the API is unavailable.
  }

  return null;

}

async function getDoctorReviewsData(idOrSlug: string) {
  try {
    const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const apiUrl = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api/v1`;
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
    ...(doctor.rate_per_hour ? { priceRange: `R${doctor.rate_per_hour}` } : {}),
    ...(doctor.facility_address
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: doctor.facility_address,
            addressCountry: 'ZA',
          },
        }
      : {}),
    ...(doctor.reviews_count
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Number(doctor.rating_avg || 0).toString(),
            reviewCount: Number(doctor.reviews_count).toString(),
          },
        }
      : {}),
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
