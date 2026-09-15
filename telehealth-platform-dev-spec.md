# Telehealth Platform — Technical Specification (v1.0)
**Region:** South Africa
**Audience:** Development team
**Status:** MVP planning

---

## 1. Overview

A telehealth marketplace connecting patients with independent doctors for paid virtual consultations. Patients search and book doctors by specialty/availability, pay upfront, attend a video consultation, and receive an e-prescription. The platform takes a commission on every booking. Admins verify doctors (HPCSA registration), manage commission rates, and oversee disputes/payouts.

**Core value loop:** Doctor sets availability & rate → Patient books & pays → Video consultation happens → Doctor issues e-prescription → Platform releases doctor's earnings (minus commission).

**Two architectural decisions that shape everything below:**
1. **Doctor identity is federated, not always self-registered.** Doctors who already have an account on LocumStaff can sign in via SSO using their existing LocumStaff credentials — they should never have to fill out a duplicate registration form. New-to-platform doctors still go through the standard apply → verify flow. See §4.1.
2. **The database is split across two locations.** Operational data (doctors, availability, admin, payouts) lives in Postgres on the VPS. Patient/health data (bookings, consultations, prescriptions, payments, reviews) lives offsite in AWS (RDS Postgres). See §3a and §6 for what this means technically.

---

## 2. Actors & Roles

| Role | Description |
|---|---|
| Patient | Books, pays for, and attends consultations |
| Doctor | HPCSA-verified practitioner; sets rate/availability, conducts consultations, prescribes |
| Admin | Verifies doctors, sets commission, manages payouts/disputes, platform analytics |
| (Phase 2) Support agent | Handles refunds, complaints, escalations |

Auth uses **Better Auth** (self-hosted, Postgres-backed). Patients and admins authenticate directly against Better Auth (email/password or social login). Doctors have **two entry paths**: doctors already registered on LocumStaff authenticate via SSO against LocumStaff as the identity provider; net-new doctors register directly and go through standard HPCSA verification. Both paths converge on the same `doctor_profiles` record — see §4.1.

---

## 3. Core Entities & Schema

### 3a. Where each table lives

The schema is split across two physically separate Postgres instances:

| Location | Purpose | Tables |
|---|---|---|
| **VPS Postgres** ("operational DB") | Non-health operational data, kept self-hosted | `users` (auth identity), `doctor_profiles`, `availability_slots`, `payouts`, `platform_settings` |
| **AWS RDS Postgres** ("patient DB", offsite) | Anything patient-identifiable or health-related | `bookings`, `payments`, `consultations`, `prescriptions`, `reviews` |

**Why this matters technically:** Postgres foreign keys and transactions can't span two separate database servers. A booking references both a `patient` (in AWS) and a `doctor`/`availability_slot` (on the VPS) — that reference has to be validated and kept consistent at the **application layer** (in NestJS), not enforced by a database constraint. Concretely:
- When a booking is created, the backend must call into the VPS DB to lock/mark the `availability_slot`, then write the booking record into the AWS DB. If the second write fails, the first needs to be rolled back — build this as an explicit two-step transaction with compensating rollback logic, not a single DB transaction.
- Store `doctor_id` on the AWS-side `bookings` table as a plain UUID (no enforced FK) and validate its existence in application code when writing.
- Recommend using AWS's **Cape Town region (af-south-1)** for the RDS instance — this keeps patient health data hosted within South Africa, which materially simplifies your POPIA cross-border data transfer story compared to hosting in a US/EU region. Confirm current service availability in that region before committing, as not everything AWS offers is available in every region.

### `users` *(VPS)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| role | enum | patient, doctor, admin |
| email | string | unique |
| phone | string | |
| password_hash | string | if not using managed auth |
| full_name | string | |
| date_of_birth | date | patients only |
| status | enum | active, suspended, banned |
| created_at | timestamp | |

### `doctor_profiles` *(VPS)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users |
| hpcsa_number | string | required, verified against public register |
| verification_status | enum | pending, verified, rejected |
| verification_source | enum | `platform` (verified by our admin) or `locumstaff` (inherited via SSO) — **flagged as an open decision in §9** |
| sso_provider | enum, nullable | `locumstaff` or null for directly-registered doctors |
| sso_external_id | string, nullable | doctor's unique ID on LocumStaff, used to match SSO logins to the right record |
| specialty | string | |
| bio | text | |
| rate_per_hour | decimal | ZAR |
| rating_avg | decimal | computed |
| documents_url | string[] | uploaded license/ID docs (n/a if SSO-sourced) |
| created_at | timestamp | |

