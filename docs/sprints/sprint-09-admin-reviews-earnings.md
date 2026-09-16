# Sprint 9 — Admin Dashboard, Reviews & Doctor Earnings

**Sprint:** 9 of 10  
**Timeline:** Weeks 17–18  
**Total Points:** ~82 ⚠️ (Consider splitting into 9a / 9b)  
**Status:** Completed  
**Prerequisites:** Sprint 8 complete.

---

## 1. Sprint Goal
1. Build the post-consultation **Patient Review & Rating system**, including cross-database rating average synchronization (`AWS reviews` -> `VPS doctor_profiles.rating_avg`).
2. Build the **Doctor Earnings Dashboard** with payout history and commission visibility.
3. Build the full-featured **Admin Panel** on the isolated application domain: analytics charts, financial transaction ledger, booking oversight, audit log viewer, and dispute handling.
4. Implement the mandatory POPIA **Health Record Audit Logging Service**.

---

## 2. Review & Rating Cross-Database Sync

```
[Patient App]
Patient submits review for completed booking (POST /reviews)
        │
        ▼ (Written to AWS RDS)
INSERT INTO reviews (booking_id, patient_id, doctor_id, rating, comment)
        │
        ▼
Triggers BullMQ Job: RatingSyncJob
        │
        ▼
Calculates new average rating and review count from AWS RDS
        │
        ▼ (Updates VPS Postgres)
UPDATE doctor_profiles 
SET rating_avg = :newAverage, review_count = :newCount 
WHERE id = :doctorId;
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-901 | Patient Review Creation & Query APIs (`POST /reviews`, `GET /doctors/:id/reviews`). | 3 | Restricts review submission to completed consultations (one review per booking); returns paginated public reviews for doctor profiles. |
| BE-902 | Cross-DB Doctor Rating Recalculation Worker (`RatingSyncJob`). | 3 | Computes aggregate rating score on AWS RDS; updates `doctor_profiles.rating_avg` on VPS Postgres. |
| BE-903 | Doctor Earnings Computation API (`GET /doctor/earnings`). | 3 | Aggregates completed consultations, net earnings (`price - commission`), pending payout balance, and historical payouts. |
| BE-904 | Admin Platform Analytics API (`GET /admin/analytics`). | 5 | Aggregates total bookings, gross volume, net commission, completed consultations, no-show rate, top medical specialties. |
| BE-905 | Admin Financial Transaction Ledger API (`GET /admin/transactions`). | 3 | Paginated transaction records joining payments, refunds, credits, and payouts with CSV export capability. |
| BE-906 | Admin Booking Oversight API (`GET /admin/bookings`). | 3 | Searchable overview of all platform bookings with status filters (pending, confirmed, completed, cancelled, no_show). |
| BE-907 | **POPIA Audit Logging Service**. | 5 | Intercepts all patient health record access (prescriptions, consultation notes, clinical documents); persists user ID, IP address, resource ID, action, and timestamp to `audit_logs`. |
| BE-908 | Dispute Resolution & Manual Action APIs (`POST /admin/disputes/refund`, `POST /admin/disputes/credit`). | 5 | Allows admins to issue manual refunds or platform credits with mandatory justification notes. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-901 | Post-Consultation Rating & Review Modal. | 3 | Interactive 5-star rating selector with optional text feedback; prompts patient upon next login or on booking detail screen. |
| PA-902 | Doctor Profile Reviews Section. | 2 | Displays average star rating, rating distribution bar, verified patient badges, and reviews list on doctor profiles. |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DP-901 | **Doctor Earnings Dashboard** (`/earnings`). | 5 | KPI summary cards: Total Earned, Available Balance, Commission Deducted, Next Payout Date; earnings chart over time. |
| DP-902 | Consultation Earnings Breakdown Table. | 3 | Itemized table of completed appointments showing patient initial, date, duration, fee, platform commission, and net earning. |
| DP-903 | Doctor Reviews & Feedback Tab. | 2 | View all patient reviews received with star ratings and comments. |

### Admin Panel (Next.js — Isolated Application)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| AP-901 | **Executive Analytics Dashboard** (`/dashboard`). | 8 | Rich visual charts (using Recharts): Gross Volume, Commission Revenue, Booking Trends, Doctor Utilization, Active Patients. |
| AP-902 | **Financial Transaction Ledger View** (`/transactions`). | 5 | Searchable data table with date range picker, payment status filter, and "Export to CSV" button. |
| AP-903 | **All Bookings Management View** (`/bookings`). | 3 | Global booking tracker with search by doctor/patient, status pills, and detail slide-over drawer. |
| AP-904 | **POPIA Audit Log Inspector** (`/audit-logs`). | 5 | High-security view showing access logs to health data; filterable by admin/doctor and patient ID. |
| AP-905 | **Dispute Resolution Workspace** (`/disputes`). | 5 | Manage patient complaints; view consultation timeline and notes; issue manual refunds or credits with audit trail. |

---

## 4. Sprint Split Recommendation
Because Sprint 9 contains **~82 points**, it can be split into:
- **Sprint 9a (Weeks 17–18):** Patient reviews, rating sync, doctor earnings dashboard, and POPIA audit logging.
- **Sprint 9b (Weeks 18–19):** Admin analytics charts, transaction ledger, booking oversight, and dispute management.

---

## 5. Deliverables Checklist
- [x] Patients can rate and review doctors after completed consultations.
- [x] Doctor ratings automatically sync and update on public profiles.
- [x] Doctors have full visibility into earnings and commission breakdowns.
- [x] Admin panel provides complete financial, operational, and dispute oversight.
- [x] POPIA audit logging captures all access to sensitive patient records.

