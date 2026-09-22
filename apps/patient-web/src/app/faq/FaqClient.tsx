'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import {
  Search,
  Plus,
  Minus,
  HelpCircle,
  ShieldCheck,
  CreditCard,
  FileText,
  Calendar,
  Lock,
  ArrowRight,
} from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
  category: string;
}

export const ALL_FAQS: FaqItem[] = [
  // Booking
  {
    category: 'Booking',
    q: 'How do I book an online doctor consultation?',
    a: 'Simply browse our verified doctor directory at /doctors, filter by specialty or language, choose an available 30-minute time slot that fits your schedule, and complete the secure payment through Paystack or your platform credits.',
  },
  {
    category: 'Booking',
    q: 'Can I choose between a General Practitioner (GP) and a Specialist?',
    a: 'Yes. You can book an appointment with any verified HPCSA GP or Medical Specialist (such as Paediatricians, Dermatologists, Psychiatrists). Every practitioner displays their qualifications, bio, and hourly rate.',
  },
  {
    category: 'Booking',
    q: 'Can I book an appointment for my child or dependent?',
    a: 'Yes. You can book a consultation on behalf of a minor dependent. You will be asked to enter the dependent’s name and date of birth during the clinical intake step so the doctor has accurate demographic details for the e-prescription.',
  },

  // Payments & Medical Aid
  {
    category: 'Payments & Medical Aid',
    q: 'Can I claim my consultation back from my medical aid?',
    a: 'Yes. All doctors on ChekUp247 have registered practice numbers with the Board of Healthcare Funders (BHF). Once your consultation is finished, you can download an itemized receipt containing your doctor’s practice number and the ICD-10 diagnostic code to submit directly to Discovery, Bonitas, Momentum, Medscheme, or any other South African scheme.',
  },
  {
    category: 'Payments & Medical Aid',
    q: 'What payment methods do you accept?',
    a: 'We accept Visa and Mastercard credit/debit cards via Paystack, Instant EFT (including Capitec Pay and Ozow), and ChekUp247 platform credits stored in your digital wallet.',
  },
  {
    category: 'Payments & Medical Aid',
    q: 'How does payment escrow protect me?',
    a: 'When you book an appointment, your payment is safely held in escrow. Funds are only disbursed to the doctor after the consultation has successfully concluded. If the doctor fails to attend, a 100% full refund is automatically reversed to your original card.',
  },

  // Prescriptions & Sick Notes
  {
    category: 'Prescriptions & Sick Notes',
    q: 'Will pharmacies accept my ChekUp247 electronic prescription?',
    a: 'Yes. Prescriptions generated on ChekUp247 comply with South African Pharmacy Council (SAPC) standards and the Medicines and Related Substances Act. They include the doctor’s digital signature, HPCSA registration number, and official ICD-10 diagnostic code. You can present the PDF on your phone or forward it directly to Dis-Chem, Clicks, or community pharmacies.',
  },
  {
    category: 'Prescriptions & Sick Notes',
    q: 'Can online doctors issue medical sick certificates?',
    a: 'Yes. If clinically indicated following your consultation, the attending doctor can issue an official medical sick note complying with Ethical Rules of the HPCSA. The certificate is stored securely in your dashboard for download.',
  },
  {
    category: 'Prescriptions & Sick Notes',
    q: 'Can doctors prescribe Schedule 5 or 6 medications online?',
    a: 'Prescribing of Schedule 5 and 6 controlled substances via telemedicine is subject to strict clinical governance under SAHPRA and HPCSA guidelines. Prescriptions are issued solely at the independent professional discretion of the physician where clinically justified.',
  },

  // Privacy & Security
  {
    category: 'Privacy & Security',
    q: 'Is ChekUp247 POPIA compliant?',
    a: 'Yes. ChekUp247 strictly adheres to the Protection of Personal Information Act 4 of 2013 (POPIA). All patient health records and clinical notes are end-to-end encrypted, and servers reside within certified South African data centers ensuring national data residency.',
  },
  {
    category: 'Privacy & Security',
    q: 'Are the video consultations recorded?',
    a: 'No. Video and audio streams are encrypted peer-to-peer WebRTC connections powered by Daily.co. We never record, store, or monitor your private medical consultation video.',
  },

  // Cancellations & Rescheduling
  {
    category: 'Cancellations & Refunds',
    q: 'What is the appointment cancellation policy?',
    a: 'You receive a 100% full refund if you cancel more than 24 hours prior to your scheduled consultation. Cancellations between 2 and 24 hours receive an 80% refund in platform credits. Cancellations under 2 hours receive a 50% refund to compensate the doctor for their reserved clinical slot.',
  },
  {
    category: 'Cancellations & Refunds',
    q: 'Can I reschedule my consultation to another time slot?',
    a: 'Yes. You can reschedule your booking free of charge up to 2 hours before the appointment by choosing another open slot on your doctor’s calendar directly from your dashboard.',
  },
  {
    category: 'Cancellations & Refunds',
    q: 'What if the doctor does not show up?',
    a: 'Doctors have a 10-minute grace period to enter the room. If a doctor fails to join, the appointment is marked as a doctor no-show and our automated system immediately initiates a 100% full refund to your original payment method.',
  },
];

const CATEGORIES = [
  'All',
  'Booking',
  'Payments & Medical Aid',
  'Prescriptions & Sick Notes',
  'Privacy & Security',
  'Cancellations & Refunds',
];

