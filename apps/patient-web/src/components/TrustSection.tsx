'use client';

import React from 'react';
import Image from 'next/image';

interface StatItem {
  number: string;
  label: string;
}

const STATS: StatItem[] = [
  {
    number: '500+',
    label: 'Qualified doctors',
  },
  {
    number: '100k+',
    label: 'Happy patients',
  },
  {
    number: '4.8/5',
    label: 'Average rating',
  },
];

export function TrustSection() {
  return (
    <section className="trust-section" aria-label="Trust and Social Proof">
      <div className="trust-container">
        <div className="trust-grid">
          {/* Left Column: Doctor Image + Floating Speech Bubble Badge */}
          <div className="trust-image-col">
            <div className="trust-image-wrapper">
              <Image
                src="/images/footer_cta.png"
                alt="Smiling healthcare doctor on Chekup247 platform"
                width={540}
                height={304}
                priority={false}
                style={{
                  width: '100%',
                  height: 'auto',
                  display: 'block',
                }}
              />

              {/* Floating "Real people. Real care." speech bubble badge */}
              <div className="trust-floating-bubble" aria-hidden="true">
                <div className="trust-floating-text">
                  Real people.
                  <br />
                  Real care.
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Trust Messaging & Statistics */}
          <div className="trust-content-col">
            {/* Eyebrow */}
            <div className="trust-eyebrow">
              TRUSTED BY MILLIONS
            </div>

            {/* Headline */}
            <h2 className="trust-headline">
              Your health is in
              <br />
              good hands
            </h2>

            {/* Supporting Copy */}
            <p className="trust-description">
              Chekup247 is South Africa&apos;s growing telehealth platform, trusted by
              individuals and families across the country.
            </p>

            {/* Statistics Row */}
            <div className="trust-stats-row">
              {STATS.map((stat, idx) => (
                <React.Fragment key={stat.label}>
                  {idx > 0 && <div className="trust-stat-divider" />}
                  <div className="trust-stat-item">
                    <div className="trust-stat-number">{stat.number}</div>
                    <div className="trust-stat-label">{stat.label}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