### `availability_slots` *(VPS)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| doctor_id | UUID | FK |
| start_time | timestamp | stored in UTC |
| end_time | timestamp | |
| is_booked | boolean | default false |
| is_recurring | boolean | for recurring weekly slots |

### `bookings` *(AWS — offsite)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| patient_id | UUID | FK |
| doctor_id | UUID | plain UUID, **not** an enforced FK — doctor record lives on the VPS DB; validate existence in application code |
| slot_id | UUID | plain UUID, references VPS `availability_slots` — same cross-DB caveat |
| status | enum | pending, confirmed, completed, cancelled, no_show |
| price | decimal | snapshot of rate at booking time |
| commission_amount | decimal | snapshot of commission at booking time |
| payment_status | enum | unpaid, held, released, refunded |
| created_at | timestamp | |

### `payments` *(AWS — offsite)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK |
| amount | decimal | |
| provider | string | e.g. paystack |
| provider_ref | string | transaction reference |
| status | enum | pending, success, failed, refunded |
| created_at | timestamp | |

### `consultations` *(AWS — offsite)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK, unique |
| video_room_id | string | |
| started_at | timestamp | nullable until joined |
| ended_at | timestamp | nullable |
| doctor_notes | text | private clinical notes |

### `prescriptions` *(AWS — offsite)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| consultation_id | UUID | FK |
| doctor_id | UUID | plain UUID, cross-DB reference to VPS `doctor_profiles` |
| patient_id | UUID | FK |
| medications | JSON | array of {name, dosage, duration, instructions, nappi_code} |
| icd10_code | string | **required** — SA medical schemes reject claims without it |
| schedule_flag | enum | S1–S6, flags controlled substances for extra review |
| pdf_url | string | generated document |
| issued_at | timestamp | |

### `reviews` *(AWS — offsite)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| booking_id | UUID | FK, unique |
| patient_id | UUID | FK |
| doctor_id | UUID | plain UUID, cross-DB reference to VPS `doctor_profiles` |
| rating | int | 1–5 |
| comment | text | |

### `payouts` *(VPS)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| doctor_id | UUID | FK |
| amount | decimal | |
| status | enum | pending, paid, failed |
| period_start | date | |
| period_end | date | |

### `platform_settings` *(VPS)*
| Field | Type | Notes |
|---|---|---|
| id | UUID | PK |
| commission_percent | decimal | global default |
| updated_by | UUID | FK → admin user |
| updated_at | timestamp | |

*(Optional: per-doctor commission override field on `doctor_profiles`)*

---

## 4. Key Workflows

### 4.1 LocumStaff SSO login (existing doctors)
This is the primary entry path for any doctor already on LocumStaff — they must never be asked to fill out a duplicate registration.
1. Doctor clicks **"Continue with LocumStaff"** on the login screen.
2. Redirect to LocumStaff's OAuth2/OIDC authorization endpoint; doctor authenticates with their existing LocumStaff credentials.
3. LocumStaff redirects back with an authorization code; backend exchanges it for an access token and fetches the doctor's profile (name, email, HPCSA number if exposed by LocumStaff's API).
4. Backend looks up `doctor_profiles` by `sso_external_id`:
   - **Match found** → log the doctor straight in, no re-registration.
   - **No match** → create a new `doctor_profiles` record with `sso_provider = 'locumstaff'`, `sso_external_id` set, and profile fields pre-filled from LocumStaff's data.
5. **Open question (see §9):** does LocumStaff's own HPCSA vetting count as sufficient for `verification_status = verified`, or does every SSO-linked doctor still need a manual admin check the first time? This is a business/compliance call, not a technical one — get it confirmed before building the auto-provisioning logic in step 4.
6. **External dependency:** this whole flow requires LocumStaff to expose an OAuth2/OIDC (or SAML) identity endpoint and agree to a technical integration. This is a partnership conversation to start immediately — it's outside your team's control and can become a timeline blocker independent of your own dev progress.

### 4.2 Doctor onboarding & verification (new-to-platform doctors)
1. Doctor signs up directly (not via LocumStaff), submits HPCSA number + supporting docs.
2. Record created with `verification_status = pending`, `sso_provider = null`; doctor cannot appear in search or receive bookings yet.
3. Admin manually checks HPCSA number against the public register (MVP: manual; later: API if HPCSA exposes one) and reviews docs.
4. Admin approves → `verification_status = verified`, `verification_source = 'platform'` → doctor profile becomes searchable.

