# ChekUp247 — Product Requirements Document (PRD)
**Version:** 1.0  
**Date:** 14 September 2026  
**Status:** Draft — Pending Approval  
**Region:** South Africa  

---

## 1. Product Vision

ChekUp247 is a South African telehealth marketplace that connects patients with HPCSA-verified doctors for paid virtual consultations. The platform enables patients to find doctors by specialty, book available time slots, pay upfront, attend video consultations, and receive legally valid e-prescriptions — all from a single web experience.

**Revenue model:** Platform commission on every completed booking.

**Core value loop:**
> Doctor sets availability & rate → Patient discovers & books → Patient pays → Video consultation → Doctor issues e-prescription → Platform releases earnings (minus commission)

---

## 2. User Personas

### Patient (Primary User)
- South African resident seeking convenient access to a GP
- Values: ease of booking, transparent pricing, prescription delivery, mobile-friendly experience
- Needs: searchable doctor directory, secure payment, video call that works on mobile data, prescription PDF download

### Doctor (Supply Side)
- HPCSA-registered general practitioner (expanding to specialists later)
- Two entry paths: existing LocumStaff user (SSO) or direct registration
- Values: flexible scheduling, reliable payouts, minimal admin overhead
- Needs: calendar management, consultation tools, prescription builder, earnings visibility

### Admin (Platform Operator)
- ChekUp247 team member managing the platform
- Values: compliance, financial oversight, operational control
- Needs: doctor verification queue, commission management, transaction logs, dispute handling, analytics

---

## 3. Platform Architecture (3 Separate Applications)

> [!IMPORTANT]
> The admin panel is a **separate application** with its own deployment, domain, and authentication — it is NOT a route within the main patient-facing app. This is a security requirement.

| Application | Domain (example) | Framework | Purpose |
|---|---|---|---|
| **Patient App** | `chekup247.co.za` | Next.js 16 (React 19, SSR) | Public pages, patient registration, doctor search, booking, video, prescriptions |
| **Doctor Portal** | `doctor.chekup247.co.za` | Next.js 16 (React 19) | Doctor dashboard, calendar, consultation workspace, prescription builder, earnings |
| **Admin Panel** | `admin.chekup247.co.za` | Next.js 16 (React 19) | Doctor verification, commission, transactions, analytics, disputes — fully isolated |

All three apps connect to the **same NestJS backend API**, which enforces role-based access control. The admin panel's isolation means:
- Separate deployment pipeline
- No shared cookies/sessions with the patient app
- IP allowlisting or VPN restriction possible
- Admin-specific rate limiting and audit logging

---

## 4. Public Pages (Patient App)

Public pages are the front door of the platform. They must be SEO-optimized (SSR via Next.js 16), visually premium, and conversion-focused.

### 4.1 Public Page Map

| Page | Route | Purpose | SEO Priority |
|---|---|---|---|
| **Landing / Home** | `/` | Hero section, value proposition, how-it-works steps, featured doctors, trust signals (HPCSA verified badge), CTA to search/register | 🔴 Critical |
| **How It Works** | `/how-it-works` | Step-by-step guide for patients and doctors, visual walkthrough | 🔴 Critical |
| **Doctor Directory** | `/doctors` | Searchable, filterable list of verified doctors with specialties, ratings, pricing, next available slot | 🔴 Critical |
| **Doctor Profile** | `/doctors/:slug` | Individual doctor page — photo, bio, specialty, qualifications, rating, reviews, availability calendar, "Book Now" CTA | 🔴 Critical |
| **Pricing / Fees** | `/pricing` | Transparent consultation pricing, what's included, cancellation terms | 🟡 High |
| **About Us** | `/about` | Company story, mission, team, HPCSA partnership/verification commitment | 🟡 High |
| **FAQ** | `/faq` | Common questions about telehealth, prescriptions, payments, cancellations, privacy | 🟡 High |
| **For Doctors** | `/for-doctors` | Why join ChekUp247, how verification works, earnings potential, CTA to apply | 🟡 High |
| **Privacy Policy** | `/privacy` | POPIA-compliant privacy policy | 🟢 Required |
| **Terms of Service** | `/terms` | Platform terms, consultation disclaimers, cancellation policy | 🟢 Required |
| **Contact** | `/contact` | Contact form, email, support hours | 🟢 Required |
| **Blog** | `/blog` | Health articles, platform updates (Phase 2) | 🟢 Later |

