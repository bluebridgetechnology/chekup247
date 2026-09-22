# ChekUp247 — Comprehensive Manual QA Testing Checklist

This document provides a production-grade, end-to-end manual quality assurance (QA) test plan for the ChekUp247 Telehealth Platform. It maps directly to the deliverables across **Sprints 1 through 10**.

---

## 1. QA Test Environment Setup

### 1.1 Local Infrastructure
Ensure Docker containers and environment variables are active before testing:
```bash
# 1. Start core dependencies (VPS Postgres, AWS RDS Postgres simulation, Redis, MinIO)
npm run docker:up

# 2. Launch backend API (port 4000)
npm run dev:api

# 3. Launch frontend applications
npm run dev:patient   # http://localhost:3000 (Patient App)
npm run dev:doctor    # http://localhost:3001 (Doctor Portal)
npm run dev:admin     # http://localhost:3002 (Admin Panel)
```

### 1.2 Test Personas & Seed Accounts

| Persona | Role | Email | Password | Characteristics |
|---|---|---|---|---|
| **Sarah Patient** | `patient` | `sarah.patient@example.co.za` | `Patient@12345!` | Active patient with wallet credit balance |
| **Dr. Thabo Molefe** | `doctor` | `dr.molefe@chekup247.com` | `Doctor@12345!` | Verified GP, HPCSA: `MP 0689432`, Rate: R800/hr |
| **Dr. Elena Rostova** | `doctor` | `dr.rostova@direct.co.za` | `Doctor@12345!` | Direct applicant, pending HPCSA verification |
| **Platform Superadmin** | `admin` | `admin@chekup247.com` | `Admin@Secure2026!` | Superadmin with full access to audit & disputes |

---

## 2. Sprint-by-Sprint QA Test Matrix

### Sprint 1: Foundation, Infrastructure & Health
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-101** | Dual Database Connectivity | API is running | Send `GET /health/ready` | Returns HTTP 200 with `vpsPostgres: "ok"`, `awsRds: "ok"`, `redis: "ok"` | [ ] Pass / [ ] Fail |
| **QA-102** | MinIO / R2 Object Storage | Storage service initialized | Request signed upload URL for doctor document (`POST /storage/upload-url`) | Returns a valid presigned S3/MinIO PUT URL with mime-type restriction | [ ] Pass / [ ] Fail |
| **QA-103** | Error Interceptor & JSON Logging | API running | Call non-existent endpoint `GET /invalid-path` | Standardized JSON payload: `{ statusCode: 404, message: "...", timestamp, path }` | [ ] Pass / [ ] Fail |

---

### Sprint 2: Authentication & Identity
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-201** | Patient Email Registration | Logged out on Patient App | Navigate to `/register`. Submit valid South African details. | Account created, verification email dispatched via Brevo, redirected to `/verify-email` | [ ] Pass / [ ] Fail |
| **QA-202** | Patient Login & Session | Registered patient | Go to `/login`, enter credentials, click "Sign In" | Session cookie set; user redirected to `/doctors` or `/bookings` | [ ] Pass / [ ] Fail |
| **QA-203** | LocumStaff SSO Handshake | Doctor Portal open | Navigate to `/callback?code=mock_code&state=xyz` | Backend exchanges PKCE token, matches or provisions doctor, logs in doctor | [ ] Pass / [ ] Fail |
| **QA-204** | Direct Doctor Onboarding | Logged out on Doctor Portal | Navigate to `/register`. Complete 4-step wizard with HPCSA ID and document upload | Doctor profile created with status `pending`. Restricted dashboard shown | [ ] Pass / [ ] Fail |
| **QA-205** | Admin Login Isolation | Admin Panel open | Navigate to `/login` on port 3002. Login with `admin@chekup247.com` | Admin session established. Patient/Doctor credentials rejected on this domain | [ ] Pass / [ ] Fail |
| **QA-206** | RBAC Guard Enforcement | Logged in as Patient | Attempt to access `GET /admin/analytics` with patient JWT | Intercepted with HTTP 403 Forbidden | [ ] Pass / [ ] Fail |

---

