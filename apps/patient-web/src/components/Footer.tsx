import React from 'react';
import Link from 'next/link';
import { Video, ShieldCheck, Heart } from 'lucide-react';

export function Footer() {
  return (
    <footer
      style={{
        background: 'var(--color-slate-900)',
        color: 'var(--color-slate-300)',
        paddingTop: '64px',
        paddingBottom: '32px',
        borderTop: '1px solid var(--color-slate-800)',
      }}
    >
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '40px',
            marginBottom: '48px',
          }}
        >
          {/* Col 1: Brand & Compliance */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 800,
                fontSize: '1.25rem',
                color: '#ffffff',
                marginBottom: '16px',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'var(--color-brand-500)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                }}
              >
                <Video size={18} />
              </div>
              <span>ChekUp247</span>
            </div>
            <p
              style={{
                fontSize: '0.875rem',
                lineHeight: 1.6,
                color: 'var(--color-slate-400)',
                marginBottom: '16px',
              }}
            >
              South Africa&apos;s premier telehealth marketplace connecting patients with HPCSA-registered doctors for accessible, high-quality virtual consultations.
            </p>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(14, 147, 132, 0.15)',
                border: '1px solid rgba(14, 147, 132, 0.3)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                color: 'var(--color-brand-300)',
              }}
            >
              <ShieldCheck size={14} />
              <span>POPIA & HPCSA Compliant</span>
            </div>
          </div>

          {/* Col 2: For Patients */}
          <div>
            <h4
              style={{
                color: '#ffffff',
                fontSize: '0.95rem',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              For Patients
            </h4>
            <ul
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.875rem',
              }}
            >
              <li>
                <Link href="/how-it-works" style={{ color: 'var(--color-slate-400)' }}>
                  How Virtual Consultations Work
                </Link>
              </li>
              <li>
                <Link href="/pricing" style={{ color: 'var(--color-slate-400)' }}>
                  Consultation Pricing & Rates
                </Link>
              </li>
              <li>
                <Link href="/faq" style={{ color: 'var(--color-slate-400)' }}>
                  Frequently Asked Questions
                </Link>
              </li>
              <li>
                <Link href="/contact" style={{ color: 'var(--color-slate-400)' }}>
                  Patient Support
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: For Practitioners */}
          <div>
            <h4
              style={{
                color: '#ffffff',
                fontSize: '0.95rem',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              For Doctors
            </h4>
            <ul
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.875rem',
              }}
            >
              <li>
                <Link href="/for-doctors" style={{ color: 'var(--color-slate-400)' }}>
                  Join as a Doctor (Recruitment)
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:3001"
                  style={{ color: 'var(--color-slate-400)' }}
                >
                  Doctor Portal Login
                </a>
              </li>
              <li>
                <Link href="/for-doctors#verification-criteria" style={{ color: 'var(--color-slate-400)' }}>
                  HPCSA Verification Standards
                </Link>
              </li>
              <li>
                <a
                  href="http://localhost:3001"
                  style={{ color: 'var(--color-slate-400)' }}
                >
                  LocumStaff SSO Access
                </a>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Regulatory */}
          <div>
            <h4
              style={{
                color: '#ffffff',
                fontSize: '0.95rem',
                marginBottom: '16px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Legal & Privacy
            </h4>
            <ul
              style={{
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                fontSize: '0.875rem',
              }}
            >
              <li>
                <Link href="/terms" style={{ color: 'var(--color-slate-400)' }}>
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" style={{ color: 'var(--color-slate-400)' }}>
                  POPIA Privacy Notice
                </Link>
              </li>
              <li>
                <Link href="/about" style={{ color: 'var(--color-slate-400)' }}>
                  Telehealth Consent Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            paddingTop: '24px',
            borderTop: '1px solid var(--color-slate-800)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            fontSize: '0.8125rem',
            color: 'var(--color-slate-500)',
          }}
        >
          <p>© {new Date().getFullYear()} ChekUp247 (Pty) Ltd. All rights reserved. Registered in South Africa.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>Built with care for South African Healthcare</span>
            <Heart size={14} color="var(--color-brand-400)" />
          </div>
        </div>
      </div>
    </footer>
  );
}
