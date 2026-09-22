'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { SolarIcon } from '../../components/SolarIcon';

export default function HowItWorksClient() {
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');

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
          padding: 'clamp(48px, 6vw, 84px) var(--space-6) clamp(56px, 7vw, 96px) var(--space-6)',
          overflow: 'hidden',
        }}
      >
        {/* Soft decorative background curves */}
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
              HOW IT WORKS
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
              Virtual Consultations
              <br />
              Made Simple
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
              <strong style={{ color: 'var(--color-chocolate-base)', fontWeight: 600 }}>Chekup247</strong> connects
              you with certified healthcare professionals for secure, convenient, and on-demand consultations. Get the
              care you need — from the comfort of your home.
            </p>

            {/* Toggle Buttons: For Patients vs For Doctors */}
            <div
              role="tablist"
              aria-label="Audience view selector"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                flexWrap: 'wrap',
              }}
            >
              <button
                role="tab"
                aria-selected={activeTab === 'patient'}
                onClick={() => setActiveTab('patient')}
                style={{
                  fontFamily: 'var(--font-sans)',
                  padding: '11px 28px',
                  borderRadius: 'var(--radius-full)',
                  border: activeTab === 'patient' ? 'none' : '1px solid var(--border-color)',
                  backgroundColor: activeTab === 'patient' ? 'var(--color-gold-bronze)' : 'var(--color-white)',
                  color: activeTab === 'patient' ? 'var(--color-white)' : 'var(--color-chocolate-base)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: activeTab === 'patient' ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: activeTab === 'patient' ? 'var(--shadow-md)' : 'none',
                }}
              >
                For Patients
              </button>

              <Link
                href="/for-doctors"
                style={{
                  fontFamily: 'var(--font-sans)',
                  padding: '11px 28px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid var(--border-color)',
                  backgroundColor: 'var(--color-white)',
                  color: 'var(--color-chocolate-base)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
              >
                For Doctors
              </Link>
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
                src="/images/how-it-works/hero_patient.jpg"
                alt="Patient participating in a virtual consultation on Chekup247"
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
                  borderRadius: 'var(--radius-md)',
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
                Quality care
                <br />
                <span style={{ fontWeight: 500, color: 'var(--color-cream-text-muted)' }}>is just a few clicks away.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: 4 EASY STEPS                                       */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 96px) var(--space-6)' }}>
        <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
          {/* Header Title */}
          <div style={{ marginBottom: 'var(--space-10)' }}>
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
              {activeTab === 'patient' ? 'GET STARTED IN 4 EASY STEPS' : 'JOIN AS A HEALTHCARE PROVIDER'}
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(2.1rem, 4vw, 2.85rem)',
                fontWeight: 800,
                color: 'var(--color-chocolate-base)',
                letterSpacing: '-0.025em',
                marginBottom: 'var(--space-3)',
              }}
            >
              How It Works
            </h2>
            <p
              style={{
                fontFamily: 'var(--font-sans)',
                color: 'var(--color-cream-text-muted)',
                fontSize: 'var(--text-base)',
                margin: 0,
                maxWidth: '640px',
                lineHeight: 1.6,
              }}
            >
              {activeTab === 'patient'
                ? 'Follow these simple steps to book your consultation and get the care you need.'
                : 'Simple onboarding and automated practice workflows designed for South African doctors.'}
            </p>
          </div>

          {/* 4 Cards Grid */}
          {activeTab === 'patient' ? (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 'var(--space-6)',
              }}
            >
              {/* Card 01 */}
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
                        backgroundColor: 'var(--color-brand-50)',
                        color: 'var(--color-brand-600)',
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
                        backgroundColor: 'var(--color-brand-50)',
                        color: 'var(--color-brand-600)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="magnifier-linear" size={22} color="var(--color-brand-600)" />
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
                    Choose Your Doctor &amp; Time Slot
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    Browse our network of certified healthcare professionals and specialists. Filter by specialty,
                    language, and location. Select a time that works for you.
                  </p>
                </div>

                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/doctors"
                    aria-label="Browse doctors and choose a time slot"
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
                  </Link>
                </div>
              </div>

              {/* Card 02 */}
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
                      <SolarIcon name="card-2-linear" size={22} color="var(--color-rating-subtext)" />
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
                    Secure Payment
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    Pay safely using your Visa, Mastercard, or other supported payment methods. Your payment is held
                    securely and only disbursed to the doctor after your consultation is complete.
                  </p>
                </div>

                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/pricing"
                    aria-label="Learn more about secure payments"
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
                  </Link>
                </div>
              </div>

              {/* Card 03 */}
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
                        backgroundColor: '#EDE9FE',
                        color: '#7C3AED',
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
                        backgroundColor: '#EDE9FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="videocamera-record-linear" size={22} color="#7C3AED" />
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
                    Join Your Video Call
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    At your scheduled time, tap &ldquo;Join Consultation&rdquo; to enter your encrypted video room powered
                    by Daily.co. Talk face-to-face with your physician from any device.
                  </p>
                </div>

                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/how-it-works#system-requirements"
                    aria-label="View system requirements for video consultations"
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
                  </Link>
                </div>
              </div>

              {/* Card 04 */}
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
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
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
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="document-medicine-linear" size={22} color="#16A34A" />
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
                    Get E-Prescriptions &amp; Medical Aid Invoices
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    Immediately after your consultation, download your digitally signed e-prescription with ICD-10 codes
                    and SAPC standards. Receive your medical aid invoice by email.
                  </p>
                </div>

                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/register"
                    aria-label="Register to receive e-prescriptions"
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
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            /* Doctor Flow Cards */
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: 'var(--space-6)',
              }}
            >
              {/* Doctor Card 01 */}
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
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                    <span
                      style={{
                        backgroundColor: 'var(--color-brand-50)',
                        color: 'var(--color-brand-600)',
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
                        backgroundColor: 'var(--color-brand-50)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="user-check-linear" size={22} color="var(--color-brand-600)" />
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
                    HPCSA Credential Verification
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    Sign in with your LocumStaff account or register directly. Our clinical credentialing committee
                    swiftly validates your active registration on the HPCSA medical register and indemnity cover.
                  </p>
                </div>
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/for-doctors"
                    aria-label="Provider credential verification"
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
                    }}
                  >
                    <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                  </Link>
                </div>
              </div>

              {/* Doctor Card 02 */}
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
                    Set Rates &amp; Availability
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    Retain total autonomy over your schedule. Set your consultation rates, open 30-minute booking
                    intervals, and sync with your external Google or Outlook calendar seamlessly.
                  </p>
                </div>
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/for-doctors"
                    aria-label="Set up schedule"
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
                    }}
                  >
                    <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                  </Link>
                </div>
              </div>

              {/* Doctor Card 03 */}
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
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                    <span
                      style={{
                        backgroundColor: '#EDE9FE',
                        color: '#7C3AED',
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
                        backgroundColor: '#EDE9FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="stethoscope-linear" size={22} color="#7C3AED" />
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
                    Video Calls &amp; E-Prescriptions
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    Consult patients in secure encrypted rooms. Search integrated ICD-10 diagnostic codes, write
                    structured SOAP notes, and generate digitally signed, tamper-evident PDF prescriptions.
                  </p>
                </div>
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/for-doctors"
                    aria-label="Clinical tools"
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
                    }}
                  >
                    <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                  </Link>
                </div>
              </div>

              {/* Doctor Card 04 */}
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
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
                    <span
                      style={{
                        backgroundColor: '#DCFCE7',
                        color: '#16A34A',
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
                        backgroundColor: '#DCFCE7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SolarIcon name="wallet-money-linear" size={22} color="#16A34A" />
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
                    Guaranteed Weekly Earnings
                  </h3>
                  <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.6, margin: 0 }}>
                    Consultation fees are held in escrow and credited to your earnings wallet upon session completion.
                    Weekly payouts are disbursed directly to your South African bank account via EFT.
                  </p>
                </div>
                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/for-doctors"
                    aria-label="Provider payouts"
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
                    }}
                  >
                    <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-bronze)" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: SYSTEM & TECHNICAL REQUIREMENTS                   */}
      {/* ------------------------------------------------------------- */}
      <section id="system-requirements" style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 96px) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            backgroundColor: '#F0F5F2',
            borderRadius: 'var(--radius-2xl)',
            padding: 'clamp(36px, 5vw, 56px) clamp(24px, 4vw, 48px)',
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: 'var(--space-8)' }}>
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
              WHAT YOU NEED
            </span>
            <h2
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 'clamp(1.9rem, 3.5vw, 2.5rem)',
                fontWeight: 800,
                color: 'var(--color-chocolate-base)',
                letterSpacing: '-0.025em',
                marginBottom: 'var(--space-2)',
              }}
            >
              System &amp; Technical Requirements
            </h2>
            <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-base)', margin: 0 }}>
              Everything you need for an uninterrupted HD video consultation.
            </p>
          </div>

          {/* 4 White Requirement Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: 'var(--space-5)',
            }}
          >
            {/* Req 1: Browser */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <SolarIcon name="laptop-2-linear" size={24} color="var(--color-chocolate-base)" />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Any Modern Browser
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.55, margin: 0 }}>
                Google Chrome, Apple Safari, Microsoft Edge, or Mozilla Firefox.
              </p>
            </div>

            {/* Req 2: Camera & Mic */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <SolarIcon name="camera-linear" size={24} color="var(--color-chocolate-base)" />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Camera &amp; Microphone
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.55, margin: 0 }}>
                Built-in smartphone camera or webcam with standard microphone.
              </p>
            </div>

            {/* Req 3: Internet */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <SolarIcon name="transmission-linear" size={24} color="var(--color-chocolate-base)" />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Stable Internet
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.55, margin: 0 }}>
                Minimum 1 Mbps broadband, 4G, or 5G mobile data connection.
              </p>
            </div>

            {/* Req 4: Private Space */}
            <div
              style={{
                backgroundColor: 'var(--color-white)',
                borderRadius: 'var(--radius-xl)',
                padding: '24px 22px',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 'var(--space-4)',
                }}
              >
                <SolarIcon name="shield-linear" size={24} color="var(--color-chocolate-base)" />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'var(--text-base)',
                  fontWeight: 700,
                  color: 'var(--color-chocolate-base)',
                  marginBottom: 'var(--space-2)',
                }}
              >
                Private Space
              </h3>
              <p style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-cream-text-muted)', fontSize: 'var(--text-sm)', lineHeight: 1.55, margin: 0 }}>
                Quiet, well-lit room ensuring clinical confidentiality and privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: FOOTER CTA SECTION                                */}
      {/* ------------------------------------------------------------- */}
      <section style={{ padding: '0 var(--space-6) clamp(64px, 8vw, 100px) var(--space-6)' }}>
        <div
          style={{
            maxWidth: '1240px',
            margin: '0 auto',
            backgroundColor: 'var(--color-cream-surface)',
            borderRadius: 'var(--radius-2xl)',
            padding: 'clamp(44px, 6vw, 64px) clamp(28px, 5vw, 64px)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(223, 171, 98, 0.25)',
          }}
        >
          {/* Subtle curved background graphic in CTA */}
          <div
            style={{
              position: 'absolute',
              right: '-10%',
              top: '-20%',
              width: '540px',
              height: '540px',
              borderRadius: 'var(--radius-full)',
              background: 'radial-gradient(circle, #F3EAE0 0%, rgba(243, 234, 224, 0) 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
            aria-hidden="true"
          />

          <div
            style={{
              position: 'relative',
              zIndex: 1,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 'clamp(36px, 5vw, 60px)',
              alignItems: 'center',
            }}
          >
            {/* Left Column: CTA Pitch */}
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
                READY TO GET STARTED?
              </span>

              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(2.2rem, 4.2vw, 3.2rem)',
                  fontWeight: 800,
                  color: 'var(--color-chocolate-base)',
                  lineHeight: 1.18,
                  letterSpacing: '-0.025em',
                  marginBottom: 'var(--space-4)',
                }}
              >
                Experience Frictionless Healthcare
              </h2>

              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  color: 'var(--color-cream-text-muted)',
                  fontSize: 'var(--text-base)',
                  lineHeight: 1.6,
                  maxWidth: '460px',
                  marginBottom: 'var(--space-8)',
                }}
              >
                Book your consultation today and get the care you need, when you need it.
              </p>

              {/* Action Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-5)',
                  flexWrap: 'wrap',
                }}
              >
                <Link
                  href="/doctors"
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
                  <span>Find a Doctor Now</span>
                  <SolarIcon name="arrow-right-linear" size={16} color="var(--color-white)" />
                </Link>

                <Link
                  href="/pricing"
                  style={{
                    fontFamily: 'var(--font-sans)',
                    color: 'var(--color-chocolate-base)',
                    fontWeight: 600,
                    fontSize: 'var(--text-sm)',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    transition: 'color 0.2s ease',
                  }}
                >
                  <span>View Transparent Pricing</span>
                  <SolarIcon name="arrow-right-linear" size={15} color="var(--color-chocolate-base)" />
                </Link>
              </div>
            </div>

            {/* Right Column: Realistic Phone Mockup & 3 Floating Badges */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'clamp(16px, 3vw, 28px)',
                flexWrap: 'wrap',
              }}
            >
              {/* Smartphone Frame */}
              <div
                style={{
                  width: '210px',
                  borderRadius: '34px',
                  border: '8px solid var(--color-chocolate-dark)',
                  backgroundColor: '#000000',
                  boxShadow: 'var(--shadow-xl)',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                }}
              >
                {/* Dynamic island / top notch */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '64px',
                    height: '14px',
                    backgroundColor: 'var(--color-chocolate-dark)',
                    borderRadius: 'var(--radius-full)',
                    zIndex: 10,
                  }}
                  aria-hidden="true"
                />

                {/* Doctor Video Call Image */}
                <div style={{ position: 'relative', width: '100%', aspectRatio: '9 / 16' }}>
                  <Image
                    src="/images/how-it-works/cta_doctor_call.jpg"
                    alt="Doctor on video consultation call with patient"
                    fill
                    sizes="210px"
                    style={{
                      objectFit: 'cover',
                      objectPosition: 'center',
                    }}
                  />
                </div>
              </div>

              {/* 3 Floating Badges to the Right */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--space-3)',
                  justifyContent: 'center',
                }}
              >
                {/* Badge 1: Secure & Encrypted */}
                <div
                  style={{
                    backgroundColor: 'var(--color-white)',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 18px 8px 10px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-gold-pale)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SolarIcon name="shield-check-linear" size={18} color="var(--color-gold-bronze)" />
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)', whiteSpace: 'nowrap' }}>
                    Secure &amp; Encrypted
                  </span>
                </div>

                {/* Badge 2: Certified Doctors */}
                <div
                  style={{
                    backgroundColor: 'var(--color-white)',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 18px 8px 10px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-gold-pale)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SolarIcon name="verified-check-linear" size={18} color="var(--color-gold-bronze)" />
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)', whiteSpace: 'nowrap' }}>
                    Certified Doctors
                  </span>
                </div>

                {/* Badge 3: On-Demand Care */}
                <div
                  style={{
                    backgroundColor: 'var(--color-white)',
                    borderRadius: 'var(--radius-full)',
                    padding: '8px 18px 8px 10px',
                    boxShadow: 'var(--shadow-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-2)',
                    border: '1px solid rgba(223, 171, 98, 0.2)',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--color-gold-pale)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <SolarIcon name="clock-circle-linear" size={18} color="var(--color-gold-bronze)" />
                  </div>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-chocolate-base)', whiteSpace: 'nowrap' }}>
                    On-Demand Care
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
