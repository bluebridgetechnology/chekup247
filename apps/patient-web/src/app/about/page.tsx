import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { Shield, Award, Users, HeartHandshake } from 'lucide-react';

export const metadata: Metadata = {
  title: 'About ChekUp247 — Telehealth in South Africa',
  description: 'Learn about ChekUp247, our mission, HPCSA medical governance, and our team.',
};

export default function AboutPage() {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <Breadcrumbs items={[{ label: 'About Us' }]} />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '20px', color: 'var(--color-slate-900)' }}>
          Transforming Healthcare Access in South Africa
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--color-slate-600)', lineHeight: 1.7, marginBottom: '40px' }}>
          ChekUp247 was founded to bridge the geographic and economic gaps in primary healthcare delivery across South Africa. We connect patients directly with HPCSA-registered medical practitioners through secure, encrypted video consultations.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '48px' }}>
          <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <Shield size={28} color="var(--color-brand-600)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>HPCSA Verification</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate-600)', lineHeight: 1.5 }}>
              Every single doctor on ChekUp247 is verified against the Health Professions Council of South Africa register before being approved.
            </p>
          </div>

          <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <Award size={28} color="var(--color-brand-600)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>POPIA Compliant</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--color-slate-600)', lineHeight: 1.5 }}>
              All health records, clinical notes, and consultations are encrypted and maintained strictly in accordance with South African data residency rules.
            </p>
          </div>
        </div>

        <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Our Mission</h2>
        <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.7, marginBottom: '24px' }}>
          We believe high-quality medical consultations should be available on demand without travel expenses or lost work hours. Whether you need an acute diagnosis, a specialist follow-up, or a repeat chronic script, ChekUp247 makes certified doctors available 24/7.
        </p>
      </div>
    </div>
  );
}
