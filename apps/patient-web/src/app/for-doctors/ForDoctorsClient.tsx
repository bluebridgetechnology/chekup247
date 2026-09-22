'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SolarIcon } from '../../components/SolarIcon';

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Chekup247 has made it easy for me to reach patients beyond my clinic. The platform is simple, secure and the support team is always available.',
    author: 'Dr. Amina Yusuf',
    role: 'General Practitioner',
    avatar: '/images/for-doctors/doctor_amina.jpg',
  },
  {
    quote:
      'Chekup247 gives me the freedom to consult patients between my morning hospital rounds and evening duties. The integrated WHO ICD-10 diagnostic library makes scripting effortless.',
    author: 'Dr. Thabo Molefe',
    role: 'General Practitioner, Gauteng',
    avatar: '/images/for-doctors/doctor_amina.jpg',
  },
  {
    quote:
      'The LocumStaff single sign-on meant zero administrative friction. My HPCSA credentials were verified within 24 hours, and payouts arrive without fail every Monday.',
    author: 'Dr. Sarah Van Der Merwe',
    role: 'Paediatric Specialist, Western Cape',
    avatar: '/images/for-doctors/doctor_amina.jpg',
  },
];

export default function ForDoctorsClient() {
  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  const prevTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === 0 ? TESTIMONIALS.length - 1 : prev - 1));
  };

  const nextTestimonial = () => {
    setCurrentTestimonial((prev) => (prev === TESTIMONIALS.length - 1 ? 0 : prev + 1));
  };

  const doctorPortalUrl =
    process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL || 'https://doctor.chekup247.com';

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
          padding: 'clamp(48px, 6vw, 84px) var(--space-6) clamp(56px, 7vw, 88px) var(--space-6)',
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
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 'clamp(40px, 5vw, 64px)',
            alignItems: 'center',
          }}
        >
          {/* Left Hero Column: Copy & Actions */}
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
              FOR DOCTORS
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
              Practice Medicine,
              <br />
              We&apos;ll Handle the Rest
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
              Join <strong style={{ color: 'var(--color-chocolate-base)', fontWeight: 600 }}>Chekup247</strong> and
              give your patients convenient, secure, and affordable access to quality care — anytime, anywhere. Our
              platform makes it easy for you to consult, manage, and grow your practice.
            </p>

            {/* Action Buttons */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                flexWrap: 'wrap',
              }}
            >
              <a
                href={doctorPortalUrl}
                style={{
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: 'var(--color-gold-bronze)',
                  color: 'var(--color-white)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  padding: '12px 28px',
                  borderRadius: 'var(--radius-full)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  boxShadow: 'var(--shadow-md)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span>Become a Provider</span>
                <SolarIcon name="arrow-right-linear" size={16} color="var(--color-white)" />
              </a>

              <button
                type="button"
                style={{
                  fontFamily: 'var(--font-sans)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-chocolate-base)',
                  border: '1px solid var(--border-color)',
                  fontWeight: 600,
                  fontSize: 'var(--text-sm)',
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-full)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  transition: 'all 0.2s ease',
                }}
              >
                <SolarIcon name="play-bold" size={14} color="var(--color-chocolate-base)" />
                <span>Watch 2-min Overview</span>
              </button>
            </div>
          </div>

          {/* Right Hero Column: Photo & Floating Card */}
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
                src="/images/for-doctors/hero_doctor_laptop.jpg"
                alt="Chekup247 doctor consulting with a laptop in a modern clinic"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 520px"
                style={{
                  objectFit: 'cover',
                  objectPosition: 'center 15%',
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
                <SolarIcon name="users-group-two-rounded-linear" size={24} color="var(--color-gold-bronze)" />
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
                Expand your reach
                <br />
                <span style={{ fontWeight: 500, color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-xs)' }}>
                  Help more patients, across more locations.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* VALUE PROPS RIBBON BAR                                        */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) var(--space-12) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            backgroundColor: 'var(--color-cream-surface)',
            borderRadius: 'var(--radius-2xl)',
            padding: '32px 36px',
            border: '1px solid rgba(223, 171, 98, 0.2)',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 'var(--space-6)',
              alignItems: 'center',
            }}
          >
            {/* Prop 1: Flexible Schedule */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-gold-pale)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="users-group-two-rounded-linear" size={22} color="var(--color-gold-bronze)" />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    marginBottom: '2px',
                  }}
                >
                  Flexible Schedule
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: 0 }}>
                  See patients on your terms.
                </p>
              </div>
            </div>

            {/* Prop 2: Secure & Compliant */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-gold-pale)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="shield-check-linear" size={22} color="var(--color-gold-bronze)" />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    marginBottom: '2px',
                  }}
                >
                  Secure &amp; Compliant
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: 0 }}>
                  POPIA &amp; HIPAA compliant for peace of mind.
                </p>
              </div>
            </div>

            {/* Prop 3: Grow Your Practice */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-gold-pale)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="round-graph-linear" size={22} color="var(--color-gold-bronze)" />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    marginBottom: '2px',
                  }}
                >
                  Grow Your Practice
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: 0 }}>
                  Reach new patients and increase your impact.
                </p>
              </div>
            </div>

            {/* Prop 4: Competitive Earnings */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-lg)',
                  backgroundColor: 'var(--color-gold-pale)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <SolarIcon name="card-recive-linear" size={22} color="var(--color-gold-bronze)" />
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    marginBottom: '2px',
                  }}
                >
                  Competitive Earnings
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', color: 'var(--color-cream-text-muted)', margin: 0 }}>
                  Fair and transparent reimbursement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION: 4 SIMPLE STEPS (HOW IT WORKS)                        */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 96px) var(--space-6)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          {/* Header Row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-10)',
              flexWrap: 'wrap',
              gap: 'var(--space-4)',
            }}
          >
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
                GET STARTED IN 4 SIMPLE STEPS
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
                How It Works
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-base)', margin: 0 }}>
                Getting started is quick and easy. Here&apos;s how you can begin.
              </p>
            </div>

            <Link
              href="/how-it-works"
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-gold-bronze)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
              }}
            >
              <span>Learn More About Our Process</span>
              <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
            </Link>
          </div>

          {/* 4 Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 'var(--space-6)',
            }}
          >
            {/* Step 01 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--color-slate-200)',
                padding: '30px 24px 26px 24px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '380px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--color-rating-bg)',
                      color: 'var(--color-rating-subtext)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    01
                  </span>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-rating-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="user-linear" size={22} color="var(--color-rating-subtext)" />
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    lineHeight: 1.35,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Create Your Provider Profile
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                  Sign up and complete your professional profile, including credentials, specialties and availability.
                </p>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <a
                  href={doctorPortalUrl}
                  aria-label="Create provider profile"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-gold-pale)',
                    color: 'var(--color-gold-bronze)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                  }}
                >
                  <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                </a>
              </div>
            </div>

            {/* Step 02 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--color-slate-200)',
                padding: '30px 24px 26px 24px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '380px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--color-rating-bg)',
                      color: 'var(--color-rating-subtext)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    02
                  </span>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-rating-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="calendar-linear" size={22} color="var(--color-rating-subtext)" />
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    lineHeight: 1.35,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Set Your Availability
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                  Choose your consultation hours and how you want to see patients (video, voice or chat).
                </p>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <a
                  href={doctorPortalUrl}
                  aria-label="Set consultation availability"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-gold-pale)',
                    color: 'var(--color-gold-bronze)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                  }}
                >
                  <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                </a>
              </div>
            </div>

            {/* Step 03 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--color-slate-200)',
                padding: '30px 24px 26px 24px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '380px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--color-rating-bg)',
                      color: 'var(--color-rating-subtext)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    03
                  </span>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-rating-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="laptop-minimalistic-linear" size={22} color="var(--color-rating-subtext)" />
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    lineHeight: 1.35,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Start Consulting
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                  Connect with patients instantly or via scheduled appointments. Manage everything from your dashboard.
                </p>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <a
                  href={doctorPortalUrl}
                  aria-label="Start virtual consultations"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-gold-pale)',
                    color: 'var(--color-gold-bronze)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                  }}
                >
                  <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                </a>
              </div>
            </div>

            {/* Step 04 */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-2xl)',
                border: '1px solid var(--color-slate-200)',
                padding: '30px 24px 26px 24px',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: '380px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                  <span
                    style={{
                      backgroundColor: 'var(--color-rating-bg)',
                      color: 'var(--color-rating-subtext)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 700,
                      padding: '4px 14px',
                      borderRadius: 'var(--radius-full)',
                    }}
                  >
                    04
                  </span>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: 'var(--color-rating-bg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon name="round-graph-linear" size={22} color="var(--color-rating-subtext)" />
                  </div>
                </div>

                <h3
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-xl)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                    lineHeight: 1.35,
                    marginBottom: 'var(--space-3)',
                  }}
                >
                  Get Paid
                </h3>
                <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                  Receive secure and timely payments through our trusted payment partners.
                </p>
              </div>

              <div style={{ marginTop: 'var(--space-6)' }}>
                <a
                  href={doctorPortalUrl}
                  aria-label="Provider earnings and payouts"
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'var(--color-gold-pale)',
                    color: 'var(--color-gold-bronze)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    transition: 'background-color 0.2s ease, transform 0.2s ease',
                  }}
                >
                  <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SPLIT SECTION: WHY DOCTORS CHOOSE & TESTIMONIAL CAROUSEL     */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 96px) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
            gap: 'var(--space-6)',
            alignItems: 'stretch',
          }}
        >
          {/* Left Card: Feature Points */}
          <div
            style={{
              backgroundColor: 'var(--color-cream-surface)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'clamp(36px, 5vw, 48px) clamp(28px, 4vw, 40px)',
              border: '1px solid rgba(223, 171, 98, 0.2)',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            {/* Soft decorative flower/curve aesthetic at bottom right */}
            <div
              style={{
                position: 'absolute',
                bottom: '-25%',
                right: '-15%',
                width: '320px',
                height: '320px',
                borderRadius: 'var(--radius-full)',
                background: 'radial-gradient(circle, #F4EAE0 0%, rgba(244, 234, 224, 0) 70%)',
                pointerEvents: 'none',
                zIndex: 0,
              }}
              aria-hidden="true"
            />

            <div style={{ position: 'relative', zIndex: 1 }}>
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
                WHY DOCTORS CHOOSE CHEKUP247
              </span>

              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(2rem, 3.5vw, 2.6rem)',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.025em',
                  marginBottom: 'var(--space-6)',
                }}
              >
                More Freedom. More Patients.
                <br />
                More Impact.
              </h2>

              {/* 4 Checkmark List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                {[
                  'No administrative hassle — we handle the logistics',
                  'Built-in video, chat and e-prescriptions',
                  'Secure, compliant and reliable platform',
                  'Dedicated support for providers',
                ].map((item) => (
                  <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <div
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'var(--color-gold-pale)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <SolarIcon name="check-circle-bold" size={16} color="var(--color-gold-bronze)" />
                    </div>
                    <span
                      style={{
                        fontFamily: 'var(--font-sans)',
                        fontSize: 'var(--text-sm)',
                        color: 'var(--color-chocolate-base)',
                        fontWeight: 500,
                      }}
                    >
                      {item}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Card: Interactive Testimonial Carousel */}
          <div
            style={{
              backgroundColor: 'var(--color-white)',
              borderRadius: 'var(--radius-2xl)',
              padding: 'clamp(36px, 5vw, 48px) clamp(28px, 4vw, 40px)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--color-slate-200)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              position: 'relative',
            }}
          >
            {/* Carousel navigation arrows */}
            <button
              type="button"
              onClick={prevTestimonial}
              aria-label="Previous testimonial"
              style={{
                position: 'absolute',
                left: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: 'var(--color-chocolate-base)',
                zIndex: 10,
              }}
            >
              <SolarIcon name="alt-arrow-left-linear" size={20} color="var(--color-chocolate-base)" />
            </button>

            <button
              type="button"
              onClick={nextTestimonial}
              aria-label="Next testimonial"
              style={{
                position: 'absolute',
                right: '20px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '8px',
                color: 'var(--color-chocolate-base)',
                zIndex: 10,
              }}
            >
              <SolarIcon name="alt-arrow-right-linear" size={20} color="var(--color-chocolate-base)" />
            </button>

            {/* Testimonial Content */}
            <div style={{ padding: '0 clamp(16px, 3vw, 32px)', textAlign: 'left' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: 'var(--radius-full)',
                  overflow: 'hidden',
                  position: 'relative',
                  marginBottom: 'var(--space-6)',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <Image
                  src={TESTIMONIALS[currentTestimonial].avatar}
                  alt={TESTIMONIALS[currentTestimonial].author}
                  fill
                  sizes="64px"
                  style={{ objectFit: 'cover' }}
                />
              </div>

              <blockquote
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-base)',
                  lineHeight: 1.7,
                  color: 'var(--color-chocolate-base)',
                  marginBottom: 'var(--space-6)',
                  fontStyle: 'italic',
                }}
              >
                &ldquo;{TESTIMONIALS[currentTestimonial].quote}&rdquo;
              </blockquote>

              <div>
                <div
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 'var(--text-base)',
                    fontWeight: 700,
                    color: 'var(--color-chocolate-base)',
                  }}
                >
                  {TESTIMONIALS[currentTestimonial].author}
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: 'var(--text-sm)',
                    color: 'var(--color-cream-text-muted)',
                  }}
                >
                  {TESTIMONIALS[currentTestimonial].role}
                </div>
              </div>
            </div>

            {/* Indicator Dots */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: 'var(--space-6)',
              }}
            >
              {TESTIMONIALS.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => setCurrentTestimonial(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  style={{
                    width: index === currentTestimonial ? '20px' : '8px',
                    height: '8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor:
                      index === currentTestimonial ? 'var(--color-gold-bronze)' : 'var(--color-slate-300)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* FOOTER CTA BANNER: READY TO MAKE A BIGGER DIFFERENCE          */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 100px) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            backgroundColor: 'var(--color-chocolate-base)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'clamp(36px, 5vw, 48px) clamp(28px, 5vw, 56px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-6)',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-xl)',
          }}
        >
          {/* Left: Badge + Pitch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)', maxWidth: '680px' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(223, 171, 98, 0.12)',
                border: '1px solid rgba(223, 171, 98, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <SolarIcon name="heart-pulse-bold-duotone" size={32} color="var(--color-gold-base)" />
            </div>

            <div>
              <span
                style={{
                  display: 'inline-block',
                  color: 'var(--color-gold-base)',
                  fontFamily: 'var(--font-sans)',
                  fontWeight: 700,
                  fontSize: 'var(--text-xs)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  marginBottom: 'var(--space-1)',
                }}
              >
                ARE YOU A QUALIFIED HEALTHCARE PROFESSIONAL?
              </span>

              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(1.6rem, 2.5vw, 2.1rem)',
                  fontWeight: 800,
                  color: 'var(--color-white)',
                  lineHeight: 1.2,
                  marginBottom: 'var(--space-2)',
                }}
              >
                Ready to Make a Bigger Difference?
              </h2>

              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-white-80)',
                  fontSize: 'var(--text-sm)',
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                Join Chekup247 today and start providing quality care, whenever and wherever your patients need you.
              </p>
            </div>
          </div>

          {/* Right: CTA Button & Sub-link */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)' }}>
            <a
              href={doctorPortalUrl}
              style={{
                fontFamily: 'var(--font-sans)',
                backgroundColor: 'var(--color-gold-bronze)',
                color: 'var(--color-white)',
                fontWeight: 600,
                fontSize: 'var(--text-sm)',
                padding: '12px 28px',
                borderRadius: 'var(--radius-full)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                boxShadow: 'var(--shadow-md)',
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Become a Provider</span>
              <SolarIcon name="arrow-right-linear" size={16} color="var(--color-white)" />
            </a>

            <Link
              href="/contact"
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-white-72)',
                fontSize: 'var(--text-xs)',
                textDecoration: 'none',
              }}
            >
              Have Questions? <span style={{ textDecoration: 'underline' }}>Contact Us</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
