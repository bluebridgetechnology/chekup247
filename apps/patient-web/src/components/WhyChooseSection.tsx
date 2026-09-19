'use client';

import React from 'react';
import { SolarIcon } from './SolarIcon';

interface BenefitItem {
  id: string;
  title: string;
  description: string;
  icon: string;
}

const BENEFITS: BenefitItem[] = [
  {
    id: 'fast-convenient',
    title: 'Fast & Convenient',
    description: 'See a doctor in minutes, no queues, no travel.',
    icon: 'clock-circle-linear',
  },
  {
    id: 'trusted-professionals',
    title: 'Trusted Professionals',
    description: 'Qualified and experienced healthcare providers.',
    icon: 'shield-linear',
  },
  {
    id: 'secure-private',
    title: 'Secure & Private',
    description: 'Your health information is always protected.',
    icon: 'lock-keyhole-linear',
  },
  {
    id: 'any-device',
    title: 'Any Device',
    description: 'Consult from your phone, tablet or computer.',
    icon: 'smartphone-linear',
  },
  {
    id: 'south-africa-based',
    title: 'South Africa Based',
    description: 'Local support, local healthcare networks.',
    icon: 'map-point-linear',
  },
];

export function WhyChooseSection() {
  return (
    <section
      id="why-choose"
      className="why-choose-section"
      style={{
        backgroundColor: 'var(--color-cream-base)',
        padding: '96px 0 112px 0',
        width: '100%',
        position: 'relative',
      }}
      aria-label="Why Choose Chekup247"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
        className="why-choose-container"
      >
        {/* Top Header Content: Centered Eyebrow, Main Heading, Supporting Text */}
        <div
          style={{
            textAlign: 'center',
            maxWidth: '620px',
            margin: '0 auto 64px auto',
          }}
          className="why-choose-header"
        >
          {/* Eyebrow */}
          <div
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--color-gold-bronze)',
              marginBottom: '14px',
              display: 'inline-block',
              fontFamily: 'var(--font-sans)',
            }}
          >
            WHY CHOOSE CHEKUP247
          </div>

          {/* Main Heading */}
          <h2
            style={{
              fontSize: 'clamp(2.1rem, 3.4vw, 2.75rem)',
              lineHeight: 1.18,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              color: 'var(--color-chocolate-base)',
              marginBottom: '16px',
              fontFamily: 'var(--font-heading), sans-serif',
            }}
            className="why-choose-title"
          >
            Healthcare made simple
          </h2>

          {/* Supporting Text */}
          <p
            style={{
              fontSize: 'clamp(0.95rem, 1.1vw, 1.05rem)',
              lineHeight: 1.65,
              color: 'var(--color-cream-text-muted)',
              maxWidth: '560px',
              margin: '0 auto',
            }}
            className="why-choose-description"
          >
            Get the care you need, when you need it — with a platform designed for your convenience, safety and peace of mind.
          </p>
        </div>

        {/* 5-Item Benefit Grid: Open Whitespace, Circular Pale-Gold Backgrounds, Line Icons */}
        <div className="why-choose-grid">
          {BENEFITS.map((item) => (
            <div key={item.id} className="why-choose-item">
              {/* Circular Pale-Gold Icon Container */}
              <div className="why-choose-icon-circle" aria-hidden="true">
                <SolarIcon name={item.icon} size={28} color="var(--color-chocolate-base)" />
              </div>

              {/* Heading */}
              <h3 className="why-choose-item-title">{item.title}</h3>

              {/* Description */}
              <p className="why-choose-item-desc">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
