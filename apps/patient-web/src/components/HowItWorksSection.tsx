'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SolarIcon } from './SolarIcon';

interface StepItem {
  number: number;
  title: string;
  description: string;
}

const STEPS: StepItem[] = [
  {
    number: 1,
    title: 'Create your account',
    description: 'Sign up in minutes with your details.',
  },
  {
    number: 2,
    title: 'Book a consultation',
    description: 'Choose a doctor, select a time and describe your concern.',
  },
  {
    number: 3,
    title: 'Meet your doctor',
    description: 'Join your virtual consultation and get the care you need.',
  },
];

export function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="how-it-works-section"
      style={{
        backgroundColor: 'var(--color-cream-base)',
        padding: '96px 0 112px 0',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
      aria-label="How Chekup247 Works"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          margin: '0 auto',
          padding: '0 32px',
          boxSizing: 'border-box',
        }}
        className="how-it-works-container"
      >
        <div className="how-it-works-grid">
          {/* LEFT COLUMN: Content, 3 Numbered Steps, and CTA */}
          <div className="how-it-works-left">
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
              HOW IT WORKS
            </div>

            {/* Headline */}
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
              className="how-it-works-title"
            >
              Get care in 3 easy steps
            </h2>

            {/* Supporting Copy */}
            <p
              style={{
                fontSize: 'clamp(0.95rem, 1.1vw, 1.025rem)',
                lineHeight: 1.65,
                color: 'var(--color-cream-text-muted)',
                maxWidth: '460px',
                marginBottom: '44px',
              }}
              className="how-it-works-subtitle"
            >
              Accessing quality healthcare has never been easier. Follow these simple steps to get started.
            </p>

            {/* 3 Vertically Stacked Steps */}
            <div className="how-it-works-steps">
              {STEPS.map((step, idx) => {
                const isLast = idx === STEPS.length - 1;
                return (
                  <div key={step.number} className="how-it-works-step-row">
                    {/* Left Timeline: Badge & Connecting Line */}
                    <div className="step-timeline-col">
                      <div className="step-number-badge" aria-hidden="true">
                        {step.number}
                      </div>
                      {!isLast && <div className="step-connecting-line" aria-hidden="true" />}
                    </div>

                    {/* Step Text */}
                    <div className="step-content-col">
                      <h3 className="step-title">{step.title}</h3>
                      <p className="step-description">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CTA Button */}
            <div style={{ marginTop: '38px' }}>
              <Link
                href="/register"
                className="how-it-works-cta-btn"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: 'var(--color-gold-primary)',
                  color: 'var(--color-chocolate-base)',
                  fontWeight: 600,
                  fontSize: '0.925rem',
                  padding: '13px 28px',
                  borderRadius: '9999px',
                  textDecoration: 'none',
                  lineHeight: 1,
                  boxSizing: 'border-box',
                  whiteSpace: 'nowrap',
                }}
              >
                <span>Get Started Now</span>
                <SolarIcon name="arrow-right-linear" size={16} color="var(--color-chocolate-base)" />
              </Link>
            </div>
          </div>

          {/* RIGHT COLUMN: Mobile App Mockup + Floating Doctor Card + Organic Gold Silhouette */}
          <div className="how-it-works-right">
            <div className="mockup-wrapper">
              <Image
                src="/images/mobile_img.png"
                alt="Chekup247 mobile app interface showing consultation booking and floating doctor card with Dr. Nomsa Dlamini"
                width={611}
                height={644}
                priority
                sizes="(max-width: 990px) 100vw, 580px"
                style={{
                  width: '100%',
                  maxWidth: '560px',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
