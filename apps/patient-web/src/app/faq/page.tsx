import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions — ChekUp247',
  description: 'Answers to common questions regarding telehealth appointments, prescriptions, and medical aid claims in South Africa.',
};

const faqs = [
  {
    q: 'Can I claim my ChekUp247 consultation from my medical aid?',
    a: 'Yes. All consultations are performed by HPCSA-registered doctors with valid practice numbers. After the consultation, you will receive an itemized receipt with practice details and ICD-10 diagnostic codes to submit directly to Discovery Health, Bonitas, Momentum, Medscheme, or any other South African scheme.',
  },
  {
    q: 'Will pharmacies accept my e-prescription?',
    a: 'Yes. E-prescriptions generated on ChekUp247 comply with South African Pharmacy Council (SAPC) standards and contain your doctor’s digital signature, HPCSA registration number, and official diagnosis ICD-10 code. You can present the PDF on your phone or forward it to any pharmacy.',
  },
  {
    q: 'What happens if the doctor does not show up?',
    a: 'If a doctor fails to join the consultation within the 10-minute grace period, the appointment is marked as a doctor no-show and a 100% full refund is automatically initiated to your original payment card.',
  },
  {
    q: 'Do I need to download any apps to attend the video call?',
    a: 'No. ChekUp247 video rooms run natively inside your mobile or desktop browser (Safari, Chrome, Edge, Firefox) using secure WebRTC encryption.',
  },
  {
    q: 'Can doctors prescribe Schedule 5 or Schedule 6 medications online?',
    a: 'Telehealth regulations in South Africa (SAHPRA / HPCSA) require additional clinical documentation and physician supervision declarations for Schedule 5 and 6 substances. Prescriptions for controlled substances are issued at the sole discretion of the consulting physician under statutory compliance guidelines.',
  },
];

export default function FaqPage() {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <Breadcrumbs items={[{ label: 'FAQ' }]} />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--color-slate-900)' }}>
          Frequently Asked Questions
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '40px' }}>
          Find answers to common questions about virtual appointments, prescriptions, and payments.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {faqs.map((faq, i) => (
            <div
              key={i}
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-lg)',
                padding: '24px',
              }}
            >
              <h3 style={{ fontSize: '1.15rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                {faq.q}
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
