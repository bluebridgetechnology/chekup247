# ChekUp247 — Master Engineering Guide & Single Source of Truth (`AGENT.md`)

> **Notice for all AI Agents and Engineers:**  
> This file is the primary single source of truth for all architectural decisions, compliance rules, security constraints, and coding standards for the ChekUp247 platform.  
> Every change, PR, or implementation **must** adhere strictly to the rules below. If a proposed feature or implementation conflicts with this document, stop and flag the discrepancy before proceeding.

---

## 1. High-Level Architecture & Repository Boundaries

The platform consists of **three distinct frontend applications** and **one shared NestJS backend API**:

| Application | Domain | Framework | Description |
|---|---|---|---|
| **Patient Web App** | `chekup247.co.za` | Next.js (SSR) | Public landing pages, SEO doctor directory, booking checkout, video call room, prescriptions, patient wallet. |
| **Doctor Portal** | `doctor.chekup247.co.za` | Next.js | Doctor schedule/calendar manager, consultation workspace (split video + notes), prescription builder, earnings. |
| **Admin Panel** | `admin.chekup247.co.za` | Next.js | **Isolated application.** Doctor verification queue, commission settings, financial ledger, dispute manager, audit logs. |
| **Backend API** | `api.chekup247.co.za` | NestJS | Single API enforcing strict Role-Based Access Control (RBAC). Interacts with both databases, Redis/BullMQ, and external services. |

### ⛔ Critical Boundary Rules
- **NEVER** build the Admin Panel as a route or sub-folder within the Patient or Doctor frontends (e.g., `chekup247.co.za/admin` is strictly forbidden). It must exist as a completely separate Next.js application on a dedicated subdomain with independent authentication, deployment pipelines, and optional IP allowlisting.
- **NEVER** share session tokens, cookies, or local storage between the Admin Panel and the public apps.

---

## 2. Physical Split-Database Architecture

ChekUp247 operates with **two physically isolated PostgreSQL databases**:

```
┌─────────────────────────────────────────────────────────────┐
│                       NestJS Backend                        │
├──────────────────────────────┬──────────────────────────────┤
│    VPS PostgreSQL (Self-Hosted) │    AWS RDS PostgreSQL (Offsite)│
│          "Operational DB"    │         "Patient/Health DB"  │
│                              │       Region: af-south-1     │
├──────────────────────────────┼──────────────────────────────┤
│ • users (auth credentials)   │ • bookings                   │
│ • doctor_profiles            │ • payments                   │
│ • availability_slots         │ • consultations              │
│ • payouts                    │ • consultation_extensions    │
│ • platform_settings          │ • prescriptions              │
│ • notification_preferences   │ • reviews                    │
│ • audit_logs (system-wide)   │ • notifications              │
│                              │ • wallet_credits             │
└──────────────────────────────┴──────────────────────────────┘
```

### ⛔ Database DOs and DON'Ts
- ❌ **DO NOT** declare SQL foreign keys between tables on the VPS DB and tables on the AWS RDS DB. PostgreSQL cannot enforce cross-instance constraints. Store references as plain UUIDs (e.g., `doctor_id` in `bookings` is a plain `UUID`, not a foreign key).
- ❌ **DO NOT** attempt to wrap cross-database operations in a single database transaction (`BEGIN...COMMIT`).
- ✅ **DO** implement application-level transactional sagas with compensating rollbacks:
  - When booking a slot: First acquire a row-level lock and mark `is_booked = true` on the VPS DB. Then write the `pending` booking on the AWS DB.
  - If the AWS write fails or times out: **immediately execute a compensating write** to unlock the slot on the VPS DB.
  - If compensating rollback fails: push to a Dead-Letter Queue (DLQ) for the hourly `ReconciliationJob`.
- ✅ **DO** keep all patient-identifiable and health-related clinical data in AWS RDS in the **af-south-1 (Cape Town)** region to comply with South African POPIA data residency regulations.

---

## 3. Doctor Identity, LocumStaff SSO & Directory Sync

