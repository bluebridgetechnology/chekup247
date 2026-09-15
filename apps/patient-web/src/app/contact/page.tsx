import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Contact ChekUp247 Support',
  description: 'Reach out to the ChekUp247 clinical and technical support team.',
};

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: '48px 24px 80px 24px' }}>
      <Breadcrumbs items={[{ label: 'Contact' }]} />

      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--color-slate-900)' }}>
          Contact ChekUp247 Support
        </h1>
        <p style={{ fontSize: '1.15rem', color: 'var(--color-slate-600)', lineHeight: 1.6, marginBottom: '40px' }}>
          Have a question about a past consultation, technical difficulty, or doctor verification? Our support team is here to assist.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <Mail size={24} color="var(--color-brand-600)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>Email Support</h4>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem' }}>support@chekup247.co.za</p>
          </div>

          <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <Phone size={24} color="var(--color-brand-600)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>Urgent Helpline</h4>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem' }}>+27 (0) 11 000 0247</p>
          </div>

          <div style={{ background: 'var(--color-slate-50)', padding: '24px', borderRadius: 'var(--radius-lg)' }}>
            <Clock size={24} color="var(--color-brand-600)" style={{ marginBottom: '12px' }} />
            <h4 style={{ fontSize: '1.05rem', marginBottom: '6px' }}>Operating Hours</h4>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem' }}>24 Hours / 7 Days a Week</p>
          </div>
        </div>

        {/* Contact Form */}
        <div style={{ background: '#ffffff', border: '1px solid var(--color-slate-200)', borderRadius: 'var(--radius-xl)', padding: '32px' }}>
          <h3 style={{ fontSize: '1.35rem', marginBottom: '20px' }}>Send Us a Message</h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                Full Name
              </label>
              <input
                type="text"
                placeholder="Dr. John Doe / Jane Smith"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-slate-300)',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@example.co.za"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-slate-300)',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '6px' }}>
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Describe your query or feedback..."
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-slate-300)',
                  outline: 'none',
                }}
              />
            </div>
            <button type="button" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              Submit Inquiry
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
