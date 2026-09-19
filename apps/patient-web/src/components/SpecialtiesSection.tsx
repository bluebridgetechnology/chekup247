'use client';

import React from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';
import { SpecialtyIcon } from './SpecialtyIcons';

interface SpecialtyItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
}

const SPECIALTIES: SpecialtyItem[] = [
  {
    id: 'general-practitioner',
    name: 'General Practitioner',
    description: 'Everyday health, acute illness & primary care',
    iconName: 'user-circle-linear',
  },
  {
    id: 'dentist',
    name: 'Dentist',
    description: 'Oral health, toothache & dental consultations',
    iconName: 'smile-circle-linear',
  },
  {
    id: 'psychologist',
    name: 'Psychologist',
    description: 'Mental health, anxiety & therapy support',
    iconName: 'brain-linear',
  },
  {
    id: 'podiatrist',
    name: 'Podiatrist',
    description: 'Foot, ankle & lower extremity medical care',
    iconName: 'health-linear',
  },
  {
    id: 'dermatologist',
    name: 'Dermatologist',
    description: 'Skin conditions, acne, rash & nail care',
    iconName: 'waterdrops-linear',
  },
  {
    id: 'pediatrician',
    name: 'Pediatrician',
    description: 'Infant, child & adolescent healthcare',
    iconName: 'smile-circle-linear',
  },
  {
    id: 'physician',
    name: 'Physician',
    description: 'Internal medicine & complex medical management',
    iconName: 'stethoscope-linear',
  },
  {
    id: 'obstetrics-gynaecology',
    name: 'Obstetrics & Gynaecology',
    description: 'Maternal health, contraception & reproductive wellness',
    iconName: 'women-linear',
  },
  {
    id: 'dietician',
    name: 'Dietician',
    description: 'Nutritional therapy, metabolic & meal guidance',
    iconName: 'heart-pulse-2-linear',
  },
];

const HOMEPAGE_SPECIALTIES = SPECIALTIES.slice(0, 6);

export function SpecialtiesSection() {
  return (
    <section className="specialties-section" aria-label="Our Specialties">
      <div className="specialties-container">
        {/* Top Header */}
        <div style={{ textAlign: 'center', marginBottom: '64px' }}>
          {/* Eyebrow */}
          <div
            style={{
              color: 'var(--color-gold-base)',
              fontFamily: 'var(--font-sans)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '14px',
              display: 'inline-block',
            }}
          >
            OUR SPECIALTIES
          </div>

          {/* Main Heading */}
          <h2
            style={{
              fontFamily: 'var(--font-heading), sans-serif',
              fontSize: 'clamp(2rem, 3.2vw, 2.75rem)',
              fontWeight: 700,
              color: 'var(--color-white)',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              marginBottom: '16px',
            }}
          >
            Care for every part of you
          </h2>

          {/* Supporting Text */}
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '1rem',
              lineHeight: 1.65,
              color: 'var(--color-white-72)',
              maxWidth: '580px',
              margin: '0 auto',
            }}
          >
            From everyday health concerns to ongoing care, our platform gives you access to a wide
            range of medical specialties.
          </p>
        </div>

        {/* 6-Column Open Editorial Specialties Grid */}
        <div className="specialties-grid">
          {HOMEPAGE_SPECIALTIES.map((item) => (
            <Link
              key={item.id}
              href={`/doctors?specialty=${encodeURIComponent(item.name)}`}
              className="specialty-item"
            >
              {/* Circular Gold/Translucent Icon Container */}
              <div className="specialty-icon-box">
                <SpecialtyIcon
                  id={item.id}
                  size={28}
                  color="var(--color-gold-base)"
                />
              </div>

              {/* Specialty Name */}
              <h3 className="specialty-name">{item.name}</h3>

              {/* Short Description */}
              <p className="specialty-desc">{item.description}</p>
            </Link>
          ))}
        </div>

        {/* Explore All Specialties CTA */}
        <div className="specialties-cta-wrap">
          <Link href="/doctors" className="specialties-view-more-btn">
            <span>Explore All Specialties</span>
            <SolarIcon name="arrow-right-linear" size={16} color="currentColor" />
          </Link>
        </div>
      </div>
    </section>
  );
}
