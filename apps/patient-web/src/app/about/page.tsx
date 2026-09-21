'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { SolarIcon } from '../../components/SolarIcon';

const PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

const VALUES = [
  {
    icon: 'shield-linear',
    title: 'Access',
    description: 'Quality healthcare should be within reach for everyone.',
  },
  {
    icon: 'users-group-two-rounded-linear',
    title: 'Trust',
    description: 'We build lasting relationships through transparency and integrity.',
  },
  {
    icon: 'heart-linear',
    title: 'Excellence',
    description: 'We maintain the highest standards in care, technology and service.',
  },
  {
    icon: 'lightbulb-linear',
    title: 'Innovation',
    description: 'We use technology to make healthcare simpler, faster and smarter.',
  },
  {
    icon: 'user-heart-linear',
    title: 'Community',
    description: "We're stronger when we're healthier — together.",
  },
];

export default function AboutPage() {
  return (
    <div
      style={{
        backgroundColor: 'var(--color-cream-base)',
        color: 'var(--color-chocolate-base)',
        fontFamily: 'var(--font-sans)',
        overflowX: 'hidden',
      }}
    >
      {/* ------------------------------------------------------------- */}
      {/* HERO SECTION                                                  */}
      {/* ------------------------------------------------------------- */}
      <section
        style={{
          position: 'relative',
          padding: 'var(--space-8) var(--space-6) clamp(56px, 7vw, 88px) var(--space-6)',
          overflow: 'hidden',
        }}
      >
        {/* Soft decorative background curves matching mockup */}
        <div
          style={{
            position: 'absolute',
            top: '-10%',
            right: '-5%',
            width: '600px',
            height: '600px',
            borderRadius: 'var(--radius-full)',
            background: 'radial-gradient(circle, #F4EBE1 0%, rgba(244, 235, 225, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
          aria-hidden="true"
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-20%',
            left: '30%',
            width: '500px',
            height: '500px',
            borderRadius: 'var(--radius-full)',
            background: 'radial-gradient(circle, #F7EFE6 0%, rgba(247, 239, 230, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
          aria-hidden="true"
        />

        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Breadcrumbs */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <Breadcrumbs items={[{ label: 'About Us' }]} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'clamp(40px, 5vw, 64px)',
              alignItems: 'center',
            }}
          >
            {/* Left Column: Headline & Description */}
            <div>
              <span
                className="page-eyebrow"
                style={{
                  display: 'inline-block',
                  color: 'var(--color-gold-bronze)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  marginBottom: 'var(--space-3)',
                }}
              >
                ABOUT CHEKUP247
              </span>

              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--font-hero-title-size)',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base)',
                  lineHeight: 1.12,
                  letterSpacing: '-0.03em',
                  marginBottom: 'var(--space-5)',
                }}
              >
                Better Healthcare
                <br />
                for a Healthier Tomorrow
              </h1>

              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-lg)',
                  color: 'var(--color-cream-text-muted)',
                  lineHeight: 1.65,
                  maxWidth: '520px',
                  marginBottom: 'var(--space-8)',
                }}
              >
                <strong style={{ color: 'var(--color-chocolate-base)', fontWeight: 600 }}>Chekup247</strong> is a South
                African-based virtual and telehealth platform, connecting you with qualified healthcare professionals
                from the comfort of your home. We make quality, convenient and affordable care accessible to everyone,
                everywhere.
              </p>

              {/* 3 Feature Badges */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-6)',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <SolarIcon name="videocamera-record-linear" size={18} color="var(--color-gold-bronze)" />
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-chocolate-base)',
                      fontWeight: 600,
                    }}
                  >
                    Virtual Consultations
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <SolarIcon name="shield-check-linear" size={18} color="var(--color-gold-bronze)" />
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-chocolate-base)',
                      fontWeight: 600,
                    }}
                  >
                    Trusted Doctors
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <SolarIcon name="lock-keyhole-linear" size={18} color="var(--color-gold-bronze)" />
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: 'var(--text-sm)',
                      color: 'var(--color-chocolate-base)',
                      fontWeight: 600,
                    }}
                  >
                    Secure &amp; Private
                  </span>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Photo & Floating Card */}
            <div
              style={{
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              {/* Soft decorative halo behind photo */}
              <div
                style={{
                  position: 'absolute',
                  top: '-6%',
                  right: '-6%',
                  width: '100%',
                  height: '100%',
                  borderRadius: 'var(--radius-2xl)',
                  background: 'linear-gradient(135deg, #F5EAE0 0%, #EFE1D3 100%)',
                  transform: 'rotate(2deg)',
                  zIndex: 0,
                }}
                aria-hidden="true"
              />

              {/* Main Hero Photo Container */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '100%',
                  maxWidth: '520px',
                  borderRadius: 'var(--radius-2xl)',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-xl)',
                  aspectRatio: '4 / 3',
                  backgroundColor: 'var(--color-cream-surface)',
                }}
              >
                <Image
                  src="/images/about/hero_about.jpg"
                  alt="South African patient using Chekup247 virtual healthcare from home"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 520px"
                  style={{
                    objectFit: 'cover',
                    objectPosition: 'center 20%',
                  }}
                />
              </div>

              {/* Floating Card Overlapping Hero Photo */}
              <div
                style={{
                  position: 'absolute',
                  left: 'clamp(-16px, -3vw, -28px)',
                  bottom: '18%',
                  zIndex: 2,
                  backgroundColor: 'var(--color-white)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '14px 20px',
                  boxShadow: 'var(--shadow-lg)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  border: '1px solid rgba(223, 171, 98, 0.2)',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-gold-pale)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <SolarIcon name="shield-check-linear" size={24} color="var(--color-gold-bronze)" />
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    lineHeight: 1.3,
                  }}
                >
                  Quality care,
                  <br />
                  <span style={{ fontWeight: 500, color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-xs)' }}>
                    anytime, anywhere.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: OUR MISSION & OUR VISION                             */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 96px) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'var(--space-6)',
          }}
        >
          {/* Card 1: Our Mission */}
          <div
            style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'clamp(36px, 5vw, 44px)',
              border: '1px solid var(--color-slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-gold-pale)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-6)',
              }}
            >
              <SolarIcon name="target-linear" size={28} color="var(--color-gold-bronze)" />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                color: 'var(--color-chocolate-base)',
                marginBottom: 'var(--space-4)',
              }}
            >
              Our Mission
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-cream-text-muted)',
                fontSize: 'var(--text-base)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              To remove distance, delay, and financial friction from primary healthcare. We provide patients across
              South Africa with prompt, virtual medical consultations, transparent pricing, verified diagnostics, and
              official e-prescriptions from verified doctors.
            </p>
          </div>

          {/* Card 2: Our Vision */}
          <div
            style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'clamp(36px, 5vw, 44px)',
              border: '1px solid var(--color-slate-200)',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--color-gold-pale)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 'var(--space-6)',
              }}
            >
              <SolarIcon name="eye-linear" size={28} color="var(--color-gold-bronze)" />
            </div>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'var(--text-2xl)',
                fontWeight: 800,
                color: 'var(--color-chocolate-base)',
                marginBottom: 'var(--space-4)',
              }}
            >
              Our Vision
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-cream-text-muted)',
                fontSize: 'var(--text-base)',
                lineHeight: 1.7,
                margin: 0,
              }}
            >
              A South Africa where quality healthcare is a universal reality — where a patient in a rural township or
              farming community has the exact same instant access to medical expertise as someone in central Sandton or
              Cape Town.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: OUR VALUES (WHAT DRIVES US)                          */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 96px) var(--space-6)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto', textAlign: 'center' }}>
          <span
            className="page-eyebrow"
            style={{
              display: 'inline-block',
              color: 'var(--color-gold-bronze)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 700,
              fontSize: 'var(--text-xs)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 'var(--space-2)',
            }}
          >
            OUR VALUES
          </span>

          <h2
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.1rem, 4vw, 2.85rem)',
              fontWeight: 800,
              color: 'var(--color-chocolate-base)',
              letterSpacing: '-0.025em',
              marginBottom: 'var(--space-2)',
            }}
          >
            What Drives Us
          </h2>

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-cream-text-muted)',
              fontSize: 'var(--text-base)',
              maxWidth: '600px',
              margin: '0 auto var(--space-12) auto',
            }}
          >
            Our values shape every decision we make and every patient we serve.
          </p>

          {/* 5 Values Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: 'var(--space-6)',
              textAlign: 'center',
            }}
          >
            {VALUES.map((val) => (
              <div
                key={val.title}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: 'var(--space-4)',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-gold-pale)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 'var(--space-4)',
                  }}
                >
                  <SolarIcon name={val.icon} size={26} color="var(--color-gold-bronze)" />
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-lg)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  {val.title}
                </h3>

                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-cream-text-muted)',
                    lineHeight: 1.55,
                    margin: 0,
                  }}
                >
                  {val.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: OUR LEADERSHIP                                       */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 96px) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            backgroundColor: 'var(--color-cream-surface)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'clamp(36px, 5vw, 48px)',
            border: '1px solid rgba(223, 171, 98, 0.25)',
            boxShadow: 'var(--shadow-sm)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 'clamp(28px, 4vw, 48px)',
            alignItems: 'center',
          }}
        >
          {/* Column 1: Doctor Portrait Photo */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
              aspectRatio: '4 / 3',
              backgroundColor: 'var(--color-slate-100)',
            }}
          >
            <Image
              src="/images/about/leadership_doctor.jpg"
              alt="Chekup247 Medical Leadership - Dr. Amina Yusuf"
              fill
              sizes="(max-width: 768px) 100vw, 360px"
              style={{
                objectFit: 'cover',
                objectPosition: 'center 15%',
              }}
            />
          </div>

          {/* Column 2: Leadership Description */}
          <div>
            <span
              className="page-eyebrow"
              style={{
                display: 'inline-block',
                color: 'var(--color-gold-bronze)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 'var(--space-2)',
              }}
            >
              OUR LEADERSHIP
            </span>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
                fontWeight: 800,
                color: 'var(--color-chocolate-base)',
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
                marginBottom: 'var(--space-4)',
              }}
            >
              Experienced. Committed.
              <br />
              Patient-Focused.
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-cream-text-muted)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.65,
                marginBottom: 'var(--space-6)',
              }}
            >
              Our leadership team brings together deep healthcare experience, technology expertise, and a shared
              passion for making quality care accessible to all South Africans.
            </p>

            <Link
              href="/doctors"
              style={{
                fontFamily: 'var(--font-sans)',
                backgroundColor: 'var(--color-chocolate-base)',
                color: 'var(--color-white)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                padding: '11px 24px',
                borderRadius: 'var(--radius-full)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>Meet Our Team</span>
              <SolarIcon name="arrow-right-linear" size={16} color="var(--color-white)" />
            </Link>
          </div>

          {/* Column 3: Quote Card */}
          <div
            style={{
              paddingLeft: 'clamp(16px, 3vw, 32px)',
              borderLeft: '1px solid rgba(223, 171, 98, 0.2)',
            }}
          >
            <div
              style={{
                fontSize: '2.5rem',
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-gold-bronze)',
                lineHeight: 1,
                marginBottom: 'var(--space-2)',
              }}
              aria-hidden="true"
            >
              &ldquo;
            </div>

            <blockquote
              style={{
                fontFamily: 'var(--font-sans)',
                fontStyle: 'italic',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.7,
                color: 'var(--color-chocolate-base)',
                marginBottom: 'var(--space-4)',
              }}
            >
              &ldquo;Chekup247 is more than a platform — it&apos;s a commitment to healthier communities and a stronger
              South Africa.&rdquo;
            </blockquote>

            <div
              style={{
                width: '36px',
                height: '2px',
                backgroundColor: 'var(--color-gold-bronze)',
                marginBottom: 'var(--space-3)',
              }}
            />

            <div>
              <div
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base)',
                }}
              >
                Dr. Amina Yusuf
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--color-cream-text-muted)',
                }}
              >
                General Practitioner
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: OUR COVERAGE (NATIONWIDE VIRTUAL HEALTHCARE)         */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 100px) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            backgroundColor: 'var(--color-cream-surface)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'clamp(36px, 5vw, 56px)',
            border: '1px solid rgba(223, 171, 98, 0.25)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(32px, 5vw, 64px)',
            alignItems: 'center',
          }}
        >
          {/* Left Column: Copy & Link */}
          <div>
            <span
              className="page-eyebrow"
              style={{
                display: 'inline-block',
                color: 'var(--color-gold-bronze)',
                fontFamily: 'var(--font-sans)',
                fontWeight: 700,
                fontSize: 'var(--text-xs)',
                textTransform: 'uppercase',
                letterSpacing: '0.12em',
                marginBottom: 'var(--space-2)',
              }}
            >
              OUR COVERAGE
            </span>

            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.8rem, 3.2vw, 2.4rem)',
                fontWeight: 800,
                color: 'var(--color-chocolate-base)',
                lineHeight: 1.2,
                letterSpacing: '-0.025em',
                marginBottom: 'var(--space-4)',
              }}
            >
              Nationwide Virtual
              <br />
              Healthcare Coverage
            </h2>

            <p
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-cream-text-muted)',
                fontSize: 'var(--text-sm)',
                lineHeight: 1.65,
                marginBottom: 'var(--space-6)',
              }}
            >
              Our network of certified physicians is licensed to practice throughout South Africa, serving urban,
              peri-urban, and rural communities across all 9 provinces.
            </p>

            <Link
              href="/doctors"
              style={{
                fontFamily: 'var(--font-sans)',
                backgroundColor: 'var(--color-white)',
                color: 'var(--color-chocolate-base)',
                border: '1px solid var(--border-color)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                padding: '10px 22px',
                borderRadius: 'var(--radius-full)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                transition: 'all 0.2s ease',
              }}
            >
              <span>View All Provinces</span>
              <SolarIcon name="arrow-right-linear" size={15} color="var(--color-chocolate-base)" />
            </Link>
          </div>

          {/* Right Column: 9 Province Pills Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
              gap: 'var(--space-3)',
            }}
          >
            {PROVINCES.map((prov) => (
              <div
                key={prov}
                style={{
                  backgroundColor: 'var(--color-white)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  boxShadow: 'var(--shadow-sm)',
                  border: '1px solid var(--color-slate-200)',
                }}
              >
                <SolarIcon name="map-point-linear" size={16} color="var(--color-gold-bronze)" />
                <span
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-xs)',
                    fontWeight: 600,
                    color: 'var(--color-chocolate-base)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {prov}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