### 4.2 Landing Page Sections

1. **Hero** — headline, subheadline, search bar (specialty + location), prominent CTA
2. **Trust bar** — "All doctors HPCSA verified", "POPIA compliant", "Secure video consultations"
3. **How it works** — 4-step visual: Search → Book → Consult → Get Prescription
4. **Featured doctors** — carousel of top-rated, verified doctors with photos
5. **Testimonials** — patient reviews (Phase 2, use placeholder copy for MVP)
6. **For Doctors CTA** — "Are you a doctor? Join our platform"
7. **Footer** — links to all public pages, contact info, social links, regulatory info

---

## 5. Functional Requirements

### 5.1 Authentication & Identity

#### Patient Authentication
| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | Email + password registration with email verification | P0 |
| AUTH-02 | Social login (Google) via Better Auth | P1 |
| AUTH-03 | Password reset / forgot password flow | P0 |
| AUTH-04 | Session management with secure HTTP-only cookies | P0 |
| AUTH-05 | Patient profile management (name, phone, DOB, profile photo) | P0 |

#### Doctor Authentication (Two Paths)
| ID | Requirement | Priority |
|---|---|---|
| AUTH-10 | **LocumStaff SSO** — OIDC authorization code + PKCE flow, mobile-app-initiated | P0 |
| AUTH-11 | SSO callback handler — exchange code, verify `id_token` against JWKS, match/create `doctor_profiles` by `sso_external_id` | P0 |
| AUTH-12 | If LocumStaff `status = VERIFIED` → auto-verify; if not → create as `pending`, notify admin | P0 |
| AUTH-13 | Direct doctor registration — email/password, submit HPCSA number + supporting docs | P0 |
| AUTH-14 | Direct-registered doctors start as `verification_status = pending`, invisible to patients | P0 |
| AUTH-15 | Doctor profile editing (bio, specialty, rate, profile photo) | P0 |

#### Admin Authentication
| ID | Requirement | Priority |
|---|---|---|
| AUTH-20 | Email + password login on the **separate admin app** | P0 |
| AUTH-21 | Admin accounts created by existing admins only (no self-registration) | P0 |
| AUTH-22 | Optional: 2FA/TOTP for admin accounts | P1 |

---

### 5.2 Doctor Directory & LocumStaff Sync

| ID | Requirement | Priority |
|---|---|---|
| DIR-01 | Background job syncs doctor profiles from LocumStaff Partner Directory API (`GET /v1/partner-directory/doctors`) | P0 |
| DIR-02 | Sync runs periodically (every 30 min recommended). Photo URLs are signed (1hr TTL) — store profile data, re-fetch photos on display | P0 |
| DIR-03 | Only eligible doctors synced: `role = LOCUM`, `status = VERIFIED`, `profession = GENERAL_PRACTITIONER` | P0 |
| DIR-04 | LocumStaff-synced doctors and directly-registered doctors appear in the same unified directory | P0 |
| DIR-05 | Doctor search: filter by specialty, rating, price range, next available slot, name search | P0 |
| DIR-06 | Doctor profile page: photo, bio, specialty, HPCSA verified badge, rating, reviews, availability calendar, "Book Now" | P0 |
| DIR-07 | Pagination + sorting (rating, price low-high, price high-low, next available) | P0 |

---

### 5.3 Availability & Booking