export default function FaqClient() {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const filteredFaqs = useMemo(() => {
    return ALL_FAQS.filter((faq) => {
      const matchesCategory =
        selectedCategory === 'All' || faq.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        faq.a.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  return (
    <div style={{ background: 'var(--bg-primary)', paddingBottom: '80px' }}>
      {/* Header Banner */}
      <section
        style={{
          background: 'linear-gradient(135deg, #f0fdf4 0%, #e6f7f5 50%, #ffffff 100%)',
          padding: '48px 0 40px 0',
          borderBottom: '1px solid var(--color-slate-200)',
          textAlign: 'center',
        }}
      >
        <div className="container">
          <Breadcrumbs items={[{ label: 'FAQ' }]} />

          <div style={{ maxWidth: '800px', margin: '16px auto 0 auto' }}>
            <span
              style={{
                color: 'var(--color-brand-600)',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Help & Knowledge Base
            </span>
            <h1
              style={{
                fontSize: 'clamp(2.2rem, 4.5vw, 3.25rem)',
                color: 'var(--color-slate-900)',
                marginTop: '8px',
                marginBottom: '16px',
                fontWeight: 800,
              }}
            >
              Frequently Asked Questions
            </h1>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--color-slate-600)',
                lineHeight: 1.6,
                maxWidth: '650px',
                margin: '0 auto 32px auto',
              }}
            >
              Instant answers to questions about virtual doctor appointments, medical aid claims, e-prescriptions, and privacy.
            </p>

            {/* Instant Search Bar (PA-1006) */}
            <div
              className="glass-panel"
              style={{
                maxWidth: '620px',
                margin: '0 auto',
                padding: '10px 18px',
                borderRadius: 'var(--radius-xl)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                background: '#ffffff',
                boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
              }}
            >
              <Search size={22} color="var(--color-brand-600)" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g. Discovery, refund, e-prescription, sick note)..."
                aria-label="Filter frequently asked questions"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '1rem',
                  background: 'transparent',
                  color: 'var(--color-slate-900)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--color-slate-400)',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                  }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Category Filter Chips */}
      <section style={{ padding: '36px 0 20px 0' }}>
        <div className="container" style={{ maxWidth: '850px' }}>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              justifyContent: 'center',
            }}
          >
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className="touch-target"
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px solid',
                  borderColor:
                    selectedCategory === category
                      ? 'var(--color-brand-500)'
                      : 'var(--color-slate-200)',
                  background:
                    selectedCategory === category ? 'var(--color-brand-50)' : '#ffffff',
                  color:
                    selectedCategory === category
                      ? 'var(--color-brand-700)'
                      : 'var(--color-slate-700)',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Categorized Accordion List */}
      <section style={{ padding: '24px 0 64px 0' }}>
        <div className="container" style={{ maxWidth: '850px' }}>
          {filteredFaqs.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '64px 20px',
                background: '#ffffff',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
              }}
            >
              <HelpCircle size={48} color="var(--color-slate-400)" style={{ margin: '0 auto 16px auto' }} />
              <h3 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                No matching answers found
              </h3>
              <p style={{ color: 'var(--color-slate-600)', marginBottom: '24px' }}>
                We couldn&apos;t find any questions matching &ldquo;{searchQuery}&rdquo;. Try another term or contact our support team.
              </p>
              <Link href="/contact" className="btn-primary touch-target">
                Contact Support
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {filteredFaqs.map((faq, idx) => {
                const key = `${faq.category}-${idx}`;
                const isOpen = !!openItems[key];
                return (
                  <div
                    key={key}
                    style={{
                      background: '#ffffff',
                      border: '1px solid',
                      borderColor: isOpen ? 'var(--color-brand-300)' : 'var(--color-slate-200)',
                      borderRadius: 'var(--radius-lg)',
                      overflow: 'hidden',
                      boxShadow: isOpen ? 'var(--shadow-sm)' : 'none',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <button
                      onClick={() => toggleItem(key)}
                      aria-expanded={isOpen}
                      style={{
                        width: '100%',
                        padding: '20px 24px',
                        background: isOpen ? 'var(--color-brand-50)' : '#ffffff',
                        border: 'none',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        cursor: 'pointer',
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        color: isOpen ? 'var(--color-brand-900)' : 'var(--color-slate-900)',
                        gap: '16px',
                      }}
                    >
                      <span>{faq.q}</span>
                      <div
                        style={{
                          color: isOpen ? 'var(--color-brand-600)' : 'var(--color-slate-400)',
                          flexShrink: 0,
                        }}
                      >
                        {isOpen ? <Minus size={20} /> : <Plus size={20} />}
                      </div>
                    </button>
                    {isOpen && (
                      <div
                        style={{
                          padding: '16px 24px 24px 24px',
                          color: 'var(--color-slate-600)',
                          lineHeight: 1.65,
                          fontSize: '0.95rem',
                          borderTop: '1px solid var(--color-slate-100)',
                        }}
                      >
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Still Have Questions Box */}
          <div
            style={{
              marginTop: '48px',
              padding: '32px',
              background: 'var(--color-slate-50)',
              border: '1px solid var(--color-slate-200)',
              borderRadius: 'var(--radius-xl)',
              textAlign: 'center',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
              Still have questions or need assistance?
            </h3>
            <p style={{ color: 'var(--color-slate-600)', marginBottom: '20px', fontSize: '0.95rem' }}>
              Our dedicated clinical support and patient coordination team is on standby 24/7.
            </p>
            <Link href="/contact" className="btn-primary touch-target">
              <span>Send Us an Inquiry</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
