'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SolarIcon } from './SolarIcon';

export interface Doctor {
  id: string;
  name: string;
  initials: string;
  title: string;
  specialty: string;
  rating: number;
  reviewsCount: number;
  rate: string;
  experience: string;
  location: string;
  nextAvailable: string;
  image: string;
  tags: string[];
}

export const FEATURED_DOCTORS: Doctor[] = [
  {
    id: 'doc-1',
    name: 'Dr. Thabo Molefe',
    initials: 'TM',
    title: 'MBChB (Wits), FCFP(SA)',
    specialty: 'General Practitioner & Family Health',
    rating: 4.95,
    reviewsCount: 58,
    rate: 'R450',
    experience: '12+ yrs exp',
    location: 'Sandton, Johannesburg',
    nextAvailable: 'Available today',
    image: '/images/doctor_thabo.jpg',
    tags: ['Flu & Infections', 'Chronic Script Renewal', 'Wellness'],
  },
  {
    id: 'doc-2',
    name: 'Dr. Sarah Van Der Merwe',
    initials: 'SV',
    title: 'MBChB (UCT), MMed (Paed)',
    specialty: 'Specialist Paediatrician',
    rating: 4.98,
    reviewsCount: 84,
    rate: 'R650',
    experience: '15+ yrs exp',
    location: 'Claremont, Cape Town',
    nextAvailable: 'Available today',
    image: '/images/doctor_sarah.jpg',
    tags: ['Infant Nutrition', 'Child Health', 'Asthma'],
  },
  {
    id: 'doc-3',
    name: 'Dr. Kevin Pillay',
    initials: 'KP',
    title: 'MBChB (UKZN), Dip Obst',
    specialty: 'Family Physician & Sports Medicine',
    rating: 4.92,
    reviewsCount: 42,
    rate: 'R420',
    experience: '9+ yrs exp',
    location: 'Umhlanga, Durban',
    nextAvailable: 'Available today',
    image: '/images/doctor_kevin.jpg',
    tags: ['Joint Injuries', 'Hypertension', "Men's Health"],
  },
  {
    id: 'doc-4',
    name: 'Dr. Lerato Khumalo',
    initials: 'LK',
    title: 'MBChB (Pretoria), FC Derm(SA)',
    specialty: 'Consultant Dermatologist',
    rating: 4.97,
    reviewsCount: 63,
    rate: 'R580',
    experience: '11+ yrs exp',
    location: 'Rosebank, Johannesburg',
    nextAvailable: 'Available today',
    image: '/images/doctor_thabo.jpg',
    tags: ['Acne & Eczema', 'Skin Screening', 'Hair Loss'],
  },
  {
    id: 'doc-5',
    name: 'Dr. Johan Botha',
    initials: 'JB',
    title: 'MBChB (Stell), FCP(SA)',
    specialty: 'Cardiovascular & Internal Medicine',
    rating: 4.94,
    reviewsCount: 51,
    rate: 'R680',
    experience: '14+ yrs exp',
    location: 'Pretoria East, Gauteng',
    nextAvailable: 'Available today',
    image: '/images/doctor_sarah.jpg',
    tags: ['Heart Health', 'Hypertension', 'Lipid Panel'],
  },
  {
    id: 'doc-6',
    name: 'Dr. Amina Patel',
    initials: 'AP',
    title: 'MBChB (Wits), FCOG(SA)',
    specialty: "Obstetrics & Women's Health",
    rating: 4.96,
    reviewsCount: 77,
    rate: 'R520',
    experience: '10+ yrs exp',
    location: 'Durban North, KwaZulu-Natal',
    nextAvailable: 'Available today',
    image: '/images/doctor_kevin.jpg',
    tags: ['Hormone Health', 'Family Planning', 'Wellness'],
  },
];

