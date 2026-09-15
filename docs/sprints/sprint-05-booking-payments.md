# Sprint 5 — Booking & Payments (Split-DB Saga)

**Sprint:** 5 of 10  
**Timeline:** Weeks 9–10  
**Total Points:** ~70 ⚠️ (Heavy Sprint)  
**Status:** Complete ✅  
**Prerequisites:** Sprint 4 complete; Paystack merchant account configured.

---

## 1. Sprint Goal
1. Build the critical cross-database Booking Creation Saga with compensating rollback between VPS Postgres and AWS RDS.
2. Integrate Paystack checkout for ZAR payments, supporting card tokenization (Paystack Authorization) for later in-consultation auto-debits.
3. Support platform wallet credit deductions at checkout (full or partial credit payment).
4. Implement automated webhook verification, refund processing, and cross-database reconciliation crons.

---

## 2. Cross-Database Booking Saga Architecture

```
[Step 1: VPS Postgres]
BEGIN TRANSACTION
SELECT * FROM availability_slots WHERE id = :slotId FOR UPDATE;
Verify is_booked == false;
UPDATE availability_slots SET is_booked = true WHERE id = :slotId;
COMMIT;
        │
        ▼ (Proceed to Step 2)
[Step 2: AWS RDS af-south-1]
INSERT INTO bookings (patient_id, doctor_id, slot_id, status='pending', price, ...)
        │
        ├─ SUCCESS ──> Return bookingId to client → Redirect to Paystack
        │
        └─ FAILURE (Network or DB crash)
                │
                ▼ (Compensating Rollback on Step 1)
        UPDATE availability_slots SET is_booked = false WHERE id = :slotId;
        If compensating write fails ──> Push to Dead-Letter Queue (DLQ) for Reconciliation Cron
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-501 | **Booking Creation Saga Orchestrator** (`POST /bookings`). | 13 | Executes atomic slot reservation on VPS, writes booking to AWS RDS, executes compensating rollback if AWS write errors; logs failures to DLQ. |
| BE-502 | Paystack Payment Initiation Service (`POST /payments/initiate`). | 5 | Computes total amount, applies wallet credits, requests Paystack checkout URL with metadata; stores payment authorization intent. |
| BE-503 | Paystack Webhook Handler (`POST /payments/webhook`). | 5 | Cryptographically verifies Paystack signature header; on `charge.success`, updates booking to `confirmed`, locks card authorization token, marks payment as `held`. |
| BE-504 | Card Tokenization & Vaulting logic. | 3 | Extracts and securely persists Paystack `authorization_code`, `card_type`, and `last4` for future authorized time extension charges. |
| BE-505 | Platform Wallet Credit Checkout Service. | 5 | Applies available unexpired credits from `wallet_credits`; deducts credit first, bills remaining balance to Paystack. |
| BE-506 | Cross-Database Booking Queries (`GET /bookings/mine`, `GET /bookings/:id`). | 3 | Application-level stitch: fetches bookings from AWS RDS, enriches with doctor profile from VPS Postgres. |
| BE-507 | Automated Paystack Refund Service (`POST /payments/refund`). | 3 | Executes full or partial refunds via Paystack API with transaction audit logging. |
| BE-508 | Cross-DB Reconciliation Cron (`ReconciliationJob`). | 5 | Runs hourly; scans for orphaned `is_booked = true` slots lacking active bookings, repairs inconsistencies, and alerts Sentry. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-501 | **Booking Checkout Flow** (`/bookings/checkout`). | 5 | Review consultation details (doctor name, date, time, fee), view platform fee breakdown, toggle platform credits switch. |
| PA-502 | Paystack Popup / Redirect Integration. | 5 | Embeds Paystack payment modal; handles successful payment callback and payment rejection errors gracefully. |
| PA-503 | **Booking Confirmation Screen** (`/bookings/success`). | 3 | Displays confirmed appointment details, calendar invite (.ics download), preparation checklist, and "Go to My Bookings" CTA. |
| PA-504 | **My Bookings Dashboard** (`/bookings`). | 5 | Categorized tabs: Upcoming, Past, Cancelled; cards display doctor info, consultation time countdown, and action buttons. |
| PA-505 | **Booking Details View** (`/bookings/:id`). | 3 | Complete breakdown of booking, payment receipt, cancellation button, and dynamic "Join Consultation" button (activated 5 min prior). |
| PA-506 | **Patient Wallet View** (`/wallet`). | 3 | Displays active credit balance, transaction ledger of credits earned from cancellations and credits used. |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DP-501 | **Upcoming Consultations Queue** (`/appointments`). | 3 | Displays today's upcoming appointments and schedule; patient name, time, and quick action buttons. |
| DP-502 | Appointment Details Modal. | 2 | View patient details, consultation fee, appointment status, and link to start the consultation. |

---

## 4. Deliverables Checklist
- [x] Patient can book an open slot and pay via Paystack in ZAR.
- [x] Cross-DB Saga reliably handles slot locking, booking creation, and rollbacks.
- [x] Card authorization token is saved for subsequent time extension charges.
- [x] Platform credits can be applied toward booking costs.
- [x] Reconciliation cron detects and corrects any database drift.
