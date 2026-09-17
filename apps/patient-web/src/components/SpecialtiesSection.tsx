'use client';

import React from 'react';
import { SolarIcon } from './SolarIcon';

interface SpecialtyItem {
  id: string;
  name: string;
  description: string;
  iconName: string;
}

const SPECIALTIES: SpecialtyItem[] = [
  {
    id: 'general-medicine',
    name: 'General Medicine',
    description: 'Common illnesses, wellness & more',
    iconName: 'user-circle-linear',
  },
  {
    id: 'mental-health',
    name: 'Mental Health',
    description: 'Counselling & therapy support',
    iconName: 'brain-linear',
  },
  {
    id: 'dermatology',
    name: 'Dermatology',
    description: 'Skin, hair & nail care',
    iconName: 'waterdrops-linear',
  },
  {
    id: 'womens-health',
    name: "Women's Health",
    description: 'Reproductive health, family planning & more',
    iconName: 'women-linear',
  },
  {
    id: 'chronic-care',
    name: 'Chronic Care',
    description: 'Diabetes, hypertension, ongoing management',
    iconName: 'heart-pulse-2-linear',
  },
  {
    id: 'paediatrics',
    name: 'Paediatrics',
    description: 'Healthy kids, brighter futures',
    iconName: 'smile-circle-linear',
  },
];

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
          {SPECIALTIES.map((item) => (
            <div key={item.id} className="specialty-item">
              {/* Circular Gold/Translucent Icon Container */}
              <div className="specialty-icon-box">
                <SolarIcon
                  name={item.iconName}
                  size={28}
                  color="var(--color-gold-base)"
                />
              </div>

              {/* Specialty Name */}
              <h3 className="specialty-name">{item.name}</h3>

              {/* Short Description */}
              <p className="specialty-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
