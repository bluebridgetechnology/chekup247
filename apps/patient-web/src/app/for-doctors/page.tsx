'use client';

import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import {
  ShieldCheck,
  Coins,
  Clock,
  Laptop,
  CheckCircle2,
  FileCheck,
  Award,
  ArrowRight,
  Stethoscope,
  Users,
  ChevronRight,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

const DOCTOR_TESTIMONIALS = [
  {
    quote:
      'ChekUp247 gives me the freedom to consult patients between my morning hospital rounds and evening duties. The integrated WHO ICD-10 diagnostic library makes scripting effortless.',
    author: 'Dr. Thabo Molefe',
    title: 'General Practitioner, Gauteng',
    years: '12 years in practice',
  },
  {
    quote:
      'The LocumStaff single sign-on meant zero administrative friction. My HPCSA credentials were verified within 24 hours, and payouts arrive without fail every Monday.',
    author: 'Dr. Sarah Van Der Merwe',
    title: 'Paediatric Specialist, Western Cape',
    years: '15 years in practice',
  },
];

export default function ForDoctorsPage() {
  const doctorPortalUrl =
    process.env.NEXT_PUBLIC_DOCTOR_PORTAL_URL || 'http://localhost:3001';

  return (
    <div style={{ background: 'var(--bg-primary)', paddingBottom: '80px' }}>
      {/* Hero Banner */}
      <section
        style={{
          background: 'radial-gradient(100% 100% at 50% 0%, #ecfdf5 0%, #f8fafc 60%, #ffffff 100%)',
          padding: '56px 0 72px 0',
          borderBottom: '1px solid var(--color-slate-200)',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <Breadcrumbs items={[{ label: 'For Doctors' }]} />

          <div style={{ maxWidth: '850px', margin: '20px auto 0 auto' }}>
            <div
              className="badge badge-brand"
              style={{ marginBottom: '20px', padding: '6px 16px', fontSize: '0.85rem' }}
            >
              <Sparkles size={16} />
              <span>South Africa&apos;s Premier Medical Practitioner Network</span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 5vw, 3.6rem)',
                color: 'var(--color-slate-900)',
                lineHeight: 1.15,
                fontWeight: 800,
                marginBottom: '20px',
              }}
            >
              Practice Medicine on Your Terms with{' '}
              <span
                style={{
                  background:
                    'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-400) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                ChekUp247
              </span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
                color: 'var(--color-slate-600)',
                lineHeight: 1.6,
                maxWidth: '700px',
                margin: '0 auto 36px auto',
              }}
            >
              Expand your patient reach across South Africa. Earn competitive rates, set your own bookable hours, and consult through an intuitive telehealth platform.
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <a
                href={doctorPortalUrl}
                className="btn-primary touch-target"
                style={{ padding: '16px 36px', fontSize: '1rem', fontWeight: 700 }}
              >
                <span>Access Doctor Portal</span>
                <ExternalLink size={18} />
              </a>
              <a
                href="#verification-criteria"
                className="btn-secondary touch-target"
                style={{ padding: '16px 28px', fontSize: '1rem' }}
              >
                View Credentialing Criteria
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value Pillars */}
      <section style={{ padding: '80px 0', background: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2 style={{ fontSize: '2.25rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
              Why Leading Doctors Choose ChekUp247
            </h2>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '1.05rem' }}>
              Designed by healthcare practitioners to eliminate clinical friction and administrative overhead.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px',
            }}
          >
            {/* Pillar 1 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <Coins size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                Transparent Earnings & Escrow
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                You set your own consultation rates (standard GP rates range from R400 – R850 per 30-min slot). Patient payments are secured upfront in escrow and paid out weekly via direct EFT to your bank account.
              </p>
            </div>

            {/* Pillar 2 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <Clock size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                Complete Schedule Autonomy
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Open bookable consultation slots when it suits you — mornings, evenings, or weekends. Sync your availability with Google Calendar and toggle instant consultation availability whenever you are on duty.
              </p>
            </div>

            {/* Pillar 3 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <Laptop size={26} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                Integrated E-Prescriptions & ICD-10
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Instant real-time search across the official WHO ICD-10 diagnostic library. Issue digitally signed, tamper-evident e-prescriptions that patients can redeem at any licensed pharmacy in South Africa.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* LocumStaff SSO Highlight */}
      <section style={{ padding: '72px 0', background: 'var(--color-slate-50)' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-brand-200)',
              borderRadius: 'var(--radius-2xl)',
              padding: '40px',
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '32px',
              alignItems: 'center',
            }}
          >
            <div style={{ flex: '1 1 380px' }}>
              <div
                className="badge badge-brand"
                style={{ marginBottom: '12px', padding: '4px 12px', fontSize: '0.8rem' }}
              >
                Seamless Partner Integration
              </div>
              <h2 style={{ fontSize: '1.85rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                Fast-Track Onboarding with LocumStaff SSO
              </h2>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem', marginBottom: '20px' }}>
                Already registered with LocumStaff? Your verified practitioner credentials, HPCSA registration, and verified banking details synchronize automatically into ChekUp247 with one click.
              </p>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--color-slate-700)' }}>
                  <CheckCircle2 size={16} color="var(--color-brand-500)" />
                  <span>Single Sign-On (SSO) with zero duplicate paperwork</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--color-slate-700)' }}>
                  <CheckCircle2 size={16} color="var(--color-brand-500)" />
                  <span>Automated practice profile and biography synchronization</span>
                </li>
              </ul>
            </div>

            <div
              style={{
                flex: '1 1 280px',
                background: 'var(--color-brand-50)',
                padding: '28px',
                borderRadius: 'var(--radius-xl)',
                textAlign: 'center',
              }}
            >
              <Award size={40} color="var(--color-brand-600)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.15rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                HPCSA Registered?
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', marginBottom: '20px' }}>
                Get verified within 24 hours and start accepting telehealth appointments this week.
              </p>
              <a
                href={doctorPortalUrl}
                className="btn-primary touch-target"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Sign In with LocumStaff
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Criteria Checklist */}
      <section id="verification-criteria" style={{ padding: '80px 0', background: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '850px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
              Doctor Credentialing & Verification Criteria
            </h2>
            <p style={{ color: 'var(--color-slate-600)' }}>
              In compliance with HPCSA Booklet 10 and South African healthcare governance, all practitioners must meet these requirements:
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              {
                title: 'Active HPCSA Registration',
                desc: 'Must hold an active, unencumbered registration as an Independent Medical Practitioner with the Health Professions Council of South Africa (HPCSA).',
              },
              {
                title: 'Certified Identity Verification',
                desc: 'South African National Identity Document or valid passport and work authorization.',
              },
              {
                title: 'Medical Malpractice Indemnity Insurance',
                desc: 'Current proof of professional medical indemnity coverage (MPS, EthiQal, or equivalent).',
              },
              {
                title: 'Registered Practice Number (BHF / PCNS)',
                desc: 'Active practice number for billing and medical aid claim compatibility.',
              },
              {
                title: 'Verified South African Bank Account',
                desc: 'Official bank confirmation letter for direct weekly electronic EFT earnings payouts.',
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  gap: '16px',
                  background: 'var(--color-slate-50)',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '20px 24px',
                  alignItems: 'flex-start',
                }}
              >
                <CheckCircle2 size={22} color="var(--color-brand-600)" style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: 'var(--color-slate-900)', marginBottom: '4px' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Doctor Testimonials */}
      <section style={{ padding: '80px 0', background: 'var(--color-slate-50)' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
              What Our Practitioners Say
            </h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '28px' }}>
            {DOCTOR_TESTIMONIALS.map((t, idx) => (
              <div
                key={idx}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '32px',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <p style={{ color: 'var(--color-slate-700)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '20px' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-slate-900)' }}>{t.author}</h4>
                <p style={{ color: 'var(--color-brand-600)', fontSize: '0.85rem', fontWeight: 600 }}>{t.title}</p>
                <p style={{ color: 'var(--color-slate-400)', fontSize: '0.75rem' }}>{t.years}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section
        style={{
          padding: '72px 0',
          background: 'linear-gradient(135deg, var(--color-slate-900) 0%, #064e3b 100%)',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 style={{ fontSize: '2.25rem', marginBottom: '16px' }}>
            Ready to Join South Africa&apos;s Telehealth Network?
          </h2>
          <p
            style={{
              color: 'var(--color-slate-300)',
              fontSize: '1.1rem',
              lineHeight: 1.6,
              marginBottom: '32px',
            }}
          >
            Create your practitioner profile or sign in with LocumStaff in less than 2 minutes.
          </p>
          <a
            href={doctorPortalUrl}
            className="btn-primary touch-target"
            style={{ padding: '16px 36px', fontSize: '1rem' }}
          >
            Open Doctor Portal
          </a>
        </div>
      </section>
    </div>
  );
}