### 4.3 Availability & booking
1. Doctor creates `availability_slots` (single or recurring).
2. Patient searches doctors, views open (`is_booked = false`, future) slots in their own local time.
3. Patient selects a slot → booking created with `status = pending`.
4. **Concurrency:** slot selection must be atomic (DB transaction / row lock) to prevent two patients booking the same slot. Mark `is_booked = true` inside the same transaction as booking creation.
5. Patient pays → on payment success, `status = confirmed`, `payment_status = held`.

### 4.4 Payment & escrow
1. Payment initiated via Paystack (or PayFast/Yoco) at booking time, full amount charged to patient.
2. Funds are logically "held" in platform's account — track this with `payment_status = held` rather than literal escrow unless the provider supports it.
3. On consultation completion, trigger payout calculation: `doctor_earning = price - commission_amount`.
4. Doctor's available balance is credited; actual bank payout happens on a payout cycle (e.g., weekly) via `payouts` table.
5. Use Paystack **subaccounts/split payments** if available to automate the commission split at charge time, reducing manual reconciliation.

### 4.5 Consultation session
1. At `start_time`, both parties can join `video_room_id` (grace period, e.g., 10 min).
2. `started_at` set when first participant joins.
3. On call end (manual "End consultation" by doctor, or timeout), `ended_at` set, `status = completed`.
4. **No-show handling:**
   - Doctor no-show → automatic full refund to patient, doctor flagged.
   - Patient no-show → doctor still gets paid (per your cancellation policy), booking marked `no_show`.

### 4.6 E-prescription
1. Only the doctor, only after `status = completed`, can issue a prescription tied to that `consultation_id`.
2. Form includes: medication name + **NAPPI code**, dosage, duration, instructions, **ICD-10 diagnosis code** (required field — do not let a doctor submit without it), doctor's HPCSA number, digital signature/timestamp.
3. If any medication requires `schedule_flag` of S5/S6, flag for stricter handling (e.g., require doctor to confirm an existing relationship or add extra notes) — check current SAHPRA rules before finalizing this logic.
4. Generate PDF, store `pdf_url`, notify patient (email/in-app) with download link.
5. **Medication lookup dropdown**: powered by the NAPPI product database (requires a MediKredit data-license agreement — not freely available, budget time for this). **Diagnosis lookup dropdown**: powered by the SA ICD-10 Master Industry Table, free to download from the National Department of Health and can be loaded directly into your own DB as a static reference table.

### 4.7 Cancellation & refund policy (define exact rules before building)
Suggested default — confirm with legal/business before shipping:
- Patient cancels >2 hrs before slot → full refund, slot reopened.
- Patient cancels <2 hrs before → partial/no refund (your call).
- Doctor cancels (any time) → full refund + doctor flagged for review after repeated cancellations.

### 4.8 Reviews
- Only patients with a `completed` booking for that doctor can leave a review.
- Review submission updates `doctor_profiles.rating_avg` (recomputed or incrementally updated).

---

## 5. API Endpoints (MVP surface)

```
Auth
POST   /auth/register
POST   /auth/login
POST   /auth/verify-email
GET    /auth/sso/locumstaff              # redirect to LocumStaff's OAuth2/OIDC endpoint
GET    /auth/sso/locumstaff/callback     # exchange code, match/create doctor_profiles

Doctors
GET    /doctors                     # search/filter
GET    /doctors/:id
POST   /doctors/onboard             # submit HPCSA + docs
GET    /doctors/:id/availability
POST   /doctors/availability        # create slots (doctor only)
DELETE /doctors/availability/:id

Bookings
POST   /bookings                    # create booking (locks slot)
GET    /bookings/:id
GET    /bookings/mine               # patient or doctor's bookings
POST   /bookings/:id/cancel

Payments
POST   /payments/initiate
POST   /payments/webhook            # provider callback

Consultations
POST   /consultations/:bookingId/join
POST   /consultations/:bookingId/end

Prescriptions
POST   /prescriptions               # doctor issues
GET    /prescriptions/:id

Reviews
POST   /reviews

Admin
GET    /admin/doctors/pending
POST   /admin/doctors/:id/verify
POST   /admin/doctors/:id/reject
PUT    /admin/settings/commission
GET    /admin/transactions
GET    /admin/analytics
```

---

## 6. Recommended Tech Stack (confirmed — self-hosted on VPS)

