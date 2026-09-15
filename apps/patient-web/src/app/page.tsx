import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Video,
  Clock,
  FileText,
  Search,
  CheckCircle2,
  Calendar,
  CreditCard,
  Lock,
} from 'lucide-react';

export default function HomePage() {
  return (
    <div>
      {/* Hero Section */}
      <section
        style={{
          position: 'relative',
          padding: '80px 0 100px 0',
          background: 'radial-gradient(100% 100% at 50% 0%, #e6f7f5 0%, #ffffff 80%)',
          overflow: 'hidden',
        }}
      >
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div
            className="badge badge-brand"
            style={{ marginBottom: '20px', display: 'inline-flex' }}
          >
            <ShieldCheck size={16} />
            <span>100% HPCSA-Verified South African Doctors</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.5rem, 5vw, 3.75rem)',
              lineHeight: 1.15,
              color: 'var(--color-slate-900)',
              marginBottom: '24px',
              maxWidth: '850px',
              margin: '0 auto 24px auto',
            }}
          >
            Quality Doctor Consultations,{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-400) 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Anytime & Anywhere
            </span>
          </h1>

          <p
            style={{
              fontSize: 'clamp(1.05rem, 2vw, 1.25rem)',
              color: 'var(--color-slate-600)',
              maxWidth: '680px',
              margin: '0 auto 36px auto',
              lineHeight: 1.6,
            }}
          >
            Skip the waiting room. Connect with certified general practitioners and specialists across South Africa in minutes for secure virtual care and e-prescriptions.
          </p>

          {/* Quick Doctor Search Box */}
          <div
            className="glass-panel"
            style={{
              maxWidth: '780px',
              margin: '0 auto 40px auto',
              padding: '12px',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                flex: '1 1 240px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0 12px',
              }}
            >
              <Search size={20} color="var(--color-brand-500)" />
              <input
                type="text"
                placeholder="Specialty (e.g. GP, Dermatologist, Pediatrician)"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  background: 'transparent',
                }}
              />
            </div>
            <div
              style={{
                width: '1px',
                height: '32px',
                background: 'var(--color-slate-200)',
              }}
            />
            <div
              style={{
                flex: '1 1 200px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '0 12px',
              }}
            >
              <Calendar size={20} color="var(--color-brand-500)" />
              <input
                type="text"
                placeholder="Today or Any Date"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  background: 'transparent',
                }}
              />
            </div>
            <button className="btn-primary" style={{ padding: '14px 28px' }}>
              Find Doctor
            </button>
          </div>

          {/* Trust Metrics */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '32px',
              flexWrap: 'wrap',
              color: 'var(--color-slate-600)',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--color-brand-500)" />
              <span>Valid ICD-10 Prescriptions</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--color-brand-500)" />
              <span>POPIA Data Privacy</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--color-brand-500)" />
              <span>Fast Daily.co HD Video</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Step Process */}
      <section style={{ padding: '80px 0', background: 'var(--bg-primary)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <h2
              style={{
                fontSize: '2rem',
                color: 'var(--color-slate-900)',
                marginBottom: '12px',
              }}
            >
              How ChekUp247 Works
            </h2>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '1.05rem' }}>
              Get the healthcare you need in three simple, frictionless steps
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '32px',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <Search size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>1. Find & Book a Doctor</h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Browse verified HPCSA doctors, view hourly rates, specialties, and real patient ratings. Select an available 30-minute time slot.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <Video size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>2. Attend HD Consultation</h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Join your private, encrypted video room directly from your phone or browser with zero app download required.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px 28px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'var(--color-brand-50)',
                  color: 'var(--color-brand-600)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '20px',
                }}
              >
                <FileText size={24} />
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '10px' }}>3. Receive E-Prescription</h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.95rem' }}>
                Download your official, signed e-prescription with ICD-10 diagnostic codes ready for your pharmacy or medical aid scheme.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ready CTA */}
      <section
        style={{
          padding: '72px 0',
          background: 'linear-gradient(135deg, var(--color-slate-900) 0%, var(--color-slate-800) 100%)',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <h2 style={{ fontSize: '2.25rem', marginBottom: '16px' }}>
            Ready to consult with a doctor today?
          </h2>
          <p
            style={{
              color: 'var(--color-slate-300)',
              maxWidth: '600px',
              margin: '0 auto 32px auto',
              fontSize: '1.1rem',
              lineHeight: 1.6,
            }}
          >
            Create your account in 60 seconds and gain instant access to certified healthcare professionals.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link href="/how-it-works" className="btn-primary" style={{ padding: '14px 28px' }}>
              Learn More
            </Link>
            <Link
              href="/pricing"
              className="btn-secondary"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                padding: '14px 28px',
              }}
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