### Sprint 3: Doctor Management, Directory & Verification
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-301** | Doctor Directory Filters | Patient on `/doctors` | 1. Filter by specialty "General Practitioner".<br>2. Move price slider.<br>3. Search by name "Molefe" | Directory updates dynamically; only matching verified doctors render | [ ] Pass / [ ] Fail |
| **QA-302** | Doctor Profile Page (SSR) | Verified doctor exists | Click doctor card or visit `/doctors/dr-thabo-molefe` | Full bio, HPCSA badge, hourly fee, rating, reviews list, and calendar picker render | [ ] Pass / [ ] Fail |
| **QA-303** | SEO & Schema Verification | On doctor profile | View page source (`Ctrl+U`) | JSON-LD schema with `"@type": "Physician"`, OpenGraph tags, and canonical URL present | [ ] Pass / [ ] Fail |
| **QA-304** | Admin Doctor Verification | Pending doctor submitted (QA-204) | In Admin Panel, open `/doctors/verification` or `/verifications`. Inspect documents and click "Approve" | Status updates to `verified`. Doctor receives approval email. Profile now appears on directory | [ ] Pass / [ ] Fail |
| **QA-305** | Admin Doctor Rejection | Another pending doctor | Click "Reject" and provide rejection note | Status changes to `rejected`. Doctor notified with justification reason | [ ] Pass / [ ] Fail |
| **QA-306** | ICD-10 Master Table Search | On medical search API | Typeahead query `GET /medical/icd10?q=bronchitis` | Returns matching SA DoH ICD-10 codes (e.g. `J20.9 Acute bronchitis, unspecified`) | [ ] Pass / [ ] Fail |

---

### Sprint 4: Availability & Calendar Management
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-401** | Doctor Create Slots | Logged into Doctor Portal | Go to `/calendar`. Click "Add Availability". Select recurring Monday/Wednesday slots (08:00 - 12:00) | Discrete 30-min slots generated with 5-min buffers; appear green on calendar | [ ] Pass / [ ] Fail |
| **QA-402** | Conflict Prevention | Slot exists at 09:00 | Try adding an overlapping slot at 09:15 | Validator blocks action: "Slot overlaps with existing availability" | [ ] Pass / [ ] Fail |
| **QA-403** | Doctor Blackout / Out of Office | Active slots exist | Set blackout range for next week | Unbooked slots within the date range are cleared | [ ] Pass / [ ] Fail |
| **QA-404** | LocumStaff Synced Shift Indicator | Synced shift present | View synced shift on calendar | Shift has "Synced from LocumStaff" badge; editing is locked | [ ] Pass / [ ] Fail |
| **QA-405** | Patient Booking Slot Picker | On doctor profile | View date picker and click a date | Available time chips display in patient local timezone | [ ] Pass / [ ] Fail |

---

### Sprint 5: Booking Saga & Paystack Payments
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-501** | Cross-DB Booking Saga Lock | Patient on checkout | Select a slot and proceed to `/bookings/checkout`. Click "Confirm & Pay" | Step 1 locks slot on VPS (`is_booked = true`). Step 2 writes pending booking on AWS RDS | [ ] Pass / [ ] Fail |
| **QA-502** | Compensating Rollback | Simulate RDS write failure | Inject mock RDS error during booking creation | Slot lock on VPS Postgres is automatically reverted (`is_booked = false`) | [ ] Pass / [ ] Fail |
| **QA-503** | Paystack Checkout Integration | On `/bookings/checkout` | Pay with Paystack test card (`4084 0840 0000 4081`) | Paystack modal handles payment; webhook confirms booking; redirected to `/bookings/success` | [ ] Pass / [ ] Fail |
| **QA-504** | Card Tokenization | Booking confirmed | Inspect database record for payment | Paystack `authorization_code`, card type, and `last4` vaulted for time extensions | [ ] Pass / [ ] Fail |
| **QA-505** | Platform Wallet Credit Checkout | Patient has R200 wallet credit | At checkout, toggle "Apply Wallet Credits (R200)" | Total is discounted; wallet balance debited; remainder billed via Paystack | [ ] Pass / [ ] Fail |
| **QA-506** | My Bookings Dashboard | Confirmed booking | Open `/bookings` on Patient App | Booking visible under "Upcoming" tab with countdown and "Join Consultation" button | [ ] Pass / [ ] Fail |

---

