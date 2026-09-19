'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';

export interface FaqItem {
  q: string;
  a: string;
}

export const HOMEPAGE_FAQS: FaqItem[] = [
  {
    q: 'Can I submit my consultation invoice to my Medical Aid?',
    a: 'Yes, absolutely! All doctors on ChekUp247 are HPCSA-registered with active South African practice numbers. Every consultation receipt includes official ICD-10 diagnostic codes and standard tariff codes compatible with Discovery Health, Bonitas, Momentum, Medscheme, and all leading medical schemes.',
  },
  {
    q: 'How do electronic prescriptions work at South African pharmacies?',
    a: 'Following your consultation, your doctor generates an official digital prescription that complies with SAPC (South African Pharmacy Council) guidelines. You can instantly download the tamper-evident PDF or show it directly at Dis-Chem, Clicks, or your local independent pharmacy.',
  },
  {
    q: 'What happens if my internet connection drops during the video call?',
    a: 'You can immediately rejoin the secure consultation room with one tap from your dashboard. If technical issues persist, our platform enables the practitioner to grant complementary time extensions or reschedule at zero extra charge.',
  },
  {
    q: 'Are my medical records and consultations private and secure?',
    a: 'Yes. ChekUp247 is fully compliant with South Africa’s Protection of Personal Information Act (POPIA) and National Health Act regulations. Video consultations are peer-to-peer encrypted and never recorded, and your health records are accessible only by you and your authorized practitioner.',
  },
];

export function FaqSection() {
  const [openFaq, setOpenFaq] = useState<number | null>(0); // first item open by default for clear affordance

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  return (
    <section className="faq-section" id="faq">
      <div className="faq-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 52px auto' }}>
          <span className="why-choose-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
            Frequently Asked Questions
          </span>
          <h2
            style={{
              fontFamily: 'var(--font-heading), sans-serif',
              fontSize: 'clamp(1.9rem, 3vw, 2.5rem)',
              fontWeight: 700,
              color: 'var(--color-chocolate-base)',
              letterSpacing: '-0.025em',
              lineHeight: 1.2,
              marginBottom: '10px',
            }}
          >
            Everything You Need to Know
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.975rem',
              color: 'var(--color-chocolate-muted)',
              lineHeight: 1.55,
            }}
          >
            Clear answers about medical aid claims, digital prescriptions, and how online consultations work across South Africa.
          </p>
        </div>

        {/* Accordion List */}
        <div>
          {HOMEPAGE_FAQS.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index} className={`faq-card ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  aria-expanded={isOpen}
                  className="faq-trigger"
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-heading), sans-serif',
                      fontSize: '1.0625rem',
                      fontWeight: 600,
                      color: isOpen ? 'var(--color-chocolate-base)' : 'var(--color-chocolate-mid)',
                      lineHeight: 1.35,
                    }}
                  >
                    {faq.q}
                  </span>
                  <div
                    className={`faq-chevron ${isOpen ? 'open' : ''}`}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      backgroundColor: isOpen ? 'var(--color-gold-pale)' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <SolarIcon
                      name="alt-arrow-down-linear"
                      size={18}
                      color={isOpen ? 'var(--color-gold-base)' : 'var(--color-chocolate-muted)'}
                    />
                  </div>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: '0 28px 24px 28px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.9375rem',
                      lineHeight: 1.68,
                      color: 'var(--color-chocolate-muted)',
                      borderTop: '1px solid var(--color-gold-border)',
                      marginTop: '4px',
                      paddingTop: '16px',
                    }}
                  >
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Help Center Link */}
        <div style={{ textAlign: 'center', marginTop: '36px' }}>
          <Link
            href="/faq"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--color-gold-base)',
              fontFamily: 'var(--font-sans)',
              fontWeight: 600,
              fontSize: '0.95rem',
              textDecoration: 'none',
              transition: 'gap 0.2s ease, color 0.2s ease',
            }}
          >
            <span>Have more questions? Browse our complete FAQ directory</span>
            <SolarIcon name="arrow-right-linear" size={16} color="var(--color-gold-base)" />
          </Link>
        </div>
      </div>
    </section>
  );
}