Doctors enter ChekUp247 through **two distinct paths**:

### Path A: LocumStaff Federated SSO (Primary)
- LocumStaff is an already-built, external source of truth for doctors and shifts.
- Flow is **mobile-app-initiated** (doctor is already signed into the LocumStaff mobile app with their JWT).
- LocumStaff calls `POST /v1/oidc/authorize` and directs the doctor's in-app browser to ChekUp's callback with an authorization code.
- ChekUp backend exchanges the code via `POST /v1/oidc/token` using client credentials + PKCE (`code_verifier`).
- Verification rule:
  - If LocumStaff `status == 'VERIFIED'` → Auto-verify on ChekUp (`verification_status = 'verified'`, `verification_source = 'locumstaff'`).
  - If LocumStaff `status != 'VERIFIED'` → Mark as `verification_status = 'pending'` and alert admin.

### Path B: Direct Registration (Non-LocumStaff Doctors)
- Net-new doctors sign up directly, providing HPCSA registration number and uploading license/ID documents.
- Always start as `verification_status = 'pending'`.
- Must remain invisible in search and blocked from receiving bookings until manually approved by an Admin in the verification queue.

### Directory & Availability Sync
- BullMQ cron runs every 30 minutes calling LocumStaff `GET /v1/partner-directory/doctors`.
- **Photo URLs from LocumStaff are pre-signed with a 1-hour TTL.** ❌ **NEVER** cache LocumStaff photo URLs permanently. Re-fetch or request fresh signed URLs on render.
- Availability windows from LocumStaff (`GET /v1/partner-directory/availability`) represent raw duty shifts. ChekUp's slicing engine **divides these shifts into discrete 30-minute bookable slots with 5-minute buffers**.

---

## 4. Video Consultation Rules (Daily.co)

- Use **Daily.co** via `daily-js` custom call objects. ❌ **DO NOT** use basic iframes or substitute Agora/Twilio.
- **Watermark Logo:** Always render the ChekUp247 logo watermark overlay in the call frame.
- **Session Countdown Timer:** Synchronize the timer against server-side `consultation.started_at`. Display visual warnings at 5 minutes and 1 minute remaining.
- **In-Call Time Extensions (+15, +20, +30 min):**
  - **Initiator:** ONLY the doctor can initiate a time extension.
  - **Availability Check:** Backend MUST verify on the VPS DB that the doctor's next time slot is not booked. If booked, disable/reject extension with `409 Conflict`.
  - **Patient Consent:** An interactive consent modal appears on the patient's screen showing exact cost and card on file.
  - **Payment Auto-Debit:** Upon patient consent, backend charges the patient's vaulted card using the Paystack tokenized authorization. If payment succeeds, extend Daily.co room expiry and broadcast timer extension via WebSocket.
- **Grace Period & No-Shows:**
  - 10-minute grace period from scheduled `start_time`.
  - If doctor fails to join within 10 minutes: mark doctor no-show, issue **100% full refund to patient**, and flag doctor for admin review.
  - If patient fails to join within 10 minutes: mark booking `no_show`, and doctor receives full payout minus platform commission.

---

## 5. E-Prescriptions & Medical Coding Rules

- **Issuance Authority:** ONLY the consulting doctor can issue a prescription, and ONLY after the consultation status transitions to `completed`.
- **Mandatory ICD-10 Code:** Prescriptions MUST include a valid ICD-10 diagnosis code from the South African Master Industry Table. Medical scheme claims in SA are rejected without this. ❌ **NEVER** permit submission without an ICD-10 code.
- **NAPPI Codes:** Use MediKredit NAPPI product codes. If licensing is in progress, use the approved MVP fallback: free-text medication name with an optional manual NAPPI field.
- **Schedule 5 & 6 (S5/S6) Substances:**
  - When an S5 or S6 drug is selected, the form MUST enforce a mandatory `supervision_declaration` text field and display SAHPRA telehealth compliance disclaimers.
  - The prescription record must be flagged for regulatory audit logs.