### Sprint 6: Daily.co Video Consultation Core
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-601** | Waiting Room & Hardware Check | Booking within 5 mins of start | Patient and Doctor visit consultation link | Camera and mic preview work; status shows waiting for other party | [ ] Pass / [ ] Fail |
| **QA-602** | Dual Video Join & Watermark | Both parties click "Join" | Doctor and Patient connect in call | High-definition WebRTC video feed connects; ChekUp247 logo watermark visible | [ ] Pass / [ ] Fail |
| **QA-603** | Synchronized Countdown Timer | Call in progress | Check header timer on both screens | Timer ticks down simultaneously in real time; turns amber at 5 min, red pulsing at 1 min | [ ] Pass / [ ] Fail |
| **QA-604** | Background Blur / Virtual BG | Call in progress | Click "Blur Background" in controls | Video stream applies background blur without video dropout | [ ] Pass / [ ] Fail |
| **QA-605** | Clinical Notes Auto-Save | Doctor on workspace | Type clinical notes in right sidebar | Auto-saves every 30s; "Notes saved" indicator confirms persistence | [ ] Pass / [ ] Fail |
| **QA-606** | Automated No-Show Policy | Doctor or Patient fails to join after 10 mins | Let 10 minutes elapse without join | BullMQ No-Show job fires. If doctor absent: auto-refund to patient. If patient absent: doctor paid | [ ] Pass / [ ] Fail |

---

### Sprint 7: Time Extensions & E-Prescriptions
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-701** | In-Call Time Extension Request | Active call, doctor workspace | Doctor clicks "+15 min" button | API checks next slot. If free, sends WebSocket `extension_requested` to patient | [ ] Pass / [ ] Fail |
| **QA-702** | Patient Consent Modal | Extension requested | Patient views floating modal with cost (e.g. R200) and 60-second countdown | Patient clicks "Approve & Pay". Vaulted card auto-debited via Paystack | [ ] Pass / [ ] Fail |
| **QA-703** | Dynamic Timer Extension | Payment succeeds | Observe call timers on both screens | Daily.co room expiry extended; both countdown timers increase by +15 minutes | [ ] Pass / [ ] Fail |
| **QA-704** | E-Prescription Form | Call ended by Doctor | Doctor redirected to `/consultations/:id/prescribe` | Doctor selects ICD-10 code (`J20.9`), adds medication items, dosage, frequency | [ ] Pass / [ ] Fail |
| **QA-705** | Schedule 5/6 Supervision Check | Prescribing S5 medication | Select Schedule 5 medication | Modal blocks until doctor confirms supervision compliance declaration | [ ] Pass / [ ] Fail |
| **QA-706** | PDF Generation & Patient Download | Doctor signs & submits Rx | 1. Doctor submits prescription.<br>2. Patient visits `/prescriptions` | Tamper-evident PDF generated with HPCSA number, digital seal; patient downloads PDF | [ ] Pass / [ ] Fail |

---

### Sprint 8: Cancellations, Rescheduling & Notifications
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-801** | Cancellation >= 24 Hours | Booking is 3 days away | Patient clicks "Cancel Appointment" | Modal offers: (A) Free Reschedule or (B) 100% Refund to original card | [ ] Pass / [ ] Fail |
| **QA-802** | Cancellation < 24 Hours | Booking is 4 hours away | Patient clicks "Cancel Appointment" | Modal shows 30% deduction penalty to doctor; patient picks remainder as Wallet Credit or Partial Refund | [ ] Pass / [ ] Fail |
| **QA-803** | Reschedule Flow | Patient chooses reschedule | Select alternative slot from doctor calendar | Slot swapped atomically; confirmation updated without additional payment | [ ] Pass / [ ] Fail |
| **QA-804** | Brevo Transactional Email | Any booking event | Check Brevo logs / recipient inbox | Responsive HTML email delivered for booking confirmation, receipt, or cancellation | [ ] Pass / [ ] Fail |
| **QA-805** | Notification Preferences | Patient on `/settings/notifications` | Toggle channels (Email, SMS, WhatsApp) | Strictly max 2 channels allowed; notifications route only to selected channels | [ ] Pass / [ ] Fail |
| **QA-806** | In-App Notification Bell | Event occurs | View notification bell in header | Badge counter increments; clicking displays dropdown with deep links | [ ] Pass / [ ] Fail |

---

