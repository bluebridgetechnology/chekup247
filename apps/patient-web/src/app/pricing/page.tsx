import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { Check, Shield, AlertCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Consultation Pricing & Rates — ChekUp247',
  description: 'Transparent doctor rates, payment policies, and cancellation guarantees.',
};

export default function PricingPage() {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <Breadcrumbs items={[{ label: 'Pricing' }]} />

      <div style={{ maxWidth: '840px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--color-slate-900)' }}>
          Transparent, Upfront Pricing
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '48px' }}>
          No hidden administrative charges or subscription fees. You only pay for the consultations you book.
        </p>

        {/* Pricing Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '28px',
            marginBottom: '48px',
            textAlign: 'left',
          }}
        >
          {/* General Practitioner */}
          <div
            style={{
              background: '#ffffff',
              border: '2px solid var(--color-brand-500)',
              borderRadius: 'var(--radius-xl)',
              padding: '36px',
              position: 'relative',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: '-12px',
                right: '24px',
                background: 'var(--color-brand-500)',
                color: '#fff',
                padding: '4px 12px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              MOST POPULAR
            </div>
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>General Practitioner (GP)</h3>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginBottom: '20px' }}>
              For common ailments, flu, infections, sick notes, and prescription renewals.
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>From R350</span>
              <span style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>/ 30-min slot</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <Check size={18} color="var(--color-brand-500)" />
                <span>HPCSA-certified medical doctor</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <Check size={18} color="var(--color-brand-500)" />
                <span>Official e-prescription with ICD-10 code</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <Check size={18} color="var(--color-brand-500)" />
                <span>Free cancellation up to 24h before</span>
              </li>
            </ul>
            <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Book GP Consultation
            </button>
          </div>

          {/* Specialist Care */}
          <div
            style={{
              background: '#ffffff',
              border: '1px solid var(--color-slate-200)',
              borderRadius: 'var(--radius-xl)',
              padding: '36px',
            }}
          >
            <h3 style={{ fontSize: '1.4rem', marginBottom: '8px' }}>Medical Specialist</h3>
            <p style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem', marginBottom: '20px' }}>
              Pediatricians, dermatologists, psychiatrists, and specialized physicians.
            </p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '24px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-slate-900)' }}>From R650</span>
              <span style={{ color: 'var(--color-slate-500)', fontSize: '0.9rem' }}>/ 30-min slot</span>
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <Check size={18} color="var(--color-brand-500)" />
                <span>Specialist register verified</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <Check size={18} color="var(--color-brand-500)" />
                <span>Comprehensive clinical assessment</span>
              </li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem' }}>
                <Check size={18} color="var(--color-brand-500)" />
                <span>Direct medical aid claimable receipts</span>
              </li>
            </ul>
            <button className="btn-secondary" style={{ width: '100%', justifyContent: 'center' }}>
              Browse Specialists
            </button>
          </div>
        </div>

        {/* Cancellation Guarantee Notice */}
        <div
          style={{
            background: 'var(--color-slate-50)',
            border: '1px solid var(--color-slate-200)',
            borderRadius: 'var(--radius-lg)',
            padding: '24px',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--color-brand-700)', fontWeight: 600 }}>
            <Shield size={18} />
            <span>ChekUp247 Refund & Cancellation Policy</span>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-slate-600)', lineHeight: 1.6 }}>
            Cancel more than 24 hours prior to your scheduled consultation for a 100% full refund back to your original payment method. Cancellations within 24 hours receive platform credits or a partial refund in accordance with the doctor&apos;s late cancellation policy.
          </p>
        </div>
      </div>
    </div>
  );
}
