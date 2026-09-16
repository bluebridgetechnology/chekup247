'use client';

import React from 'react';
import Link from 'next/link';
import { Breadcrumbs } from '../../components/Breadcrumbs';
import {
  ShieldCheck,
  Award,
  Users,
  HeartHandshake,
  MapPin,
  Stethoscope,
  Building,
  CheckCircle2,
} from 'lucide-react';

const LEADERSHIP_TEAM = [
  {
    name: 'Dr. Nkosana Sithole',
    role: 'Medical Director & Chief Clinical Officer',
    credentials: 'MBChB (UCT), FCFP (SA), MMed',
    bio: 'Over 18 years in emergency medicine and family health. Formerly Head of Clinical Governance at provincial health departments, championing primary healthcare equity across South Africa.',
  },
  {
    name: 'Dr. Keshav Naidoo',
    role: 'Head of Clinical Informatics & Safety',
    credentials: 'MBChB (Wits), MSc Health Informatics',
    bio: 'Specialist in digital clinical workflows, diagnostic decision support, and WHO ICD-10 electronic prescribing governance.',
  },
  {
    name: 'Adv. Monica Van Der Merwe',
    role: 'Legal, Ethics & POPIA Compliance Officer',
    credentials: 'BA LLB, LLM (Medical Law & Ethics)',
    bio: 'Senior health law counsel advising on Health Professions Act compliance, statutory patient privacy rights, and telemedicine regulatory frameworks.',
  },
];

const PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

export default function AboutPage() {
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
          <Breadcrumbs items={[{ label: 'About Us' }]} />

          <div style={{ maxWidth: '840px', margin: '16px auto 0 auto' }}>
            <span
              style={{
                color: 'var(--color-brand-600)',
                fontWeight: 700,
                fontSize: '0.875rem',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Our Story & Medical Governance
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
              Making World-Class Healthcare Accessible Across South Africa
            </h1>
            <p
              style={{
                fontSize: '1.15rem',
                color: 'var(--color-slate-600)',
                lineHeight: 1.6,
                maxWidth: '720px',
                margin: '0 auto',
              }}
            >
              ChekUp247 was founded to bridge the urban-rural medical divide, empowering every South African with immediate virtual access to HPCSA-certified medical doctors.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section style={{ padding: '72px 0', background: '#ffffff' }}>
        <div className="container" style={{ maxWidth: '960px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '32px',
              marginBottom: '64px',
            }}
          >
            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px',
              }}
            >
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                Our Mission
              </h2>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                To remove distance, delay, and financial friction from primary healthcare. We provide patients across South Africa with prompt virtual medical consultations, transparent pricing, verified diagnostics, and official e-prescriptions from verified doctors.
              </p>
            </div>

            <div
              style={{
                background: 'var(--color-slate-50)',
                border: '1px solid var(--color-slate-200)',
                borderRadius: 'var(--radius-xl)',
                padding: '36px',
              }}
            >
              <h2 style={{ fontSize: '1.4rem', color: 'var(--color-slate-900)', marginBottom: '12px' }}>
                Our Vision
              </h2>
              <p style={{ color: 'var(--color-slate-600)', lineHeight: 1.7, fontSize: '0.95rem' }}>
                A South Africa where quality healthcare is a universal reality — where a patient in a rural township or farming community has the exact same instant access to medical expertise as someone in central Sandton or Cape Town.
              </p>
            </div>
          </div>

          {/* Medical Leadership & Advisory Team */}
          <div style={{ marginBottom: '64px' }}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <h2 style={{ fontSize: '2rem', color: 'var(--color-slate-900)', marginBottom: '8px' }}>
                Clinical Leadership & Advisory Board
              </h2>
              <p style={{ color: 'var(--color-slate-600)' }}>
                Guided by experienced South African physicians, clinical ethicists, and healthcare leaders
              </p>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '28px',
              }}
            >
              {LEADERSHIP_TEAM.map((member, i) => (
                <div
                  key={i}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--color-slate-200)',
                    borderRadius: 'var(--radius-xl)',
                    padding: '32px 24px',
                    boxShadow: 'var(--shadow-sm)',
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
                      marginBottom: '16px',
                    }}
                  >
                    <Stethoscope size={24} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--color-slate-900)', marginBottom: '4px' }}>
                    {member.name}
                  </h3>
                  <p style={{ color: 'var(--color-brand-600)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '2px' }}>
                    {member.role}
                  </p>
                  <p style={{ color: 'var(--color-slate-400)', fontSize: '0.75rem', marginBottom: '16px' }}>
                    {member.credentials}
                  </p>
                  <p style={{ color: 'var(--color-slate-600)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                    {member.bio}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Nationwide Coverage Across 9 Provinces */}
          <div
            style={{
              background: 'var(--color-brand-50)',
              border: '1px solid var(--color-brand-200)',
              borderRadius: 'var(--radius-xl)',
              padding: '40px',
              marginBottom: '64px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <MapPin size={24} color="var(--color-brand-700)" />
              <h2 style={{ fontSize: '1.5rem', color: 'var(--color-brand-900)' }}>
                Nationwide Virtual Healthcare Coverage
              </h2>
            </div>
            <p style={{ color: 'var(--color-brand-800)', lineHeight: 1.6, marginBottom: '24px', fontSize: '0.95rem' }}>
              Our network of certified physicians is licensed to practice throughout South Africa, serving urban, peri-urban, and rural communities across all 9 provinces:
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                gap: '12px',
              }}
            >
              {PROVINCES.map((prov, idx) => (
                <div
                  key={idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--color-brand-200)',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    color: 'var(--color-brand-800)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={16} color="var(--color-brand-600)" />
                  <span>{prov}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Regulatory Standards */}
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.25rem', color: 'var(--color-slate-900)', marginBottom: '16px' }}>
              Strict Medical & Legal Compliance
            </h3>
            <p style={{ color: 'var(--color-slate-600)', maxWidth: '700px', margin: '0 auto 24px auto', lineHeight: 1.6, fontSize: '0.925rem' }}>
              ChekUp247 operates strictly within the telehealth ethical guidelines of the Health Professions Council of South Africa (HPCSA Booklet 10) and the Protection of Personal Information Act 4 of 2013 (POPIA).
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <Link href="/terms" style={{ color: 'var(--color-brand-600)', fontWeight: 600, fontSize: '0.9rem' }}>
                Terms of Service &rarr;
              </Link>
              <Link href="/privacy" style={{ color: 'var(--color-brand-600)', fontWeight: 600, fontSize: '0.9rem' }}>
                POPIA Privacy Policy &rarr;
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
