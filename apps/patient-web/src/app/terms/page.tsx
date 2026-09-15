import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Terms of Service — ChekUp247',
  description: 'Legal terms and conditions governing the use of the ChekUp247 telehealth platform.',
};

export default function TermsPage() {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <Breadcrumbs items={[{ label: 'Terms of Service' }]} />

      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: 1.7, color: 'var(--color-slate-700)' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--color-slate-900)' }}>
          Terms of Service
        </h1>
        <p style={{ color: 'var(--color-slate-500)', marginBottom: '32px' }}>
          Last Updated: September 2026
        </p>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
            1. Nature of the Service
          </h2>
          <p>
            ChekUp247 operates a digital platform connecting patients with independent, HPCSA-registered healthcare professionals for virtual consultations. ChekUp247 is not a medical practice and does not itself deliver clinical advice. All medical decisions and prescriptions are made independently by the attending doctor.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
            2. Medical Emergencies
          </h2>
          <p style={{ fontWeight: 600, color: 'var(--color-danger)' }}>
            ChekUp247 is NOT designed for medical emergencies. If you are experiencing chest pain, severe shortness of breath, sudden numbness, or severe trauma, call 10177 / 112 immediately or visit the nearest emergency trauma center.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
            3. Cancellations & Refunds
          </h2>
          <p>
            Cancellations made 24 hours or more before scheduled appointment times are eligible for a 100% full refund to the original payment method. Cancellations made less than 24 hours prior to appointment are subject to deduction fees as stipulated in our cancellation policy. If a doctor fails to attend the consultation within the 10-minute grace period, a full 100% refund is automatically issued.
          </p>
        </section>
      </div>
    </div>
  );
}
