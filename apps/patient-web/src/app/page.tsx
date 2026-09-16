'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Star,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Users,
  Award,
  Zap,
  PhoneCall,
  Check,
  X,
  Plus,
  Minus,
} from 'lucide-react';

const FEATURED_DOCTORS = [
  {
    id: 'doc-1',
    name: 'Dr. Thabo Molefe',
    title: 'MBChB (Wits), FCFP(SA)',
    specialty: 'General Practitioner & Family Health',
    rating: 4.95,
    reviewsCount: 58,
    rate: 'R450',
    experience: '12+ yrs exp',
    location: 'Sandton, Johannesburg',
    nextAvailable: 'Today, in 25 mins',
    tags: ['Flu & Infections', 'Chronic Script Renewal', 'Wellness'],
  },
  {
    id: 'doc-2',
    name: 'Dr. Sarah Van Der Merwe',
    title: 'MBChB (UCT), MMed (Paed)',
    specialty: 'Specialist Paediatrician',
    rating: 4.98,
    reviewsCount: 84,
    rate: 'R650',
    experience: '15+ yrs exp',
    location: 'Claremont, Cape Town',
    nextAvailable: 'Today at 14:30',
    tags: ['Infant Nutrition', 'Child Health', 'Asthma'],
  },
  {
    id: 'doc-3',
    name: 'Dr. Kevin Pillay',
    title: 'MBChB (UKZN), Dip Obst',
    specialty: 'Family Physician & Sports Medicine',
    rating: 4.92,
    reviewsCount: 42,
    rate: 'R420',
    experience: '9+ yrs exp',
    location: 'Umhlanga, Durban',
    nextAvailable: 'Tomorrow at 09:00',
    tags: ['Joint Injuries', 'Hypertension', 'Men’s Health'],
  },
];

const TESTIMONIALS = [
  {
    quote:
      'Living in rural Eastern Cape, seeing a specialist normally meant a 3-hour drive. On ChekUp247, I had an HD video consultation with a paediatrician within an hour. The e-prescription arrived immediately on my phone.',
    author: 'Noluthando M.',
    city: 'Mthatha, Eastern Cape',
    doctor: 'Consulted Dr. Van Der Merwe',
    rating: 5,
  },
  {
    quote:
      'I woke up with severe bronchitis before an important business presentation in Sandton. Booked a GP in 2 minutes, got a sick note with ICD-10 codes, and my medical aid reimbursed it within 48 hours.',
    author: 'Craig B.',
    city: 'Johannesburg, Gauteng',
    doctor: 'Consulted Dr. Molefe',
    rating: 5,
  },
  {
    quote:
      'The payment holding in escrow gave me complete confidence. The video was crisp, the doctor was patient, and the pharmacy filled my script without hesitation. Five stars!',
    author: 'Zahra K.',
    city: 'Cape Town, Western Cape',
    doctor: 'Consulted Dr. Pillay',
    rating: 5,
  },
];