### Sprint 9: Admin Dashboard, Reviews & Doctor Earnings
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-901** | Post-Consultation Review | Completed consultation | Patient logs in or visits booking | Rating modal appears: submit 5 stars + review comment | [ ] Pass / [ ] Fail |
| **QA-902** | Cross-DB Rating Sync | Review submitted (QA-901) | Check doctor public profile | `RatingSyncJob` computes new average on AWS RDS and updates `rating_avg` on VPS Postgres | [ ] Pass / [ ] Fail |
| **QA-903** | Doctor Earnings Dashboard | Consultations completed | Doctor visits `/earnings` | KPI cards show Total Earned, Available Balance, Platform Commission deducted | [ ] Pass / [ ] Fail |
| **QA-904** | Admin Analytics Dashboard | Admin logged in | Visit Admin Panel `/` or `/dashboard` | Recharts display Gross Volume, Commission, Booking Trends, Utilization | [ ] Pass / [ ] Fail |
| **QA-905** | Financial Transaction Ledger | Admin Panel `/transactions` | Filter by date / status; click "Export to CSV" | CSV file downloads with complete payment, refund, credit, and payout data | [ ] Pass / [ ] Fail |
| **QA-906** | POPIA Audit Log Inspector | Admin Panel `/audit-logs` | Query access logs for sensitive records | Full audit trail visible (user ID, IP address, resource ID, action, timestamp) | [ ] Pass / [ ] Fail |
| **QA-907** | Dispute Resolution Workspace | Admin Panel `/disputes` | Select dispute, click "Issue Full Refund" with note | Paystack refund or wallet credit dispatched; case logged with admin notes | [ ] Pass / [ ] Fail |

---

### Sprint 10: Public Pages, Polish, Security & Launch Prep
| Test ID | Area | Preconditions | Test Steps | Expected Result | Status |
|---|---|---|---|---|---|
| **QA-1001** | Public Marketing Pages | Any browser | Visit `/`, `/how-it-works`, `/for-doctors`, `/pricing`, `/about`, `/faq`, `/contact` | All pages render beautifully; responsive on mobile (375px) and desktop; contact form works | [ ] Pass / [ ] Fail |
| **QA-1002** | FAQ Interactive Accordion | On `/faq` | Type in search bar; click questions | Instant accordion filter works; questions expand/collapse smoothly | [ ] Pass / [ ] Fail |
| **QA-1003** | SEO Sitemap & Robots | On Patient App | Visit `/sitemap.xml` and `/robots.txt` | Valid XML sitemap with all public URLs; valid robots.txt directives | [ ] Pass / [ ] Fail |
| **QA-1004** | Branded 404 & Error Boundaries | Any app | Visit `/non-existent-page` or trigger mock error | Branded, helpful 404/error screen renders with "Return Home" CTA | [ ] Pass / [ ] Fail |
| **QA-1005** | Auth Rate Limiting | API running | Submit 6 rapid failed login requests within 1 minute | 6th attempt rejected with HTTP 429 Too Many Requests (`Retry-After` header set) | [ ] Pass / [ ] Fail |
| **QA-1006** | Admin IP Allowlist Lockdown | In production mode (`NODE_ENV=production`) | Set `ADMIN_IP_ALLOWLIST=10.0.0.1` and connect from unauthorized IP | Access to Admin endpoints blocked with HTTP 403 Forbidden | [ ] Pass / [ ] Fail |
| **QA-1007** | Automated DB Backup Script | In terminal | Run `./scripts/backup-db.sh` or `backup-db.ps1` | Creates gzip compressed pg_dump archives of VPS Postgres and AWS RDS | [ ] Pass / [ ] Fail |

---

## 3. Post-QA Sign-Off Sheet

| Role | Name | Signature | Date | Decision (Go / No-Go) |
|---|---|---|---|---|
| **Lead QA Engineer** | ____________________ | ____________________ | ____________ | [ ] Go / [ ] No-Go |
| **Product Manager** | ____________________ | ____________________ | ____________ | [ ] Go / [ ] No-Go |
| **Engineering Lead** | ____________________ | ____________________ | ____________ | [ ] Go / [ ] No-Go |

---

## 4. Pre-Deployment & Production Go-Live Checklist

- [ ] **Daily.co Subdomain Switch**: Update `DAILY_DOMAIN` in production `.env` from local/default (`chekup247`) to your registered live Daily.co domain.
- [ ] **Daily.co Production API Key**: Update `DAILY_API_KEY` in production environment with the live Daily.co API key.
- [ ] **WebRTC HTTPS Enforcement**: Ensure SSL/TLS certificates are active on all domains. WebRTC media streams (audio, video, virtual blur) strictly require HTTPS in production browsers.
- [ ] **Paystack Live Keys**: Swap `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` from test keys (`sk_test_*`) to South African live production keys.
- [ ] **Production Gateway Credentials**: Ensure live credentials are configured for SMSPortal (`SMSPORTAL_API_KEY`, `SMSPORTAL_API_SECRET`) and Brevo (`BREVO_API_KEY`).
- [ ] **Database SSL & Secrets**: Set `OPERATIONAL_DB_SSL=true` and `PATIENT_DB_SSL=true` on production PostgreSQL connections.