export function FeaturedDoctorsSection() {
  const [startIndex, setStartIndex] = useState(0);
  const itemsPerPage = 3;
  const maxStartIndex = Math.max(0, FEATURED_DOCTORS.length - itemsPerPage);

  const handlePrev = () => {
    setStartIndex((prev) => (prev > 0 ? prev - 1 : maxStartIndex));
  };

  const handleNext = () => {
    setStartIndex((prev) => (prev < maxStartIndex ? prev + 1 : 0));
  };

  const visibleDoctors = FEATURED_DOCTORS.slice(startIndex, startIndex + itemsPerPage);

  return (
    <section className="doctors-section" id="practitioners">
      {/* Subtle organic champagne decorative background element */}
      <svg
        className="doctors-decorative-organic"
        viewBox="0 0 520 680"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path
          d="M-60 120 C160 50, 480 160, 460 380 C440 600, 180 660, -60 700 Z"
          fill="var(--color-gold-base)"
          fillOpacity="0.12"
        />
      </svg>

      <div className="doctors-container">
        {/* Section Header */}
        <div className="doctors-header">
          <div style={{ maxWidth: '660px' }}>
            <span
              style={{
                display: 'block',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                color: 'var(--color-gold-base)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                marginBottom: '10px',
              }}
            >
              TOP VERIFIED PRACTITIONERS
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-heading), sans-serif',
                fontSize: 'clamp(2.1rem, 3.4vw, 2.85rem)',
                fontWeight: 700,
                color: 'var(--color-chocolate-base)',
                letterSpacing: '-0.025em',
                lineHeight: 1.18,
                marginBottom: '14px',
              }}
            >
              Consult with Trusted
              <br />
              South African Doctors
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.985rem',
                color: 'var(--color-chocolate-muted)',
                lineHeight: 1.6,
                maxWidth: '480px',
              }}
            >
              All physicians are HPCSA-registered, board-certified, and vetted for exceptional virtual care and patient confidentiality.
            </p>
          </div>

          <div className="doctors-header-actions">
            <Link
              href="/doctors"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                color: 'var(--color-chocolate-base)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 600,
                fontSize: '0.925rem',
                height: '52px',
                padding: '0 28px',
                borderRadius: '9999px',
                border: '1px solid var(--color-gold-border)',
                backgroundColor: 'var(--color-cream-surface)',
                textDecoration: 'none',
                boxShadow: '0 2px 10px rgba(42, 23, 15, 0.03)',
                transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="touch-target"
            >
              <span>Browse All Doctors (120+ available)</span>
              <SolarIcon name="arrow-right-linear" size={16} color="var(--color-chocolate-base)" />
            </Link>

            {/* Realigned Carousel Navigation Controls */}
            <div className="doctors-carousel-controls">
              <button
                type="button"
                onClick={handlePrev}
                aria-label="Previous doctors"
                className="doctors-carousel-btn touch-target"
              >
                <SolarIcon name="arrow-left-linear" size={18} color="var(--color-chocolate-base)" />
              </button>
              <button
                type="button"
                onClick={handleNext}
                aria-label="Next doctors"
                className="doctors-carousel-btn touch-target"
              >
                <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base)" />
              </button>
            </div>
          </div>
        </div>

        {/* Doctor Cards Showcase Grid (Full-width, perfectly balanced) */}
        <div className="doctors-grid">
            {visibleDoctors.map((doc) => (
              <div key={doc.id} className="doctor-card">
                <div>
                  {/* Doctor Photograph with Floating Badges */}
                  <div className="doctor-image-wrapper">
                    <Image
                      src={doc.image}
                      alt={doc.name}
                      width={640}
                      height={400}
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      priority
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />

                    {/* Floating Availability Badge (Upper-Right) */}
                    <div className="doctor-availability-badge">
                      <span className="doctor-availability-dot" />
                      <span>{doc.nextAvailable}</span>
                    </div>

                    {/* Floating Rating Badge (Lower-Left) */}
                    <div className="doctor-rating-badge">
                      <SolarIcon name="star-bold" size={13} color="var(--color-gold-primary)" />
                      <span>{doc.rating}</span>
                      <span style={{ color: 'var(--color-chocolate-muted)', fontWeight: 500 }}>
                        ({doc.reviewsCount})
                      </span>
                    </div>
                  </div>

                  {/* Doctor Identity Area */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '12px',
                    }}
                  >
                    {/* Initials Badge */}
                    <div className="doctor-avatar-circle">
                      <span>{doc.initials}</span>
                    </div>

                    {/* Name, Specialty & Qualifications */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <h3
                        style={{
                          fontFamily: 'var(--font-heading), sans-serif',
                          fontSize: '1.125rem',
                          fontWeight: 700,
                          color: 'var(--color-chocolate-base)',
                          marginBottom: '2px',
                          lineHeight: 1.25,
                        }}
                      >
                        {doc.name}
                      </h3>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          color: 'var(--color-gold-base)',
                          marginBottom: '2px',
                        }}
                      >
                        {doc.specialty}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--font-sans)',
                          fontSize: '0.75rem',
                          color: 'var(--color-chocolate-muted)',
                        }}
                      >
                        {doc.title}
                      </p>
                    </div>
                  </div>

                  {/* Location Row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.8125rem',
                      color: 'var(--color-chocolate-muted)',
                      marginBottom: '16px',
                    }}
                  >
                    <SolarIcon name="map-point-linear" size={14} color="var(--color-gold-base)" />
                    <span>{doc.location}</span>
                  </div>

                  {/* Specialty Tags */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '10px',
                    }}
                  >
                    {doc.tags.map((tag, idx) => (
                      <span key={idx} className="doctor-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Primary Booking Action & Secondary Arrow */}
                <div className="doctor-booking-actions">
                  <Link href="/doctors" className="doctor-book-btn touch-target">
                    <span>Book Consultation</span>
                    <SolarIcon name="calendar-linear" size={16} color="var(--color-gold-base)" />
                  </Link>

                  <Link
                    href={`/doctors`}
                    aria-label={`View profile for ${doc.name}`}
                    className="doctor-arrow-btn touch-target"
                  >
                    <SolarIcon name="arrow-right-linear" size={18} color="var(--color-chocolate-base)" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
      </div>
    </section>
  );
}