| ID | Requirement | Priority |
|---|---|---|
| AVAIL-01 | **LocumStaff doctors:** Availability pulled from `GET /v1/partner-directory/availability` — returns duty windows. ChekUp247 divides these into bookable slots based on configurable consult duration (default 30 min) + buffer time (default 5 min) | P0 |
| AVAIL-02 | **Direct doctors:** Create availability slots manually via calendar UI (single or recurring weekly) | P0 |
| AVAIL-03 | Availability displayed in patient's local timezone (stored as UTC) | P0 |
| AVAIL-04 | **Atomic booking** — slot selection uses DB row lock to prevent double-booking. Mark `is_booked = true` in same transaction as booking creation | P0 |
| AVAIL-05 | Booking created with `status = pending` → patient redirected to payment | P0 |
| AVAIL-06 | On payment success: `status = confirmed`, `payment_status = held` | P0 |
| AVAIL-07 | Booking details page: date/time, doctor info, status, join button (when time), cancel option | P0 |
| AVAIL-08 | "My Bookings" list for both patients and doctors — upcoming and past | P0 |

---

### 5.4 Payments

| ID | Requirement | Priority |
|---|---|---|
| PAY-01 | Paystack integration for ZAR payments | P0 |
| PAY-02 | Full amount charged to patient at booking time | P0 |
| PAY-03 | **Tokenize patient card** on first payment (Paystack Authorization) for future auto-debits (time extensions) | P0 |
| PAY-04 | Commission calculated at booking: `commission_amount = price × platform_settings.commission_percent` | P0 |
| PAY-05 | Paystack webhook handler for payment confirmation/failure | P0 |
| PAY-06 | Paystack subaccounts/split payments for automatic commission split if available | P1 |
| PAY-07 | Platform credit (wallet) can be applied at checkout — partial or full | P0 |
| PAY-08 | Payment receipt generated and emailed to patient | P1 |
| PAY-09 | Refund processing via Paystack API (full or partial based on cancellation rules) | P0 |

---

### 5.5 Video Consultation (Daily.co)

| ID | Requirement | Priority |
|---|---|---|
| VID-01 | Create Daily.co room on booking confirmation. Room expires after consultation window | P0 |
| VID-02 | Join button appears 5 minutes before `start_time`, links to consultation page | P0 |
| VID-03 | **Platform logo** overlaid on the video call UI (branded call experience) | P0 |
| VID-04 | **Session countdown timer** — counts down from booked duration, visible to both parties | P0 |
| VID-05 | **Warning indicators** at 5 min and 1 min remaining | P0 |
| VID-06 | **Time extension** — doctor-initiated only, requires patient consent | P0 |
| VID-07 | Extension options: +15 min, +20 min, +30 min | P0 |
| VID-08 | Extension flow: doctor clicks extend → patient sees consent modal with cost → patient approves → Paystack auto-debit via tokenized card → timer extended → backend records extension | P0 |
| VID-09 | Extension blocked if doctor's next slot is booked (VPS availability check) | P0 |
| VID-10 | **Background blur** — toggle on/off during call | P0 |
| VID-11 | **Virtual background image** — select from platform presets or upload custom | P1 |
| VID-12 | Doctor "End Consultation" button → `status = completed`, triggers prescription flow | P0 |
| VID-13 | **10-minute grace period** — if no one joins within 10 min of `start_time`, trigger no-show logic | P0 |
| VID-14 | Doctor no-show → full refund to patient, doctor flagged | P0 |
| VID-15 | Patient no-show → doctor gets paid, booking marked `no_show` | P0 |
| VID-16 | Consultation page includes: video frame, timer, doctor notes panel (doctor only), extension controls | P0 |

---

### 5.6 E-Prescription

