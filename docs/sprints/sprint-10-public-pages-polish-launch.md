# Sprint 10 — Public Pages, Polish & Launch Prep

**Sprint:** 10 of 10  
**Timeline:** Weeks 19–20  
**Total Points:** ~78  
**Status:** Complete  
**Prerequisites:** Sprint 9 complete; legal documentation (Terms & Privacy) ready; staging deployment operational.

---

## 1. Sprint Goal
1. Deliver polished, visually stunning, high-converting public marketing pages on the Patient App (`/`, `/how-it-works`, `/for-doctors`, `/pricing`, `/about`, `/faq`, `/contact`).
2. Implement complete SEO infrastructure: dynamic sitemaps, JSON-LD structured data, metadata tags, and Core Web Vitals optimization.
3. Conduct cross-app responsive design, accessibility (WCAG 2.1 AA), and security audits.
4. Finalize production deployment, database backup automation, error monitoring (Sentry), and execute the full end-to-end smoke test.

---

## 2. Detailed Task Breakdown

### Patient App (Public Marketing Pages)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-1001 | **Homepage / Landing Page** (`/`). | 8 | Hero section with doctor search bar, trust bar (HPCSA verified, POPIA compliant), 4-step "How it works" visual, featured doctors carousel, patient testimonials, and CTA section. |
| PA-1002 | **"How It Works" Page** (`/how-it-works`). | 3 | Animated step-by-step interactive walkthrough for both patients and doctors with visual infographics. |
| PA-1003 | **"For Doctors" Page** (`/for-doctors`). | 3 | Doctor recruitment landing page: highlights earning potential, flexible hours, SSO with LocumStaff, verification criteria, and "Join as a Doctor" CTA. |
| PA-1004 | **Pricing & Transparency Page** (`/pricing`). | 2 | Clear breakdown of consultation pricing, payment options, platform credit system, and cancellation policy summary. |
| PA-1005 | **About Us Page** (`/about`). | 2 | Mission, vision, medical leadership team, commitment to healthcare accessibility across South Africa. |
| PA-1006 | **Interactive FAQ Page** (`/faq`). | 3 | Categorized accordion (Booking, Payments, Prescriptions, Privacy & Security, Cancellations) with instant search filter. |
| PA-1007 | **Contact Page** (`/contact`). | 2 | Contact form connected to Brevo email service, customer support hours, emergency healthcare disclaimers. |
| PA-1008 | **Legal Pages** (`/privacy`, `/terms`). | 2 | Formal POPIA compliance privacy policy and platform terms of service. |
| PA-1009 | SEO & Structured Data Optimization. | 3 | Dynamic OpenGraph images, Twitter cards, canonical tags, JSON-LD (`MedicalBusiness`, `Physician`, `FAQPage`), and automated `sitemap.xml` / `robots.txt`. |

### Cross-App UX Polish & Accessibility
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| UX-1001 | Mobile Responsiveness & Touch Optimization Audit. | 5 | Validates all screens (Patient, Doctor, Admin) on iOS Safari, Android Chrome, and tablets; touch target minimums >= 44x44px. |
| UX-1002 | Skeleton loaders, empty states, and transition states. | 5 | Smooth skeleton loaders for doctor directory, appointments, and earnings; friendly empty state illustrations. |
| UX-1003 | WCAG 2.1 AA Accessibility Audit & Remediation. | 5 | Full keyboard navigation audit, ARIA label auditing, screen reader testing, and color contrast compliance. |
| UX-1004 | Core Web Vitals Optimization. | 5 | LCP < 2.0s, FID/INP < 100ms, CLS < 0.1 on mobile 4G networks; image optimization using Next.js Image component. |
| UX-1005 | Global error boundaries and branded fallback screens (`404`, `500`, maintenance). | 2 | Clean, helpful error screens with retry actions and navigation recovery. |

### Security Hardening & Infrastructure
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| SEC-1001 | API Rate Limiting & Brute-Force Protection. | 2 | Strict rate limits on auth routes (5 attempts/min); general API throttling using NestJS Throttler. |
| SEC-1002 | Content Security Policy (CSP), CORS, and HTTP Security Headers. | 2 | Helmet integration; restrictive CSP; domain-locked CORS policies for patient, doctor, and admin apps. |
| SEC-1003 | Admin Panel IP Allowlisting & Access Lockdown. | 2 | Reverse proxy / middleware configuration restricting admin access to authorized corporate IP ranges or VPN. |
| OPS-1001 | Automated Database Backup Configuration. | 2 | Automated daily pg_dump backups for VPS Postgres and automated point-in-time recovery (PITR) for AWS RDS. |
| OPS-1002 | Sentry Monitoring & Structured Alerting. | 3 | Sentry integrated across backend and all three Next.js apps with alert channels (Slack/Email). |
| QA-1001 | End-to-End Production Smoke Test. | 5 | Complete walkthrough test: Patient registers -> searches doctor -> books slot -> pays Paystack -> joins Daily.co video -> doctor extends time -> prescription issued -> PDF downloaded. |

---

## 3. Deliverables Checklist
- [x] Public marketing pages live, mobile-responsive, and optimized for search engines.
- [x] Accessibility meets WCAG 2.1 AA guidelines.
- [x] Core Web Vitals score green on Google PageSpeed Insights.
- [x] Security hardening (rate limiting, CSP, admin IP lockdown) active.
- [x] Automated backups and Sentry error monitoring deployed.
- [x] Full end-to-end smoke test passes without errors.
- [x] Platform ready for public launch!
