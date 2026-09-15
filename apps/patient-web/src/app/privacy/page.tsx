import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { ShieldCheck, Lock, Database } from 'lucide-react';

export const metadata: Metadata = {
  title: 'POPIA Privacy Notice — ChekUp247',
  description: 'Protection of Personal Information Act (POPIA) compliance and health record handling policy.',
};

export default function PrivacyPage() {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <Breadcrumbs items={[{ label: 'POPIA Privacy Policy' }]} />

      <div style={{ maxWidth: '800px', margin: '0 auto', lineHeight: 1.7, color: 'var(--color-slate-700)' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--color-slate-900)' }}>
          POPIA Privacy & Health Data Policy
        </h1>
        <p style={{ color: 'var(--color-slate-500)', marginBottom: '32px' }}>
          In accordance with the Protection of Personal Information Act 4 of 2013 (POPIA)
        </p>

        <div style={{ background: 'var(--color-brand-50)', border: '1px solid var(--color-brand-200)', borderRadius: 'var(--radius-lg)', padding: '24px', marginBottom: '36px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-brand-800)', fontWeight: 700, marginBottom: '8px' }}>
            <ShieldCheck size={20} />
            <span>South African Data Residency & Security Guarantee</span>
          </div>
          <p style={{ fontSize: '0.925rem', color: 'var(--color-brand-900)' }}>
            All patient health records, clinical notes, prescriptions, and identity documents are stored in dedicated encrypted databases with strict access control and comprehensive audit logging.
          </p>
        </div>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
            1. Information We Collect
          </h2>
          <p>
            When registering or booking a consultation, we collect personal identifiers (name, date of birth, contact information) and special personal information (health consultation notes, symptoms, ICD-10 diagnosis codes, prescription records) necessary for clinical continuity and pharmacy fulfillment.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
            2. Medical Confidentiality & Access
          </h2>
          <p>
            Your clinical consultations and medical records are confidential between you and your attending doctor. Platform administrators and support personnel have zero access to private doctor clinical notes. Every administrative access to system audit logs is permanently tracked.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
            3. Patient Rights
          </h2>
          <p>
            Under POPIA Section 23–25, you have the right to request access to your health records, request correction of inaccurate information, or request deletion of account credentials (subject to statutory HPCSA medical record retention requirements).
          </p>
        </section>
      </div>
    </div>
  );
}