| ID | Requirement | Priority |
|---|---|---|
| RX-01 | Only the consulting doctor, only after `status = completed`, can issue a prescription for that consultation | P0 |
| RX-02 | Prescription form: medication name (with NAPPI lookup dropdown), dosage, duration, instructions, ICD-10 diagnosis code (required), doctor HPCSA number (auto-filled) | P0 |
| RX-03 | **ICD-10 lookup** — SA Master Industry Table loaded into DB as reference, searchable dropdown | P0 |
| RX-04 | **NAPPI lookup** — dropdown powered by MediKredit data (requires license). **MVP fallback:** free-text medication entry with optional manual NAPPI code input if licensing is delayed | P0 |
| RX-05 | **S5/S6 handling** — if any medication is Schedule 5 or 6: require `supervision_declaration` text field, display SAHPRA telehealth guideline reminder, log for compliance audit | P0 |
| RX-06 | Multiple medications per prescription supported | P0 |
| RX-07 | Generate prescription PDF: patient name, doctor name + HPCSA number, medications, ICD-10 code, digital signature/timestamp, platform branding | P0 |
| RX-08 | Store PDF in file storage (MinIO/R2), link in `prescriptions.pdf_url` | P0 |
| RX-09 | Notify patient when prescription is ready (email + in-app + SMS/WhatsApp) with download link | P0 |
| RX-10 | Patient can view/download past prescriptions from their dashboard | P0 |

---

### 5.7 Notification & Reminder System

| ID | Requirement | Priority |
|---|---|---|
| NOTIF-01 | **Multi-channel delivery**: Email (Brevo), SMS (local SA gateway or Twilio — evaluate cost/reliability), WhatsApp (WhatsApp Business API), In-app (WebSocket) | P0 |
| NOTIF-02 | **Patient channel preferences** — patient selects 1 or 2 preferred channels (e.g., WhatsApp + Email). Stored in `notification_preferences` | P0 |
| NOTIF-03 | In-app notification center — bell icon with unread count, notification list with read/unread status | P0 |
| NOTIF-04 | Real-time in-app notifications via WebSocket (NestJS gateway) | P0 |

#### Notification Events

| Event | Channels | Timing |
|---|---|---|
| Booking confirmed | Preferred + In-app | Immediate |
| Booking reminder | Preferred | 24h, 1h, 15min before |
| Booking cancelled | Preferred + In-app | Immediate (both parties) |
| Payment received | Email + In-app | Immediate |
| Consultation starting | Preferred + In-app | 5 min before (with join link) |
| Prescription ready | Preferred + In-app | Immediate (with download link) |
| Time extension request | In-app (real-time) | During consultation |
| Time extension charged | Preferred + In-app | Immediate |
| Doctor verification result | Email + In-app | Immediate |
| Payout processed | Email + In-app | On payout |
| Review received (to doctor) | In-app | Immediate |
| Platform credit issued | Preferred + In-app | Immediate |

---

### 5.8 Cancellation & Platform Credits

| ID | Requirement | Priority |
|---|---|---|
| CXL-01 | **≥24 hours before:** Patient can cancel for full refund OR reschedule to another open slot on the same doctor's calendar | P0 |
| CXL-02 | **<24 hours before:** Percentage deduction (configurable in `platform_settings`) goes to the doctor | P0 |
| CXL-03 | Remainder after deduction: patient chooses between **(a)** platform credit or **(b)** refund to original payment method | P0 |
| CXL-04 | **Reschedule flow:** patient picks a new open slot → booking date/time updated, no payment change | P0 |
| CXL-05 | Doctor cancellation (any time) → full refund to patient + doctor flagged for review after repeated cancellations | P0 |
| CXL-06 | **Platform credits do NOT expire** | P0 |
| CXL-07 | Credits can be used partially — remaining balance carries forward | P0 |
| CXL-08 | Credits applied at checkout before card charge (credit balance deducted first, remainder charged to card) | P0 |
| CXL-09 | Credit transaction history visible to patient | P1 |

---

### 5.9 Reviews & Ratings

