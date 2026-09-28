'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ChekupCrossLogo } from './Navbar';

export interface FooterProps {
  compact?: boolean;
}

export function Footer({ compact = false }: FooterProps) {
  return (
    <footer className={`site-footer ${compact ? 'site-footer--compact' : ''}`}>
      <div className="footer-container">
        {/* Top 4-Column Area (Omitted in patient portal compact mode) */}
        {!compact && (
          <div className="footer-top-grid">
          {/* Column 1: Brand & Slogan */}
          <div className="footer-brand-col">
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '10px',
                textDecoration: 'none',
              }}
              aria-label="Chekup247 Home"
            >
              <ChekupCrossLogo size={26} />
              <span
                style={{
                  fontSize: '1.28rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1,
                  display: 'inline-flex',
                  alignItems: 'baseline',
                  fontFamily: 'var(--font-heading), sans-serif',
                }}
              >
                <span style={{ color: 'var(--color-white)' }}>Chekup</span>
                <span style={{ color: 'var(--color-gold-base)' }}>247</span>
              </span>
            </Link>

            <p className="footer-slogan">
              Quality Care. Anytime. Anywhere.
            </p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="footer-nav-col">
            <h4 className="footer-heading">Quick Links</h4>
            <ul className="footer-nav-list">
              <li>
                <Link href="/" className="footer-nav-link">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/doctors" className="footer-nav-link">
                  Services
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="footer-nav-link">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/about" className="footer-nav-link">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Support */}
          <div className="footer-nav-col">
            <h4 className="footer-heading">Support</h4>
            <ul className="footer-nav-list">
              <li>
                <Link href="/faq" className="footer-nav-link">
                  Help Center
                </Link>
              </li>
              <li>
                <Link href="/contact" className="footer-nav-link">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link href="/faq" className="footer-nav-link">
                  FAQs
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="footer-nav-link">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="footer-nav-link">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Follow Us */}
          <div className="footer-nav-col">
            <h4 className="footer-heading">Follow Us</h4>
            <div className="footer-social-row">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Chekup247 on Facebook"
                className="footer-social-icon touch-target"
              >
                <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Chekup247 on Instagram"
                className="footer-social-icon touch-target"
              >
                <svg
                  width="21"
                  height="21"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
              </a>

              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Chekup247 on X"
                className="footer-social-icon touch-target"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Follow Chekup247 on LinkedIn"
                className="footer-social-icon touch-target"
              >
                <svg width="21.5" height="21.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 10.9v8.37H9.2V10.9H6.46M7.83 6.45a1.6 1.6 0 0 0-1.6 1.6 1.6 1.6 0 0 0 1.6 1.6 1.6 1.6 0 0 0 1.6-1.6 1.6 1.6 0 0 0-1.6-1.6z" />
                </svg>
              </a>
            </div>
          </div>
        </div>
        )}

        {/* Bottom Subtle Divider Bar */}
        <div className="footer-bottom-bar">
          <p className="footer-copyright">
            © 2026 Chekup247. All rights reserved.
          </p>

          <div className="footer-proudly-sa">
            <Image
              src="/images/south-africa-flag.svg"
              alt="South African Flag"
              width={20}
              height={20}
              style={{ display: 'block', borderRadius: '2px' }}
            />
            <span>Proudly South African</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