| Layer | Recommendation | Notes |
|---|---|---|
| Frontend | Next.js | SSR helps with SEO for doctor profile pages |
| Backend | NestJS | Justified here — role-based logic, payment webhooks, background jobs, and multiple third-party integrations (Paystack, Daily.co, NAPPI/ICD-10) are enough structure to warrant it |
| Database (operational) | PostgreSQL, self-hosted on VPS | Doctors, availability, payouts, platform settings — see §3a for the full split |
| Database (patient/health) | PostgreSQL via **AWS RDS**, offsite | Bookings, payments, consultations, prescriptions, reviews. Recommend **af-south-1 (Cape Town)** region to keep patient health data within South Africa for POPIA purposes |
| Auth | **Better Auth** | Self-hosted, free, users live in your own Postgres. Auth.js/NextAuth's team merged into Better Auth in Sept 2025 and now ships new features there — Better Auth is the more future-proof pick for a greenfield self-hosted app |
| Doctor SSO | LocumStaff (OAuth2/OIDC, external) | Doctors already registered on LocumStaff sign in with existing credentials — no duplicate registration. Requires a technical integration agreement with LocumStaff; see §4.1 |
| Video/Audio | Daily.co | Confirmed — embeds cleanly in Next.js, no SA-specific blockers |
| Calendar (UI) | react-big-calendar or FullCalendar (React) | Frontend calendar component for availability + booking views; backend logic already covered in §4.2 |
| Payments | Paystack (primary) | ZAR support, split-payment/subaccount support for commission |
| File storage | S3-compatible, self-hosted option: MinIO on the same VPS, or Cloudflare R2 | For docs, PDFs, license uploads |
| PDF generation | Puppeteer or a templating lib | For prescriptions |
| Hosting | VPS (confirmed) | Plan for separate app/DB layers or at least resource isolation as you scale; consider managed Postgres backups even if DB itself is self-hosted |
| Background jobs | BullMQ (Redis) | For payout cycles, reminders, no-show detection |
| Medical coding | ICD-10 SA Master Industry Table (MIT) — free, download from National DoH | **Required**, not optional — SA medical scheme rules reject prescriptions without a valid ICD-10 code |
| Medical coding | NAPPI codes — licensed via MediKredit | No free public API; requires a commercial data-license agreement. Start this conversation early, it can become a critical-path item independent of dev work |

---

## 7. Compliance Requirements (non-negotiable for MVP)

- **HPCSA registration check** before any doctor goes live — including SSO-provisioned doctors, pending the decision in §9.
- **POPIA compliance**: explicit consent at signup, encrypted storage of health data, designated Information Officer, documented data retention/breach policy.
- **Data residency**: patient/health data is stored offsite in AWS — use the af-south-1 (Cape Town) region rather than a US/EU region to avoid triggering POPIA's cross-border data transfer requirements (Section 72). Encrypt at rest and in transit regardless of region.
- **E-prescription validity**: HPCSA number + signature + timestamp on every prescription; extra handling for scheduled medicines.
- Audit logging on all access to patient health records (who viewed what, when) — this logging can live on either DB, but should itself never live only on the AWS side, so admins retain visibility even if that connection is degraded.

---

## 8. Build Phases

**Phase 1 — MVP**
- LocumStaff SSO login for existing doctors (flagged as high priority — start the LocumStaff integration conversation immediately, it's on an external dependency's timeline, not yours)
- Doctor onboarding + admin verification (for doctors not on LocumStaff)
- Availability calendar (create/view slots)
- Search & booking
- Paystack payment integration
- Video consultation (Agora/Twilio)
- Basic e-prescription (PDF generation)
- Admin dashboard: doctor approval, commission setting, transaction log

**Phase 2**
- Reviews & ratings
- Automated payout cycles
- Cancellation/reschedule policy engine
- Doctor earnings dashboard & analytics
- No-show detection automation

**Phase 3**
- Pharmacy integration for prescription fulfillment
- Lab result uploads
- Insurance/medical aid integration
- Native mobile apps
- Multi-language support

---

## 9. Open Decisions (flag for business/legal sign-off before dev starts)

1. Exact cancellation/refund policy thresholds.
2. Commission % (global default, and whether per-doctor overrides are allowed).
3. Whether prescriptions for Schedule 5/6 medicines are permitted at all via teleconsultation, or excluded from MVP.
4. Data residency requirement under POPIA — local SA hosting vs. international with safeguards.
5. Payout cycle frequency (weekly/biweekly/monthly) and minimum payout threshold.
6. Whether LocumStaff's HPCSA vetting is trusted as sufficient for auto-verification on SSO signup, or every doctor still gets a manual admin check on first login.
7. Confirm LocumStaff can support an OAuth2/OIDC (or SAML) integration and agree on which profile fields they'll expose via their API.
8. Confirm AWS account/region setup (af-south-1 recommended) and who owns provisioning and ongoing RDS costs/backups.
