'use client';

import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import {
  Check,
  Shield,
  CreditCard,
  Wallet,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
  Lock,
} from 'lucide-react';

export default function PricingClient() {
  return (
    <div style={{ background: 'var(--bg-primary)', paddingBottom: '80px' }}>
      {/* Header Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e6f7f5 50%, #ffffff 100%)',
          padding: '48px 0 40px 0',
          borderBottom: '1px solid var(--color-slate-200)',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <Breadcrumbs items={[{ label: 'Pricing & Transparency' }]} />

          <div style={{ maxWidth: '820px', margin: '16px auto 0 auto' }}>
            <span
              style={{
                color: 'var(--color-brand-600)',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              100% Transparent Telehealth
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
              Upfront Pricing, Zero Hidden Fees
            </h1>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--color-slate-600)',
                lineHeight: 1.6,
                maxWidth: '650px',
                margin: '0 auto',
              }}
            >
              No monthly subscription fees or surprise invoices. You only pay for the consultations you book, with funds protected in escrow.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section style={{ padding: '64px 0' }}>
        <div className="container" style={{ maxWidth: '1000px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px',
              marginBottom: '64px',
            }}
          >
            {/* GP Card */}
            <div
              style={{
                background: '#ffffff',
                border: '2px solid var(--color-brand-500)',
                borderRadius: 'var(--radius-xl)',
                padding: '40px 32px',
                position: 'relative',
                boxShadow: 'var(--shadow-lg)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: '-14px',
                  right: '24px',
                  background: 'var(--color-brand-500)',
                  color: '#ffffff',
                  padding: '4px 14px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  letterSpacing: '0.05em',
                }}
              >
                MOST COMMON
              </div>

              <div>
                <h2 style={{ fontSize: '1.45rem', marginBottom: '8px', color: 'var(--color-slate-900)' }}>
                  General Practitioner (GP)
                </h2>
                <p style={{ color: 'var(--color-slate-500)', fontSize: '0.925rem', marginBottom: '24px' }}>
                  Ideal for common illnesses, acute infections, minor ailments, chronic repeat prescriptions, and medical sick certificates.
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                    From R350
                  </span>
                  <span style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem' }}>/ 30-min session</span>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>HPCSA-registered Medical Doctor</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>Digitally signed ICD-10 e-prescription</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>Official medical sick note (if clinically warranted)</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>Medical aid claim receipt with practice number</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>100% full refund if doctor no-shows</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/doctors?specialty=General+Practitioner"
                className="btn-primary touch-target"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Book GP Consultation
              </Link>
            </div>

            {/* Specialist Card */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '40px 32px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.45rem', marginBottom: '8px', color: 'var(--color-slate-900)' }}>
                  Medical Specialist
                </h2>
                <p style={{ color: 'var(--color-slate-500)', fontSize: '0.925rem', marginBottom: '24px' }}>
                  Dedicated specialist consultations: Paediatricians, Dermatologists, Psychiatrists, and Clinical Physicians.
                </p>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginBottom: '28px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>
                    From R650
                  </span>
                  <span style={{ color: 'var(--color-slate-500)', fontSize: '0.95rem' }}>/ 30-min session</span>
                </div>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '36px' }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>HPCSA Specialist Sub-Register verified</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>In-depth specialized diagnostic assessment</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>Specialist e-prescription & diagnostic report</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>Direct medical aid reimbursement eligible</span>
                  </li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.95rem' }}>
                    <Check size={18} color="var(--color-brand-500)" />
                    <span>Comprehensive follow-up clinical documentation</span>
                  </li>
                </ul>
              </div>

              <Link
                href="/doctors"
                className="btn-secondary touch-target"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Browse Specialists
              </Link>
            </div>
          </div>

          {/* Platform Wallet & Credit System */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-slate-200)',
              borderRadius: 'var(--radius-xl)',
              padding: '36px',
              marginBottom: '64px',
              boxShadow: 'var(--shadow-sm)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Wallet size={22} />
              </div>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)' }}>
                ChekUp247 Platform Credits & Wallet
              </h2>
            </div>

            <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '24px' }}>
              Our platform credit system provides effortless 1-click booking without having to re-enter card credentials. 1 Platform Credit = R1.00 ZAR.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '20px',
              }}
            >
              <div style={{ background: 'var(--color-slate-50)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-slate-900)', marginBottom: '6px' }}>
                  Instant 1-Click Booking
                </h4>
                <p style={{ color: 'var(--color-slate-600)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Keep a balance in your wallet to book immediate on-duty consultations without waiting for 3D-Secure SMS OTP delays.
                </p>
              </div>

              <div style={{ background: 'var(--color-slate-50)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-slate-900)', marginBottom: '6px' }}>
                  Zero Card Transaction Fees
                </h4>
                <p style={{ color: 'var(--color-slate-600)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Top up once using Instant EFT or card, then book multiple consultations without recurring payment processing fees.
                </p>
              </div>

              <div style={{ background: 'var(--color-slate-50)', padding: '20px', borderRadius: 'var(--radius-lg)' }}>
                <h4 style={{ fontSize: '1rem', color: 'var(--color-slate-900)', marginBottom: '6px' }}>
                  Instant Refund Credits
                </h4>
                <p style={{ color: 'var(--color-slate-600)', fontSize: '0.875rem', lineHeight: 1.5 }}>
                  Eligible appointment cancellations or doctor rescheduling credit your wallet balance instantly without standard 3-5 day bank delays.
                </p>
              </div>
            </div>
          </div>

          {/* Cancellation & Refund Policy Table */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-slate-200)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-sm)',
              marginBottom: '64px',
            }}
          >
            <div
              style={{
                padding: '24px 32px',
                background: 'var(--color-slate-900)',
                color: '#ffffff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Shield size={20} color="var(--color-brand-400)" />
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Transparent Cancellation & Refund Policy
                </h2>
              </div>
              <p style={{ color: 'var(--color-slate-300)', fontSize: '0.875rem' }}>
                We balance patient flexibility with fair compensation for our participating doctors&apos; reserved clinical time.
              </p>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: 'var(--color-slate-100)', borderBottom: '1px solid var(--color-slate-200)' }}>
                    <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-slate-900)' }}>Cancellation Timing</th>
                    <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-slate-900)' }}>Refund Amount</th>
                    <th style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-slate-900)' }}>Method of Return</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid var(--color-slate-100)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      &gt; 24 Hours Before Appointment
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-brand-700)', fontWeight: 700 }}>
                      100% Full Refund
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-slate-600)' }}>
                      Original payment method (Card / EFT) or Platform Credits
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-slate-100)', background: 'var(--color-slate-50)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      2 to 24 Hours Before Appointment
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-slate-800)', fontWeight: 700 }}>
                      80% Refund (20% late fee)
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-slate-600)' }}>
                      Returned as Platform Credits in your ChekUp247 wallet
                    </td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid var(--color-slate-100)' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 600, color: 'var(--color-slate-900)' }}>
                      &lt; 2 Hours Before Appointment
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-slate-800)', fontWeight: 700 }}>
                      50% Refund (50% doctor fee)
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-slate-600)' }}>
                      Platform Credits (Doctor compensated for reserved time)
                    </td>
                  </tr>
                  <tr style={{ background: '#ecfdf5' }}>
                    <td style={{ padding: '16px 24px', fontWeight: 700, color: 'var(--color-brand-900)' }}>
                      Doctor No-Show (&gt; 10 min grace)
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-brand-700)', fontWeight: 800 }}>
                      100% Automatic Refund
                    </td>
                    <td style={{ padding: '16px 24px', color: 'var(--color-brand-900)', fontWeight: 600 }}>
                      Instant reversal to original payment card + priority rebook
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Medical Aid Claims Explainer */}
          <div
            style={{
              background: 'var(--color-slate-50)',
              border: '1px solid var(--color-slate-200)',
              borderRadius: 'var(--radius-xl)',
              padding: '32px',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
              How to Claim from Your Medical Aid
            </h3>
            <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '20px', fontSize: '0.95rem' }}>
              All doctors practicing on ChekUp247 hold active Practice Numbers registered with the Board of Healthcare Funders (BHF). To submit a claim:
            </p>
            <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--color-slate-700)', fontSize: '0.9rem' }}>
              <li>Download your official receipt from your ChekUp247 account dashboard.</li>
              <li>Confirm the invoice contains the doctor&apos;s name, BHF practice number, and ICD-10 diagnostic code.</li>
              <li>Submit the digital PDF via your scheme&apos;s mobile app (Discovery, Bonitas, Momentum, Medscheme).</li>
              <li>Reimbursement is paid directly into your personal bank account by your scheme.</li>
            </ol>
          </div>
        </div>
      </section>
    </div>
  );
}
