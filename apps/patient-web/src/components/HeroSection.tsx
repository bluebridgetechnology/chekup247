'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SolarIcon } from './SolarIcon';
import { getDoctorRegisterUrl, getDoctorLoginUrl } from '../lib/urls';

export function HeroSection() {
  return (
    <section
      style={{
        position: 'relative',
        backgroundColor: 'var(--color-chocolate-base)',
        overflow: 'hidden',
        minHeight: '680px',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
      }}
      className="hero-section"
      aria-label="Hero - Quality Healthcare Anytime, Anywhere in South Africa"
    >
      {/* 
        BACKGROUND LAYER: Full-Bleed Lifestyle Photography
        Anchored to the right side with organic left-to-right gradient fade into solid chocolate
      */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: '65%',
          height: '100%',
          zIndex: 1,
          pointerEvents: 'none',
        }}
        className="hero-bg-layer"
      >
        <Image
          src="/images/hero_bg.png"
          alt="South African woman in virtual telehealth video consultation"
          fill
          priority
          sizes="(max-width: 990px) 100vw, 65vw"
          style={{
            objectFit: 'cover',
            objectPosition: 'right center',
          }}
        />

        {/* 
          Left-to-Right Seamless Gradient Overlay:
          Solid chocolate on left, smoothly dissolving into transparency on right.
        */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(to right, var(--color-chocolate-base) 0%, var(--color-chocolate-base) 8%, var(--color-chocolate-fade-96) 22%, var(--color-chocolate-fade-72) 42%, var(--color-chocolate-fade-25) 70%, transparent 95%),
              linear-gradient(to top, var(--color-chocolate-base) 0%, var(--color-chocolate-fade-70) 6%, transparent 22%),
              linear-gradient(to bottom, var(--color-chocolate-base) 0%, transparent 16%)
            `,
          }}
        />
      </div>

      {/* 
        MAIN CONTENT LAYER: Positioned on top (z-index: 2)
      */}
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '72px 32px 80px 32px',
          position: 'relative',
          zIndex: 2,
        }}
        className="hero-container"
      >
        <div
          style={{
            maxWidth: '560px',
          }}
          className="hero-text-column"
        >
          {/* Small Uppercase Eyebrow */}
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-gold-base)',
              marginBottom: '16px',
              display: 'inline-block',
              fontFamily: 'var(--font-sans)',
            }}
          >
            VIRTUAL & TELEHEALTH PLATFORM
          </div>

          {/* Main Headline */}
          <h1
            style={{
              fontSize: 'clamp(2.45rem, 4.1vw, 3.65rem)',
              lineHeight: 1.13,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--color-white)',
              marginBottom: '22px',
              fontFamily: 'var(--font-heading), sans-serif',
            }}
            className="hero-headline"
          >
            Quality healthcare<br />
            anytime, anywhere<br />
            in <span style={{ color: 'var(--color-gold-base)' }}>South Africa</span>
          </h1>

          {/* Body Copy */}
          <p
            style={{
              fontSize: 'clamp(0.95rem, 1.15vw, 1.025rem)',
              lineHeight: 1.65,
              color: 'var(--color-white-78)',
              maxWidth: '480px',
              marginBottom: '36px',
            }}
            className="hero-body"
          >
            Chekup247 connects you with trusted healthcare professionals for virtual consultations,
            prescriptions, follow-ups and more — all from the comfort of your home or on the go.
          </p>

          {/* CTA Row: Book a Consultation & Join as a Doctor */}
          <div className="hero-cta-row">
            {/* Primary CTA: Book a Consultation */}
            <Link
              href="/doctors"
              className="hero-btn-primary"
            >
              <span>Book a Consultation</span>
              <SolarIcon name="calendar-date-bold-duotone" size={20} />
            </Link>

            {/* Secondary CTA: Join as a Doctor -> Doctor Registration Page */}
            <a
              href={getDoctorRegisterUrl()}
              className="hero-btn-outline"
              title="Register as a Doctor on Chekup247"
            >
              <span>Join as a Doctor</span>
              <SolarIcon name="arrow-right-linear" size={18} />
            </a>
          </div>

          {/* Doctor Portal Quick Access & Easy Login Banner */}
          <div className="hero-doctor-quick-login">
            <span className="hero-doctor-quick-text">Are you a registered doctor or healthcare provider?</span>
            <a
              href={getDoctorLoginUrl()}
              className="hero-doctor-login-link"
              title="Doctor Portal Log In"
            >
              <SolarIcon name="user-linear" size={15} color="var(--color-gold-base)" />
              <span>Doctor Log In &rarr;</span>
            </a>
          </div>

          {/* Feature Mini-Nav Indicators */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              flexWrap: 'wrap',
            }}
            className="hero-feature-row"
          >
            {/* Virtual Consultations */}
            <div className="hero-feature-item">
              <div className="hero-feature-box">
                <SolarIcon name="videocamera-record-bold-duotone" size={16} color="var(--color-gold-base)" />
              </div>
              <span>Virtual Consultations</span>
            </div>

            {/* Prescriptions */}
            <div className="hero-feature-item">
              <div className="hero-feature-box">
                <SolarIcon name="document-medicine-bold-duotone" size={16} color="var(--color-gold-base)" />
              </div>
              <span>Prescriptions</span>
            </div>

            {/* Follow-ups */}
            <div className="hero-feature-item">
              <div className="hero-feature-box">
                <SolarIcon name="calendar-date-bold-duotone" size={16} color="var(--color-gold-base)" />
              </div>
              <span>Follow-ups</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
