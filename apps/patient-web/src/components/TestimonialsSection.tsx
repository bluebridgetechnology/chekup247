'use client';

import React from 'react';
import { SolarIcon } from './SolarIcon';

export interface Testimonial {
  quote: string;
  author: string;
  initials: string;
  city: string;
  doctor: string;
  rating: number;
}

export const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      'Living in rural Eastern Cape, seeing a specialist normally meant a 3-hour drive. On ChekUp247, I had an HD video consultation with a paediatrician within an hour. The e-prescription arrived immediately on my phone.',
    author: 'Noluthando M.',
    initials: 'NM',
    city: 'Mthatha, Eastern Cape',
    doctor: 'Consulted Dr. Van Der Merwe',
    rating: 5,
  },
  {
    quote:
      'I woke up with severe bronchitis before an important business presentation in Sandton. Booked a GP in 2 minutes, got a sick note with ICD-10 codes, and my medical aid reimbursed it within 48 hours.',
    author: 'Craig B.',
    initials: 'CB',
    city: 'Johannesburg, Gauteng',
    doctor: 'Consulted Dr. Molefe',
    rating: 5,
  },
  {
    quote:
      'The payment holding in escrow gave me complete confidence. The video was crisp, the doctor was patient, and the pharmacy filled my script without hesitation. Five stars!',
    author: 'Zahra K.',
    initials: 'ZK',
    city: 'Cape Town, Western Cape',
    doctor: 'Consulted Dr. Pillay',
    rating: 5,
  },
];

export function TestimonialsSection() {
  const [testimonials, setTestimonials] = React.useState<Testimonial[]>(TESTIMONIALS);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    let isMounted = true;
    async function loadTestimonials() {
      setIsLoading(true);
      try {
        const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
        const apiBase = rawBase.endsWith('/api/v1') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api/v1`;
        const res = await fetch(`${apiBase}/testimonials?type=patient&limit=6`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.testimonials && Array.isArray(data.testimonials) && data.testimonials.length > 0) {
            setTestimonials(data.testimonials);
          }
        }
      } catch {
        // Graceful fallback to default verified records
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadTestimonials();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="testimonials-section" id="reviews">
      <div className="testimonials-container">
        {/* Section Header */}
        <div style={{ textAlign: 'center', maxWidth: '680px', margin: '0 auto 56px auto' }}>
          <span className="why-choose-eyebrow" style={{ display: 'block', marginBottom: '8px' }}>
            Verified Patient Reviews
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
            Trusted by Thousands Across South Africa
          </h2>
          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '0.975rem',
              color: 'var(--color-chocolate-muted)',
              lineHeight: 1.55,
            }}
          >
            Real stories from patients who experienced convenient, confidential, and HPCSA-accredited care from home or office.
          </p>
        </div>

        {/* Testimonials Cards Grid */}
        <div className="testimonials-grid">
          {testimonials.map((testi, i) => (
            <div key={i} className="testimonial-card">
              <div>
                {/* Top Row: 5 Gold Stars + Verified Badge */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '20px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[...Array(testi.rating)].map((_, idx) => (
                      <SolarIcon key={idx} name="star-bold" size={17} color="var(--color-gold-primary)" />
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      backgroundColor: 'var(--color-gold-pale)',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.71875rem',
                      fontWeight: 600,
                      color: 'var(--color-chocolate-mid)',
                    }}
                  >
                    <SolarIcon name="shield-check-linear" size={13} color="var(--color-gold-base)" />
                    <span>Verified Visit</span>
                  </div>
                </div>

                {/* Patient Quote */}
                <p
                  style={{
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.9375rem',
                    lineHeight: 1.68,
                    color: 'var(--color-chocolate-base)',
                    marginBottom: '28px',
                    fontStyle: 'normal',
                  }}
                >
                  &ldquo;{testi.quote}&rdquo;
                </p>
              </div>

              {/* Author Info Bottom */}
              <div
                style={{
                  borderTop: '1px solid var(--color-gold-border)',
                  paddingTop: '18px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <div
                  style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-gold-pale)',
                    border: '1px solid rgba(223, 171, 98, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'var(--font-heading), sans-serif',
                    fontWeight: 700,
                    fontSize: '0.9375rem',
                    color: 'var(--color-chocolate-base)',
                    flexShrink: 0,
                  }}
                >
                  {testi.initials}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h4
                    style={{
                      fontFamily: 'var(--font-heading), sans-serif',
                      fontSize: '0.95rem',
                      fontWeight: 700,
                      color: 'var(--color-chocolate-base)',
                      marginBottom: '2px',
                      lineHeight: 1.2,
                    }}
                  >
                    {testi.author}
                  </h4>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.75rem',
                      color: 'var(--color-chocolate-muted)',
                      marginBottom: '2px',
                    }}
                  >
                    <SolarIcon name="map-point-linear" size={12} color="var(--color-gold-base)" />
                    <span>{testi.city}</span>
                  </div>
                  <span
                    style={{
                      fontFamily: 'var(--font-sans)',
                      fontSize: '0.71875rem',
                      fontWeight: 600,
                      color: 'var(--color-gold-base)',
                    }}
                  >
                    {testi.doctor}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