const HOMEPAGE_FAQS = [
  {
    q: 'Can I submit my consultation invoice to my Medical Aid?',
    a: 'Yes! All doctors on ChekUp247 are HPCSA-registered with active practice numbers. Every consultation receipt includes standard ICD-10 diagnostic codes and tariff codes compatible with Discovery Health, Bonitas, Momentum, Medscheme, and all major medical schemes.',
  },
  {
    q: 'How do electronic prescriptions work at South African pharmacies?',
    a: 'Your doctor signs an official digital prescription that complies with SAPC (South African Pharmacy Council) guidelines. You can download the tamper-evident PDF or forward it directly to Dis-Chem, Clicks, or your local community pharmacy.',
  },
  {
    q: 'What happens if my connection drops during the video call?',
    a: 'You can immediately rejoin the secure room with one click. If technical problems persist, our platform allows the doctor to grant time extensions or reschedule at no extra charge.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const [searchSpecialty, setSearchSpecialty] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchSpecialty.trim()) params.set('searchQuery', searchSpecialty.trim());
    if (searchDate.trim()) params.set('date', searchDate.trim());
    router.push(`/doctors?${params.toString()}`);
  };

  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* 1. HERO SECTION */}
      <section
        style={{
          position: 'relative',
          padding: '70px 0 90px 0',
          background:
            'radial-gradient(120% 120% at 50% 0%, #e6f7f5 0%, #f8fafc 60%, #ffffff 100%)',
          overflow: 'hidden',
          borderBottom: '1px solid var(--color-slate-200)',
        }}
      >
        <div className="container" style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Trust Badge */}
          <div
            className="badge badge-brand"
            style={{
              marginBottom: '24px',
              padding: '8px 18px',
              fontSize: '0.85rem',
              boxShadow: '0 2px 8px rgba(14, 147, 132, 0.15)',
            }}
          >
            <ShieldCheck size={18} />
            <span>100% HPCSA-Verified South African Doctors</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2.4rem, 5.5vw, 3.85rem)',
              lineHeight: 1.15,
              color: 'var(--color-slate-900)',
              marginBottom: '20px',
              maxWidth: '880px',
              margin: '0 auto 20px auto',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            Quality Medical Care,{' '}
            <span
              style={{
                background:
                  'linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-400) 100%)',
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
            Skip crowded clinic waiting rooms. Book instant virtual consultations with South Africa’s
            top general practitioners and specialists. Valid e-prescriptions and sick notes in minutes.
          </p>

          {/* Interactive Search Bar (PA-1001) */}
          <form
            onSubmit={handleSearch}
            className="glass-panel"
            style={{
              maxWidth: '820px',
              margin: '0 auto 36px auto',
              padding: '12px 16px',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
              alignItems: 'center',
              boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                flex: '1 1 280px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
              }}
            >
              <Search size={22} color="var(--color-brand-600)" />
              <input
                type="text"
                value={searchSpecialty}
                onChange={(e) => setSearchSpecialty(e.target.value)}
                placeholder="Doctor name, specialty (e.g. GP, Paediatrician, Derm)"
                aria-label="Search by specialty or doctor name"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  background: 'transparent',
                  color: 'var(--color-slate-900)',
                }}
              />
            </div>

            <div
              style={{
                width: '1px',
                height: '36px',
                background: 'var(--color-slate-200)',
                display: 'none',
              }}
              className="search-divider"
            />

            <div
              style={{
                flex: '1 1 180px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 12px',
              }}
            >
              <Calendar size={20} color="var(--color-brand-600)" />
              <select
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                aria-label="Filter by appointment day"
                style={{
                  width: '100%',
                  border: 'none',
                  outline: 'none',
                  fontSize: '0.95rem',
                  background: 'transparent',
                  color: 'var(--color-slate-700)',
                  cursor: 'pointer',
                }}
              >
                <option value="">Today or Any Day</option>
                <option value="today">Available Today</option>
                <option value="tomorrow">Available Tomorrow</option>
                <option value="weekend">This Weekend</option>
              </select>
            </div>

            <button
              type="submit"
              className="btn-primary touch-target"
              style={{
                padding: '14px 32px',
                fontSize: '1rem',
                borderRadius: 'var(--radius-lg)',
                fontWeight: 700,
              }}
            >
              Find a Doctor
            </button>
          </form>

          {/* Trust Bar Metrics */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '28px',
              flexWrap: 'wrap',
              color: 'var(--color-slate-600)',
              fontSize: '0.875rem',
              fontWeight: 500,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} color="var(--color-brand-500)" />
              <span>HPCSA & SAPC Certified</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Lock size={18} color="var(--color-brand-500)" />
              <span>POPIA Data Privacy & Encryption</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CreditCard size={18} color="var(--color-brand-500)" />
              <span>Paystack Escrow Protection</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="var(--color-brand-500)" />
              <span>Available 24 Hours / 7 Days</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 4-STEP "HOW IT WORKS" VISUAL (PA-1001 / PA-1002) */}
      <section style={{ padding: '88px 0', background: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span
              style={{
                color: 'var(--color-brand-600)',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Simple, Frictionless Healthcare
            </span>
            <h2
              style={{
                fontSize: '2.25rem',
                color: 'var(--color-slate-900)',
                marginTop: '8px',
                marginBottom: '12px',
              }}
            >
              How ChekUp247 Works in 4 Steps
            </h2>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '1.05rem', maxWidth: '600px', margin: '0 auto' }}>
              From initial doctor search to filling your script at the local pharmacy in under an hour.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
            }}
          >
            {/* Step 1 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                position: 'relative',
                transition: 'transform 0.2s',
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
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}
              >
                1
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                Find Your Doctor
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.925rem' }}>
                Filter verified HPCSA practitioners by specialty, language, rating, and transparent hourly consultation rates.
              </p>
            </div>

            {/* Step 2 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                position: 'relative',
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
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}
              >
                2
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                Book & Pay Securely
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.925rem' }}>
                Select a convenient 30-minute slot. Funds are protected in escrow via Paystack and only released after your session.
              </p>
            </div>

            {/* Step 3 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                position: 'relative',
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
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}
              >
                3
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                Attend HD Video Call
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.925rem' }}>
                Join your private, encrypted video room directly in your mobile or desktop browser without downloading any apps.
              </p>
            </div>

            {/* Step 4 */}
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '32px 24px',
                position: 'relative',
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
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}
              >
                4
              </div>
              <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: 'var(--color-slate-900)' }}>
                E-Prescription & Claims
              </h3>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.6, fontSize: '0.925rem' }}>
                Download your official e-prescription with ICD-10 codes for your pharmacy, plus an itemized invoice for medical aid refund.
              </p>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: '40px' }}>
            <Link href="/how-it-works" className="btn-secondary touch-target">
              <span>View Full Interactive Walkthrough</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. FEATURED DOCTORS SHOWCASE (PA-1001) */}
      <section style={{ padding: '88px 0', background: 'var(--color-slate-50)' }}>
        <div className="container">
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '20px',
              marginBottom: '48px',
            }}
          >
            <div>
              <span
                style={{
                  color: 'var(--color-brand-600)',
                  fontWeight: 700,
                  fontSize: '0.875rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                }}
              >
                Top Verified Practitioners
              </span>
              <h2 style={{ fontSize: '2.25rem', color: 'var(--color-slate-900)', marginTop: '8px' }}>
                Consult with Trusted South African Doctors
              </h2>
            </div>
            <Link href="/doctors" className="btn-secondary touch-target" style={{ fontWeight: 600 }}>
              <span>View All Doctors ({'>'}120 available)</span>
              <ChevronRight size={18} />
            </Link>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '28px',
            }}
          >
            {FEATURED_DOCTORS.map((doc) => (
              <div
                key={doc.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '28px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', marginBottom: '4px' }}>
                        {doc.name}
                      </h3>
                      <p style={{ color: 'var(--color-brand-600)', fontSize: '0.875rem', fontWeight: 600 }}>
                        {doc.specialty}
                      </p>
                      <p style={{ color: 'var(--color-slate-400)', fontSize: '0.75rem' }}>{doc.title}</p>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: '#fef3c7',
                        color: '#92400e',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                      }}
                    >
                      <Star size={14} fill="#f59e0b" color="#f59e0b" />
                      <span>{doc.rating}</span>
                      <span style={{ color: '#b45309', fontWeight: 400 }}>({doc.reviewsCount})</span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '20px',
                    }}
                  >
                    {doc.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: 'var(--color-slate-100)',
                          color: 'var(--color-slate-600)',
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <div
                    style={{
                      borderTop: '1px solid var(--color-slate-100)',
                      paddingTop: '16px',
                      marginBottom: '20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      color: 'var(--color-slate-500)',
                    }}
                  >
                    <div>
                      <span>Rate: </span>
                      <strong style={{ color: 'var(--color-slate-900)', fontSize: '1rem' }}>{doc.rate}</strong>
                      <span> / slot</span>
                    </div>
                    <div style={{ color: 'var(--color-brand-700)', fontWeight: 600 }}>
                      {doc.nextAvailable}
                    </div>
                  </div>
                </div>

                <Link
                  href={`/doctors`}
                  className="btn-primary touch-target"
                  style={{ width: '100%', justifyContent: 'center' }}
                >
                  Book Consultation
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. COMPARISON: TRADITIONAL CLINIC VS CHEKUP247 */}
      <section style={{ padding: '80px 0', background: '#ffffff' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2.25rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
              Why Patients Across South Africa Choose ChekUp247
            </h2>
            <p style={{ color: 'var(--color-slate-600)', fontSize: '1.05rem' }}>
              Compare standard in-person clinic visits with our streamlined virtual care.
            </p>
          </div>

          <div
            style={{
              maxWidth: '850px',
              margin: '0 auto',
              background: '#ffffff',
              border: '1px solid var(--color-slate-200)',
              borderRadius: 'var(--radius-xl)',
              overflow: 'hidden',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.5fr',
                padding: '20px 24px',
                background: 'var(--color-slate-900)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.95rem',
              }}
            >
              <div>Healthcare Feature</div>
              <div>Traditional Clinic</div>
              <div style={{ color: 'var(--color-brand-400)' }}>ChekUp247 Telehealth</div>
            </div>

            {[
              {
                feature: 'Average Waiting Time',
                clinic: '60 – 180 minutes in waiting room',
                chekup: 'Under 10 minutes from home',
              },
              {
                feature: 'Travel & Parking Expenses',
                clinic: 'R50 – R200 transport cost',
                chekup: 'R0 (100% virtual video)',
              },
              {
                feature: 'Prescription Delivery',
                clinic: 'Handwritten paper slip',
                chekup: 'Tamper-evident ICD-10 e-script',
              },
              {
                feature: 'Doctor Choice & Transparency',
                clinic: 'Assigned to duty doctor',
                chekup: 'Select doctor by rating & rate',
              },
              {
                feature: 'Medical Aid Claimable',
                clinic: 'Yes (receipt provided)',
                chekup: 'Yes (itemized invoice with ICD-10)',
              },
              {
                feature: 'Cancellation Guarantee',
                clinic: 'Often non-refundable deposit',
                chekup: '100% refund if doctor no-shows',
              },
            ].map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 1.5fr',
                  padding: '16px 24px',
                  borderBottom: '1px solid var(--color-slate-100)',
                  alignItems: 'center',
                  fontSize: '0.9rem',
                  background: i % 2 === 0 ? '#ffffff' : 'var(--color-slate-50)',
                }}
              >
                <div style={{ fontWeight: 600, color: 'var(--color-slate-900)' }}>{row.feature}</div>
                <div style={{ color: 'var(--color-slate-500)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <X size={16} color="var(--color-danger)" />
                  <span>{row.clinic}</span>
                </div>
                <div style={{ color: 'var(--color-brand-700)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Check size={16} color="var(--color-brand-500)" />
                  <span>{row.chekup}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. PATIENT TESTIMONIALS (PA-1001) */}
      <section style={{ padding: '88px 0', background: 'var(--color-slate-50)' }}>
        <div className="container">
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span
              style={{
                color: 'var(--color-brand-600)',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Verified Patient Reviews
            </span>
            <h2 style={{ fontSize: '2.25rem', color: 'var(--color-slate-900)', marginTop: '8px' }}>
              Trusted by Thousands Nationwide
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '28px',
            }}
          >
            {TESTIMONIALS.map((testi, i) => (
              <div
                key={i}
                style={{
                  background: '#ffffff',
                  border: '1px solid var(--color-slate-200)',
                  borderRadius: 'var(--radius-xl)',
                  padding: '32px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  boxShadow: 'var(--shadow-sm)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                    {[...Array(testi.rating)].map((_, idx) => (
                      <Star key={idx} size={16} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <p style={{ color: 'var(--color-slate-700)', lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '24px' }}>
                    &ldquo;{testi.quote}&rdquo;
                  </p>
                </div>
                <div>
                  <h4 style={{ color: 'var(--color-slate-900)', fontSize: '1rem', marginBottom: '2px' }}>
                    {testi.author}
                  </h4>
                  <p style={{ color: 'var(--color-slate-500)', fontSize: '0.8rem' }}>{testi.city}</p>
                  <span style={{ color: 'var(--color-brand-600)', fontSize: '0.75rem', fontWeight: 600 }}>
                    {testi.doctor}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FAQ PREVIEW ACCORDION (PA-1001) */}
      <section style={{ padding: '80px 0', background: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '800px' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <h2 style={{ fontSize: '2rem', color: 'var(--color-slate-900)', marginBottom: '10px' }}>
              Frequently Asked Questions
            </h2>
            <p style={{ color: 'var(--color-slate-600)' }}>
              Everything you need to know about online appointments and medical aid claims.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {HOMEPAGE_FAQS.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  style={{
                    border: '1px solid var(--color-slate-200)',
                    borderRadius: 'var(--radius-lg)',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
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
                      color: isOpen ? 'var(--color-brand-800)' : 'var(--color-slate-900)',
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <Minus size={18} /> : <Plus size={18} />}
                  </button>
                  {isOpen && (
                    <div
                      style={{
                        padding: '16px 24px 24px 24px',
                        background: '#ffffff',
                        color: 'var(--color-slate-600)',
                        fontSize: '0.95rem',
                        lineHeight: 1.6,
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <Link href="/faq" style={{ color: 'var(--color-brand-600)', fontWeight: 600, fontSize: '0.95rem' }}>
              Have more questions? Browse our complete FAQ directory &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* 7. HIGH-CONVERTING CALL TO ACTION (PA-1001) */}
      <section
        style={{
          padding: '88px 0',
          background: 'linear-gradient(135deg, var(--color-slate-900) 0%, #064e3b 100%)',
          color: '#ffffff',
          textAlign: 'center',
        }}
      >
        <div className="container" style={{ maxWidth: '800px' }}>
          <h2 style={{ fontSize: 'clamp(2rem, 4vw, 2.75rem)', marginBottom: '16px', fontWeight: 800 }}>
            Connect with a Doctor Today in Minutes
          </h2>
          <p
            style={{
              color: 'var(--color-slate-300)',
              fontSize: '1.15rem',
              lineHeight: 1.6,
              marginBottom: '36px',
            }}
          >
            No travelling, no crowded waiting rooms. Safe, encrypted virtual healthcare for you and your family across South Africa.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              href="/doctors"
              className="btn-primary touch-target"
              style={{
                padding: '16px 36px',
                fontSize: '1.05rem',
                borderRadius: 'var(--radius-lg)',
                boxShadow: '0 8px 24px rgba(14, 147, 132, 0.4)',
              }}
            >
              Consult a Doctor Now
            </Link>
            <Link
              href="/for-doctors"
              className="btn-secondary touch-target"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.3)',
                padding: '16px 28px',
                fontSize: '1rem',
                borderRadius: 'var(--radius-lg)',
              }}
            >
              Are you a Doctor? Join Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
