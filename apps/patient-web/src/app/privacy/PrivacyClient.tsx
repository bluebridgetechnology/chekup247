'use client';

import React from 'react';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { ShieldCheck, Lock, Database, FileText, CheckCircle2 } from 'lucide-react';

export default function PrivacyClient() {
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
          <Breadcrumbs items={[{ label: 'POPIA Privacy Policy' }]} />

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
              Statutory Compliance
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
              POPIA Privacy Notice & Health Data Policy
            </h1>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '1rem' }}>
              In strict accordance with the Protection of Personal Information Act 4 of 2013 (&ldquo;POPIA&rdquo;) and National Health Act 61 of 2003. Last Updated: September 2026.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section style={{ padding: '48px 0' }}>
        <div className="container" style={{ maxWidth: '840px', lineHeight: 1.75, color: 'var(--color-slate-700)' }}>
          {/* Security Guarantee Box */}
          <div
            style={{
              background: 'var(--color-brand-50)',
              border: '1px solid var(--color-brand-200)',
              borderRadius: 'var(--radius-xl)',
              padding: '28px',
              marginBottom: '40px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--color-brand-800)', fontWeight: 700, marginBottom: '8px' }}>
              <ShieldCheck size={22} />
              <span style={{ fontSize: '1.1rem' }}>South African National Data Residency Guarantee</span>
            </div>
            <p style={{ fontSize: '0.925rem', color: 'var(--color-brand-900)' }}>
              ChekUp247 (Pty) Ltd processes and stores all patient medical records, clinical notes, ICD-10 diagnostic entries, and identity documentation within high-security South African data centers (AWS af-south-1 region, Cape Town). We never transfer special personal health information cross-border without explicit statutory authorization.
            </p>
          </div>

          <article style={{ display: 'flex', flexDirection: 'column', gap: '36px' }}>
            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                1. Identification of the Responsible Party & Information Officer
              </h2>
              <p style={{ marginBottom: '12px' }}>
                ChekUp247 (Pty) Ltd (Registration Number 2024/098765/07) is the &ldquo;Responsible Party&rdquo; for platform operational and billing data. Attending independent medical practitioners are separate and independent Responsible Parties regarding clinical diagnostic notes and treatment records created during consultations.
              </p>
              <div style={{ background: 'var(--color-slate-50)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.9rem' }}>
                <p><strong>Information Officer:</strong> Adv. Monica Van Der Merwe</p>
                <p><strong>Physical Address:</strong> 150 West Street, Sandton, Johannesburg, 2196</p>
                <p><strong>Privacy Enquiries:</strong> privacy@chekup247.com | popia@chekup247.com</p>
              </div>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                2. Categories of Personal & Special Personal Information Collected
              </h2>
              <p style={{ marginBottom: '12px' }}>
                In order to deliver seamless telehealth consultations and legal prescription fulfillment, we process:
              </p>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>General Personal Information:</strong> Full legal name, South African ID number or passport number, telephone number, residential address, emergency contact details, and payment transaction metadata.</li>
                <li><strong>Special Personal Information (Section 26 & 32 of POPIA):</strong> Health symptoms, medical history, past surgical notes, current medications, recorded clinical impressions, WHO ICD-10 diagnostic classifications, and digital prescriptions.</li>
                <li><strong>Practitioner Credential Data:</strong> HPCSA registration numbers, Board of Healthcare Funders (BHF) practice numbers, certified qualifications, and medical malpractice indemnity certificates.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                3. Lawful Basis and Purpose of Processing
              </h2>
              <p>
                We process your personal and health information under POPIA Section 11(1) and Section 32 (Special Personal Information relating to Health):
              </p>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                <li>To enable clinical consultation, diagnosis, and medical advice by licensed healthcare professionals.</li>
                <li>To generate legal, tamper-evident e-prescriptions conforming to the Medicines and Related Substances Act 101 of 1965.</li>
                <li>To furnish patients with itemized receipts with doctor practice numbers and ICD-10 codes for medical scheme reimbursement.</li>
                <li>To process secure escrow payments through our PCI-DSS Level 1 payment gateway (Paystack).</li>
                <li>To prevent fraud, identity theft, and prescription tampering.</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                4. Video Consultation Confidentiality & Audio Streams
              </h2>
              <p>
                All video and audio consultations between you and the doctor are encrypted using WebRTC technology (powered by Daily.co). <strong>Video and audio streams are never recorded or stored on our servers.</strong> The consultation is strictly real-time and confidential between patient and attending physician.
              </p>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                5. Data Subject Rights under Sections 23 to 25 of POPIA
              </h2>
              <p style={{ marginBottom: '12px' }}>
                As a patient and data subject, you hold the following statutory rights under South African law:
              </p>
              <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <li><strong>Right of Access:</strong> You may request confirmation of whether we hold personal or health information about you and receive a copy thereof (subject to statutory identification verification).</li>
                <li><strong>Right of Rectification:</strong> You may request correction or updating of inaccurate, irrelevant, or outdated personal information.</li>
                <li><strong>Right of Erasure / Destruction:</strong> You may request deletion of non-clinical account data. Note that clinical consultation notes and issued prescription records are subject to statutory HPCSA retention rules (minimum 6 years for adult medical records).</li>
              </ul>
            </section>

            <section>
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                6. Information Regulator Complaints
              </h2>
              <p>
                If you believe your personal information has been handled in contravention of POPIA, you have the right to lodge a formal complaint with the South African Information Regulator:
              </p>
              <div style={{ background: 'var(--color-slate-50)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--color-slate-200)', fontSize: '0.9rem', marginTop: '12px' }}>
                <p><strong>The Information Regulator (South Africa)</strong></p>
                <p>JD House, 27 Stiemens Street, Braamfontein, Johannesburg, 2001</p>
                <p>Complaints: complaints.IR@justice.gov.za | General: inforeg@justice.gov.za</p>
              </div>
            </section>
          </article>
        </div>
      </section>
    </div>
  );
}
