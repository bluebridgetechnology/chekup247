'use client';

import React from 'react';
import Link from 'next/link';
import { SolarIcon } from './SolarIcon';

export function FinalCtaSection() {
  return (
    <section className="final-cta-section" aria-label="Get Started with Chekup247">
      <div className="final-cta-container">
        <div className="final-cta-banner">
          {/* Left Content */}
          <div className="final-cta-content">
            <div className="final-cta-eyebrow">
              READY TO GET STARTED?
            </div>
            <h2 className="final-cta-headline">
              Better healthcare is just a click away.
            </h2>
            <p className="final-cta-text">
              Book a consultation today and take the first step towards a healthier you.
            </p>
          </div>

          {/* Right Action */}
          <div className="final-cta-action">
            <Link href="/doctors" className="final-cta-btn">
              <span>Get Started Now</span>
              <SolarIcon
                name="arrow-right-linear"
                size={16}
                color="var(--color-chocolate-base)"
              />
            </Link>
          </div>

          {/* Decorative Abstract Gold Healthcare Lobe on Far Right */}
          <svg
            className="final-cta-decorative"
            viewBox="0 0 280 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M140 16C210 8 270 54 276 120C282 186 220 232 154 236C88 240 32 194 14 138C-4 82 70 24 140 16Z"
              stroke="var(--color-gold-base)"
              strokeWidth="24"
              strokeMiterlimit="10"
              fill="none"
            />
            <path
              d="M174 52C218 44 252 78 244 122C236 166 192 192 148 184C104 176 78 140 86 96C94 52 130 60 174 52Z"
              fill="var(--color-gold-base)"
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
