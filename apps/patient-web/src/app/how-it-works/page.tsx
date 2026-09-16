'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import {
  Search,
  CreditCard,
  Video,
  FileText,
  UserCheck,
  Calendar,
  Stethoscope,
  Coins,
  ShieldCheck,
  CheckCircle2,
  Wifi,
  Camera,
  Laptop,
  ArrowRight,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

export default function HowItWorksPage() {
  const [activeTab, setActiveTab] = useState<'patient' | 'doctor'>('patient');

  return (
    <div style={{ background: 'var(--bg-primary)', paddingBottom: '80px' }}>
      {/* Header Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e6f7f5 50%, #ffffff 100%)',
          padding: '48px 0 40px 0',
          borderBottom: '1px solid var(--color-slate-200)',
        }}
      >
        <div className="container">
          <Breadcrumbs items={[{ label: 'How It Works' }]} />

          <div style={{ maxWidth: '800px', margin: '16px auto 0 auto', textAlign: 'center' }}>
            <span
              style={{
                color: 'var(--color-brand-600)',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Step-by-Step Walkthrough
            </span>
            <h1
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
                color: 'var(--color-slate-900)',
                marginTop: '8px',
                marginBottom: '16px',
                fontWeight: 800,
              }}
            >
              How Virtual Consultations Work
            </h1>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--color-slate-600)',
                lineHeight: 1.6,
                marginBottom: '32px',
              }}
            >
              ChekUp247 seamlessly connects South African patients with certified HPCSA medical doctors for secure, on-demand clinical care.
            </p>

            {/* Interactive Tab Switcher */}
            <div
              role="tablist"
              style={{
                display: 'inline-flex',
                background: 'var(--color-slate-200)',
                padding: '4px',
                borderRadius: 'var(--radius-full)',
                gap: '4px',
              }}
            >
              <button
                role="tab"
                aria-selected={activeTab === 'patient'}
                onClick={() => setActiveTab('patient')}
                className="touch-target"
                style={{
                  padding: '10px 28px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: activeTab === 'patient' ? '#ffffff' : 'transparent',
                  color: activeTab === 'patient' ? 'var(--color-brand-700)' : 'var(--color-slate-600)',
                  boxShadow: activeTab === 'patient' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                For Patients
              </button>
              <button
                role="tab"
                aria-selected={activeTab === 'doctor'}
                onClick={() => setActiveTab('doctor')}
                className="touch-target"
                style={{
                  padding: '10px 28px',
                  borderRadius: 'var(--radius-full)',
                  border: 'none',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: activeTab === 'doctor' ? '#ffffff' : 'transparent',
                  color: activeTab === 'doctor' ? 'var(--color-brand-700)' : 'var(--color-slate-600)',
                  boxShadow: activeTab === 'doctor' ? 'var(--shadow-sm)' : 'none',
                }}
              >
                For Doctors
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Flow Steps */}
      <section style={{ padding: '64px 0' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          {activeTab === 'patient' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Step 1 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Search size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 1
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    Choose Your Doctor & Desired Time Slot
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Browse our public directory of general practitioners and specialists across South Africa. Filter by medical specialty, languages spoken (English, isiZulu, Afrikaans, etc.), patient reviews, and upfront consultation rates. Select an available 30-minute booking window.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      Verified HPCSA Credentials
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      Same-day & Scheduled Slots
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 2 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <CreditCard size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 2
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    Secure Escrow Payment via Paystack
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Pay securely using your Visa or Mastercard debit/credit card, Instant EFT, or your ChekUp247 platform wallet credits. Your payment is held safely in escrow and is only disbursed to the doctor after the consultation is completed.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      PCI-DSS Level 1 Secure
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      100% Refund if Doctor Misses Session
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 3 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Video size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 3
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    Attend Your Private HD Video Call
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Receive automated SMS, WhatsApp, and email reminders 24h, 1h, and 15m prior to the slot. At consultation time, tap &apos;Join Consultation&apos; to enter an encrypted video room powered by Daily.co. Talk face-to-face with your physician from any phone, tablet, or laptop.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      Zero App Download Required
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      Peer-to-Peer Encrypted WebRTC
                    </span>
                  </div>
                </div>
              </div>

              {/* Step 4 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <FileText size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 4
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    Get E-Prescriptions & Medical Aid Invoices
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Immediately following the consultation, download your digitally signed e-prescription with ICD-10 diagnostic codes and SAPC standards. Take the PDF to any South African pharmacy or email it directly. Download an itemized receipt with the doctor&apos;s practice number for reimbursement.
                  </p>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '0.85rem', color: 'var(--color-slate-500)' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      Accepted at Dis-Chem, Clicks & Independent Pharmacies
                    </span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={16} color="var(--color-brand-500)" />
                      Claimable on Discovery, Bonitas, Momentum & Medscheme
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
              {/* Doctor Step 1 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <UserCheck size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 1
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    LocumStaff SSO & HPCSA Credential Verification
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Sign in seamlessly with your LocumStaff account or register directly. Our clinical credentialing committee verifies your active registration on the HPCSA medical practitioner register, identity documents, and medical malpractice indemnity insurance.
                  </p>
                </div>
              </div>

              {/* Doctor Step 2 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Calendar size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 2
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    Set Your Consultation Rates & Weekly Availability
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    You retain total autonomy over your practice. Set your hourly consultation rates, define your bookable schedule in 30-minute intervals, and sync with your external Google/Outlook calendar. Update availability on the fly from your desktop or phone.
                  </p>
                </div>
              </div>

              {/* Doctor Step 3 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Stethoscope size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 3
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    Conduct Video Consultations & Issue E-Prescriptions
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Consult patients in secure encrypted video rooms. Search the integrated WHO ICD-10 diagnostic library in real-time, write structured clinical SOAP notes, extend consultation duration if required, and generate tamper-evident PDF prescriptions with your digital signature.
                  </p>
                </div>
              </div>

              {/* Doctor Step 4 */}
              <div
                style={{
                  display: 'flex',
                  gap: '24px',
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '36px',
                  boxShadow: 'var(--shadow-sm)',
                  alignItems: 'flex-start',
                }}
              >
                <div
                  style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '16px',
                    background: 'var(--color-brand-50)',
                    color: 'var(--color-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Coins size={28} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-brand-600)' }}>
                      STEP 4
                    </span>
                  </div>
                  <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                    Guaranteed Weekly Earnings & Automatic Payouts
                  </h2>
                  <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '16px' }}>
                    Consultation fees are held safely in escrow during booking and credited to your earnings wallet immediately upon completion. Weekly payouts are disbursed directly into your South African business or personal bank account via EFT.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Technical Requirements Infographic */}
      <section style={{ padding: '64px 0', background: '#ffffff', borderTop: '1px solid var(--color-slate-200)' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontSize: '1.85rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
              System & Technical Requirements
            </h2>
            <p style={{ color: 'var(--color-slate-600)' }}>
              Everything you need for an uninterrupted HD video consultation
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
            }}
          >
            <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <Laptop size={32} color="var(--color-brand-600)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Any Modern Browser</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                Google Chrome, Apple Safari, Microsoft Edge, or Mozilla Firefox.
              </p>
            </div>

            <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <Camera size={32} color="var(--color-brand-600)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Camera & Microphone</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                Built-in smartphone camera or webcam with standard microphone.
              </p>
            </div>

            <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <Wifi size={32} color="var(--color-brand-600)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Stable Internet</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                Minimum 1 Mbps broadband, 4G, or 5G mobile data connection.
              </p>
            </div>

            <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
              <ShieldCheck size={32} color="var(--color-brand-600)" style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', marginBottom: '6px' }}>Private Space</h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)' }}>
                Quiet, well-lit room ensuring clinical confidentiality and privacy.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: '64px 0', textAlign: 'center' }}>
        <div className="container">
          <h2 style={{ fontSize: '2rem', marginBottom: '16px', color: 'var(--color-slate-900)' }}>
            Ready to experience frictionless healthcare?
          </h2>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/doctors" className="btn-primary touch-target">
              Find a Doctor Now
            </Link>
            <Link href="/pricing" className="btn-secondary touch-target">
              View Transparent Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
