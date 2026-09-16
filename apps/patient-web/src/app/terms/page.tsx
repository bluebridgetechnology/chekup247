'use client';

import React from 'react';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { AlertCircle, Shield, Scale } from 'lucide-react';

export default function TermsPage() {
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
        <div className="container" style={{ maxWidth: '840px' }}>
          <Breadcrumbs items={[{ label: 'Terms of Service' }]} />

          <div style={{ marginTop: '16px' }}>
            <span
              style={{
                color: 'var(--color-brand-600)',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Platform Agreement
            </span>
            <h1
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
                color: 'var(--color-slate-900)',
                marginTop: '8px',
                marginBottom: '12px',
                fontWeight: 800,
              }}
            >
              Terms of Service & Telehealth Agreement
            </h1>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '1rem' }}>
              Applicable to Patients and Healthcare Practitioners across the Republic of South Africa. Last Updated: September 2026.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ padding: '48px 0' }}>
        <div className="container" style={{ maxWidth: '840px', lineHeight: 1.75, color: 'var(--color-slate-700)' }}>
          {/* Emergency Warning */}
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-xl)',
              padding: '24px',
              marginBottom: '40px',
            }}
          >
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#991b1b', marginBottom: '6px' }}>
              CRITICAL NOTICE: NOT FOR MEDICAL EMERGENCIES
            </h3>
            <p style={{ fontSize: '0.925rem', color: '#b91c1c' }}>
              ChekUp247 is strictly intended for non-emergency medical consultations, diagnostic second opinions, repeat chronic prescriptions, and primary care. If you are experiencing acute chest pain, severe shortness of breath, sudden numbness, severe trauma, or acute obstetric complications, call <strong>10177</strong> or <strong>112</strong> immediately or proceed to your nearest emergency facility.
            </p>
          </div>

          <article style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                1. Nature of the Service & Relationship of Parties
              </h2>
              <p style={{ marginBottom: '12px' }}>
                ChekUp247 (Pty) Ltd provides a digital communications, scheduling, and billing platform. ChekUp247 is not a medical practice and does not practice medicine.
              </p>
              <p>
                All medical consultations, clinical examinations, diagnoses, medical opinions, and prescriptions are delivered by independent medical practitioners registered with the Health Professions Council of South Africa (HPCSA). Participating doctors are independent clinical contractors and are not employees or agents of ChekUp247.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                2. Telehealth Informed Consent (HPCSA Booklet 10)
              </h2>
              <p style={{ marginBottom: '12px' }}>
                By booking a consultation on ChekUp247, you acknowledge and agree that:
              </p>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>Telehealth has inherent clinical limitations compared to in-person physical examinations (e.g. inability to palpate organs, auscultate lungs/heart directly, or measure vital signs in-person).</li>
                <li>The consulting doctor reserves the absolute clinical discretion to determine whether your medical presentation is suitable for virtual care or requires immediate in-person referral to a local emergency center or clinic.</li>
                <li>You must provide truthful, complete, and accurate information regarding your symptoms, medical history, allergies, and current medications.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                3. Electronic Prescriptions & Sick Notes
              </h2>
              <p style={{ marginBottom: '12px' }}>
                Prescriptions issued on ChekUp247 comply with South African Pharmacy Council (SAPC) standards and the Medicines and Related Substances Act.
              </p>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li>The decision to prescribe any medication, including Schedule 1 to Schedule 4 substances, rests solely in the independent professional clinical judgment of the attending physician.</li>
                <li>Prescription of Schedule 5 or 6 controlled substances is restricted by law and may not be permissible via telemedicine without prior physical clinical relationship.</li>
                <li>Medical sick certificates are issued strictly in accordance with ethical guidelines of the HPCSA and only when an examination objectively warrants absence from work or school.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                4. Fees, Payments & Escrow Mechanism
              </h2>
              <p style={{ marginBottom: '12px' }}>
                All consultation rates are displayed upfront in South African Rand (ZAR) inclusive of platform processing charges.
              </p>
              <p>
                Patient payments are collected via Paystack and held in secure escrow. Escrowed funds are disbursed to the medical practitioner only upon successful completion of the consultation. In the event of a practitioner failure to attend within the 10-minute grace period, funds are 100% reversed to the patient.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                5. Cancellations & Rescheduling Policy
              </h2>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>More than 24 hours notice:</strong> 100% full refund back to original payment method.</li>
                <li><strong>Between 2 and 24 hours notice:</strong> 80% refund credited as ChekUp247 platform credits (20% late administrative fee).</li>
                <li><strong>Less than 2 hours notice:</strong> 50% refund credited as platform credits (50% doctor reserved slot fee).</li>
                <li><strong>Doctor No-Show:</strong> 100% full automatic refund to original payment method.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                6. Governing Law & Jurisdiction
              </h2>
              <p>
                These Terms of Service are governed by and construed in accordance with the laws of the Republic of South Africa. Any dispute arising out of or in connection with these terms shall be subject to the exclusive jurisdiction of the High Court of South Africa (Gauteng Division, Johannesburg).
              </p>
            </section>
          </article>
        </div>
      </section>
    </div>
  );
}
