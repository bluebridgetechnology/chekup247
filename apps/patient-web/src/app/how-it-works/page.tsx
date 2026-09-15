import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { Search, Calendar, Video, FileText, CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'How It Works — ChekUp247',
  description: 'Detailed step-by-step guide to virtual consultations on ChekUp247.',
};

export default function HowItWorksPage() {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <Breadcrumbs items={[{ label: 'How It Works' }]} />

      <div style={{ maxWidth: '840px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--color-slate-900)' }}>
          How Virtual Consultations Work
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '48px' }}>
          ChekUp247 connects you directly with certified doctors in South Africa for instant or scheduled medical consultations. Here is how your consultation journey looks from booking to prescription.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-brand-500)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              1
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Select Your Doctor & Available Slot</h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6 }}>
                Browse our directory of verified medical doctors by specialty, language, and patient rating. Each doctor lists their consultation rate and 30-minute bookable slots.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-brand-500)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              2
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Secure Checkout via Paystack</h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6 }}>
                Pay safely using credit/debit card, Instant EFT, or your saved ChekUp247 platform credits. Your payment is held securely in escrow and only released upon successful consultation.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-brand-500)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              3
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Join Your Encrypted HD Video Consultation</h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6 }}>
                You will receive reminder SMS and email alerts 24 hours, 1 hour, and 15 minutes before the session. Join with one click from any modern browser.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '20px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                background: 'var(--color-brand-500)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              4
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', marginBottom: '8px' }}>Download E-Prescription & Sick Note</h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6 }}>
                Following the consultation, the doctor generates your official e-prescription with ICD-10 diagnostic codes and NAPPI item numbers. Download immediately to fill at your preferred pharmacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