| ID | Requirement | Priority |
|---|---|---|
| REV-01 | Only patients with a `completed` booking can review that doctor | P1 |
| REV-02 | One review per booking | P1 |
| REV-03 | Rating (1–5 stars) + optional text comment | P1 |
| REV-04 | `doctor_profiles.rating_avg` updated on new review (background job syncs from AWS → VPS) | P1 |
| REV-05 | Reviews visible on doctor profile page (public) | P1 |

---

### 5.10 Admin Panel (Separate Application)

| ID | Requirement | Priority |
|---|---|---|
| ADM-01 | **Doctor verification queue** — list of pending doctors, view submitted docs, approve/reject with notes | P0 |
| ADM-02 | **Doctor management** — list all doctors, filter by status/source, suspend/unsuspend, view profile | P0 |
| ADM-03 | **Commission management** — set global `commission_percent`, view history of changes | P0 |
| ADM-04 | **Transaction log** — all payments, refunds, credits with filtering and export | P0 |
| ADM-05 | **Booking overview** — all bookings with status filters, search by patient/doctor | P0 |
| ADM-06 | **Analytics dashboard** — total bookings, revenue, active doctors, active patients, commission earned, booking completion rate, popular specialties | P1 |
| ADM-07 | **Payout management** — view pending payouts, trigger manual payouts, payout history | P1 |
| ADM-08 | **Patient management** — list patients, view booking history, suspend/ban | P1 |
| ADM-09 | **Dispute management** — view/resolve disputes, issue manual refunds or credits | P1 |
| ADM-10 | **Audit log viewer** — who accessed what patient data, when | P0 |
| ADM-11 | **Platform settings** — cancellation deduction %, consult duration defaults, buffer time | P0 |
| ADM-12 | **Content management** — FAQ entries, announcement banners (Phase 2) | P2 |

---

## 6. Non-Functional Requirements

### 6.1 Performance
- Page load (public pages): < 2s on 3G connection
- Doctor search results: < 500ms
- Booking creation (cross-DB): < 2s end-to-end
- Video call join: < 3s to connected state
- Notification delivery: < 5s for in-app, < 30s for email/SMS/WhatsApp

### 6.2 Security
- All traffic over HTTPS/TLS 1.3
- Passwords hashed via bcrypt/argon2 (Better Auth default)
- Rate limiting on auth endpoints (5 attempts/min)
- CSRF protection on all state-changing requests
- Admin panel: separate domain, separate auth, IP allowlisting recommended
- API: JWT-based auth with short-lived access tokens + refresh tokens
- File uploads: validated by type and size, stored with signed URLs (no public access)
- Paystack webhook signature verification

### 6.3 Compliance
- **HPCSA:** All doctors verified before going live
- **POPIA:** Explicit consent at signup, encrypted storage, Information Officer designated, documented data retention and breach policy
- **Data residency:** Patient/health data in AWS af-south-1 (Cape Town)
- **E-prescription:** HPCSA number + timestamp + ICD-10 code on every prescription
- **SAHPRA:** S5/S6 prescriptions flagged and supervised
- **Audit logging:** All access to patient health records logged with user ID, action, timestamp

### 6.4 Accessibility
- WCAG 2.1 AA compliance target
- Keyboard navigable
- Screen reader compatible
- Minimum contrast ratios on all text
- Focus indicators on all interactive elements

---

## 7. Data Architecture

### Split-Database Strategy

```
┌─────────────────────────────────────────┐
│          NestJS Backend API             │
│    (single API, role-based access)      │
├──────────────────┬──────────────────────┤
│                  │                      │
│   VPS Postgres   │   AWS RDS Postgres   │
│  (Operational)   │  (Patient/Health)    │
│                  │   af-south-1         │
│  • users         │  • bookings          │
│  • doctor_profiles│ • payments          │
│  • availability  │  • consultations     │
│  • payouts       │  • consultation_ext  │
│  • platform_settings│• prescriptions    │
│  • notification_ │  • reviews           │
│    preferences   │  • notifications     │
│  • audit_logs    │  • wallet_credits    │
└──────────────────┴──────────────────────┘
```