- **PDF Generation:** Generate tamper-evident PDFs containing doctor HPCSA number, patient details, medications, digital signature, and timestamp. Store in MinIO/R2 and provide signed expiring download URLs.

---

## 6. Financial, Commission & Cancellation Rules

### Commission
- Commission is **global and set by Admin** in `platform_settings.commission_percent`.
- ❌ **DO NOT** allow doctors to override the commission percentage.
- Snapshot `commission_amount` and `price` at booking creation time so historical transactions remain immutable if global rates change later.

### Cancellation & Rescheduling Engine
- **≥ 24 Hours Before Appointment:**
  - Patient can reschedule to any future open slot on the same doctor's calendar at no extra charge.
  - OR patient can cancel for a **100% full refund** to the original payment card.
- **< 24 Hours Before Appointment:**
  - A deduction percentage (set in `platform_settings`, e.g., 30%) is allocated to the doctor as a late cancellation fee.
  - The remaining amount can be chosen by the patient as:
    - **(a) Platform Credits** (stored in `wallet_credits`, **never expire**, can be partially redeemed on future bookings).
    - **(b) Partial Refund** back to the original card.
- **Doctor Cancellation (Any Time):**
  - **100% full refund** to patient immediately. Doctor cancellation count incremented for administrative penalty review.

---

## 7. Multi-Channel Notifications & Preferences

- **Channels Supported:**
  - **Email:** Transactional emails via **Brevo API**.
  - **SMS:** Evaluated local South African gateway or Twilio.
  - **WhatsApp:** WhatsApp Business API with pre-approved Meta message templates.
  - **In-App:** Real-time push via NestJS WebSocket gateway.
- **Patient Preference Rule:** Patients select **1 or 2 preferred channels** in `notification_preferences` (e.g., WhatsApp + Email). System must respect these preferences and only dispatch to selected channels.
- **Automated Reminders:** BullMQ scheduled jobs must fire at **T-24 hours, T-1 hour, and T-15 minutes**. If booking is rescheduled or cancelled, existing delayed jobs must be cancelled.

---

## 8. Compliance & Security (POPIA & HPCSA)

- **POPIA Health Record Audit Logging:** Every read or write of patient health records (consultations, clinical notes, prescriptions, medical history) must trigger an entry in `audit_logs` capturing `{ userId, userRole, patientId, action, ipAddress, userAgent, timestamp }`.
- **Data Encryption:** TLS 1.3 in transit; AES-256 encryption at rest on both Postgres instances and S3/MinIO buckets.
- **Admin Panel Lockdown:** Require multi-factor authentication (MFA) and restrict admin access via corporate IP allowlisting / VPN.
- **Rate Limiting:** Protect all authentication routes (`/auth/*`) with a 5 requests/minute throttle.

---

## 9. Code Quality & Conventions

- **Language & Runtime:** TypeScript everywhere (strict mode enabled).
- **Backend Architecture:** NestJS modular structure (`Controller` -> `Service` -> `Repository/Entity`).
- **DTO Validation:** All incoming requests validated via `class-validator` and `class-transformer` or Zod pipes.
- **Dates & Timezones:**
  - Store all dates in database columns as **UTC timestamps** (`timestamp with time zone`).
  - Perform all business logic comparisons in UTC.
  - Frontend is responsible for converting UTC timestamps to the patient's or doctor's local browser timezone (South Africa Standard Time SAST = UTC+2).
- **Git Commits & PRs:** Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`).

---

## 10. Quick References

- **Full PRD:** [c:\chekup247\docs\PRD.md](file:///c:/chekup247/docs/PRD.md)
- **Sprint Roadmap:** [c:\chekup247\docs\sprints\README.md](file:///c:/chekup247/docs/sprints/README.md)
- **LocumStaff Handover Contract:** [c:\chekup247\chekup-integration-handover.md](file:///c:/chekup247/chekup-integration-handover.md)
- **Technical Dev Spec:** [c:\chekup247\telehealth-platform-dev-spec.md](file:///c:/chekup247/telehealth-platform-dev-spec.md)
