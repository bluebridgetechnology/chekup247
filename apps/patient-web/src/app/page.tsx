'use client';

import React from 'react';
import { HeroSection } from '../components/HeroSection';
import { WhyChooseSection } from '../components/WhyChooseSection';
import { HowItWorksSection } from '../components/HowItWorksSection';
import { SpecialtiesSection } from '../components/SpecialtiesSection';
import { TrustSection } from '../components/TrustSection';
import { FeaturedDoctorsSection } from '../components/FeaturedDoctorsSection';
import { TestimonialsSection } from '../components/TestimonialsSection';
import { FaqSection } from '../components/FaqSection';
import { FinalCtaSection } from '../components/FinalCtaSection';

export default function HomePage() {
  return (
    <div style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* 1. HERO SECTION */}
      <HeroSection />

      {/* 2. WHY CHOOSE CHEKUP247 (BENEFITS) */}
      <WhyChooseSection />

      {/* 3. HOW IT WORKS (3 STEPS & MOBILE MOCKUP) */}
      <HowItWorksSection />

      {/* 4. OUR SPECIALTIES SECTION */}
      <SpecialtiesSection />

      {/* 5. TRUST & SOCIAL PROOF SECTION */}
      <TrustSection />

      {/* 6. TOP VERIFIED PRACTITIONERS */}
      <FeaturedDoctorsSection />

      {/* 7. VERIFIED PATIENT TESTIMONIALS */}
      <TestimonialsSection />

      {/* 8. FREQUENTLY ASKED QUESTIONS */}
      <FaqSection />

      {/* 9. FINAL HIGH-IMPACT CTA BANNER */}
      <FinalCtaSection />
    </div>
  );
}