### Cross-DB Consistency
- Saga pattern with compensating rollback for booking creation
- Outbox pattern for event-driven sync (rating updates, notifications)
- Reconciliation cron for drift detection
- Dead-letter queue for failed compensating actions

---

## 8. Third-Party Integrations

| Service | Purpose | Status | Credentials |
|---|---|---|---|
| **LocumStaff** | Doctor SSO (OIDC) + Directory + Availability | ✅ Built | Needs client registration |
| **Daily.co** | Video consultations | ✅ Account ready | API key available |
| **Paystack** | Payments, refunds, tokenized billing | Needs setup | — |
| **Brevo** | Email notifications | Needs setup | — |
| **SMS Gateway** | SMS reminders (local SA or Twilio — TBD) | Needs evaluation | — |
| **WhatsApp Business API** | WhatsApp reminders | Needs setup | — |
| **MediKredit** | NAPPI medication database | Needs licensing | — |
| **ICD-10 SA MIT** | Diagnosis code lookup | ✅ Free download | — |
| **Better Auth** | User authentication | Self-hosted | — |

---

## 9. Missing Features & Future Considerations

> [!WARNING]
> The following features are **not in the current spec** but may be needed. Review and decide which belong in MVP vs later phases.

| Feature | Notes | Suggested Phase |
|---|---|---|
| **Patient medical history / health profile** | Chronic conditions, allergies, current medications — doctors need this context before a consultation | MVP? |
| **Consultation chat (text)** | In-call text chat for sharing links, spelling medication names, accessibility for hearing-impaired | MVP or Phase 2 |
| **Waiting room experience** | Patient sees "Doctor will be with you shortly" + queue position if doctor is running late | MVP? |
| **Doctor "running late" notification** | If doctor hasn't joined 2 min after start, notify patient with ETA | Phase 2 |
| **Consultation summary / doctor notes to patient** | Post-consultation summary shared with patient (separate from prescription) | Phase 2 |
| **Referral to specialist** | Doctor refers patient to another doctor on the platform | Phase 2 |
| **Follow-up booking** | Doctor recommends follow-up, patient can book directly from consultation summary | Phase 2 |
| **Doctor unavailability / holiday blocking** | Doctor marks dates as unavailable | MVP? |
| **Patient medical aid / insurance details** | Capture for future integration, or for doctors to know billing context | Phase 3 |
| **Multi-language support** | English + Afrikaans + Zulu at minimum for SA market | Phase 3 |
| **Mobile apps (iOS/Android)** | Native apps for patients and doctors | Phase 3 |
| **Pharmacy integration** | Send prescription directly to a pharmacy for fulfillment | Phase 3 |
| **Lab result uploads** | Doctor requests labs, patient uploads results | Phase 3 |
| **Loyalty / referral program** | Patient refers friends, earns credits | Phase 3 |
| **Doctor-to-doctor consultation** | Peer consultation for complex cases | Phase 3 |

---

## 10. LocumStaff POC Code Extraction

The LocumStaff repo contains proof-of-concept code (see `docs/plans/telehealth-extraction-plan.md`) that can potentially accelerate development:

| Component | Status | Action |
|---|---|---|
| Calendar / availability UI | Built (POC) | Review and extract if usable |
| Video call integration | Built (POC) | Review — may use different provider |
| E-scripting logic | Built (POC) | Review and extract |
| Prescription PDF generation | Partially built | Review and complete |

> [!IMPORTANT]
> **Action needed:** Provide the `telehealth-extraction-plan.md` file and the relevant POC source code for review. If the code quality is good enough, extracting it could save 2–3 weeks of development on calendar, video, and prescription features.
