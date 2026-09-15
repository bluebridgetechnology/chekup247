# Sprint 7 — Time Extensions & E-Prescriptions

**Sprint:** 7 of 10  
**Timeline:** Weeks 13–14  
**Total Points:** ~65  
**Status:** Ready for Backlog Grooming  
**Prerequisites:** Sprint 6 complete; Paystack tokenized authorization available from Sprint 5; ICD-10 table indexed.

---

## 1. Sprint Goal
1. Implement in-call **consultation time extensions** (+15, +20, +30 mins): initiated by the doctor, approved via live consent modal by the patient, and auto-debited via Paystack tokenized card.
2. Build the **E-Prescription Builder** for doctors: typeahead ICD-10 diagnosis code selection, medication scheduling (S1–S6), and mandatory supervision declarations for Schedule 5 & 6 substances.
3. Build the automated PDF generation service, storing valid signed e-prescriptions in object storage (MinIO/R2).

---

## 2. In-Call Time Extension Architecture

```
[Doctor Portal (In-Call)]
Doctor clicks "+15 min" (Calculates cost: R150)
        │
        ▼ (POST /consultations/:id/extend)
Backend checks VPS availability: Is doctor's next slot open?
        │
        ├─ Next slot booked ──> Rejects with 409 Conflict ("Next slot is booked")
        │
        └─ Slot free ──────────> Emits WebSocket event: 'extension_requested'
                                        │
                                        ▼
                                [Patient App (In-Call)]
                        Modal appears: "Dr. requests +15 min (R150). Approve?"
                                        │
                        ┌───────────────┴───────────────┐
                        ▼                               ▼
                 [Patient Approves]             [Patient Declines]
                        │                               │
                        ▼                               ▼
            POST .../extend/consent           Emits 'extension_declined'
                        │                               │
                        ▼                               ▼
      Backend executes Paystack Tokenized Charge    Timer unchanged
                        │
                        ├─ Charge Fails ──> Notify both: "Payment Failed"
                        │
                        └─ Charge Succeeds:
                             1. Record in consultation_extensions
                             2. Extend Daily.co room expiry
                             3. Broadcast 'extension_confirmed'
                             4. Both countdown timers extend +15m!
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-701 | **In-Call Time Extension Orchestrator** (`POST /consultations/:id/extend`, `POST /consultations/:id/extend/consent`). | 13 | Verifies next slot availability on VPS; coordinates patient consent via WebSocket; executes auto-debit charge using vaulted Paystack authorization token; updates Daily.co room expiration. |
| BE-702 | E-Prescription Creation Service (`POST /prescriptions`). | 5 | Restricts issuance strictly to consulting doctor after consultation status is `completed`; validates mandatory fields (ICD-10 code, medication items, NAPPI code/free-text). |
| BE-703 | Schedule 5 & 6 Compliance Enforcement. | 3 | Validates presence of `supervision_declaration` when any item has `schedule_flag >= S5`; marks prescription record for audit review. |
| BE-704 | ICD-10 Diagnosis Search API (`GET /medical/icd10`). | 2 | High-performance full-text search against imported South African ICD-10 MIT table. |
| BE-705 | Medication Database Search API (`GET /medical/medications`). | 3 | Searches MediKredit NAPPI data if licensed, or falls back to free-text with optional NAPPI code input. |
| BE-706 | E-Prescription PDF Generation Service (Puppeteer / HTML templating). | 5 | Generates tamper-evident PDF with doctor details, HPCSA registration number, patient info, medications, ICD-10 code, timestamp, and ChekUp247 digital verification seal. |
| BE-707 | PDF Storage & Notification Trigger. | 2 | Uploads generated PDF to MinIO/R2; updates `prescriptions.pdf_url`; dispatches notification event to BullMQ queue. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-701 | **Time Extension In-Call Consent Modal**. | 5 | Non-intrusive floating dialog over video call; displays requested time (+15/20/30 min), exact cost, and payment card on file; includes 60-second countdown before auto-dismissal. |
| PA-702 | Dynamic countdown timer extension handler. | 2 | Listens for WebSocket `extension_confirmed` event; smoothly extends timer on the fly with animated indicator. |
| PA-703 | **My Prescriptions View** (`/prescriptions`). | 3 | Chronological list of issued prescriptions; displays doctor name, date, diagnosis summary, and "Download PDF" button. |
| PA-704 | In-app prescription readiness notification banner. | 2 | Real-time toast and notification entry appearing when doctor finalizes the prescription. |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DP-701 | **Time Extension Control Bar** (In-Call). | 5 | Dedicated widget showing "+15 min", "+20 min", "+30 min" buttons; displays cost calculation; shows "Awaiting patient consent..." spinner with cancel option. |
| DP-702 | **E-Prescription Builder Form** (`/consultations/:id/prescribe`). | 8 | Form fields: ICD-10 typeahead dropdown, medication repeater (medication name, dosage, frequency, duration, special instructions, schedule classification S1–S6). |
| DP-703 | Schedule 5 & 6 Supervision Declaration Modal. | 2 | Triggered when S5/S6 medicine is selected; requires doctor to confirm telehealth supervision compliance before proceeding. |
| DP-704 | Prescription Preview & Issuance Screen. | 2 | Doctor reviews formatted prescription preview before applying digital signature and issuing. |

---

## 4. Deliverables Checklist
- [ ] Doctor can initiate time extension; patient sees modal and consents; card auto-debited; timer extends.
- [ ] Post-consultation prescription form enforces ICD-10 and South African medical regulations.
- [ ] Schedule 5 & 6 prescriptions strictly require supervision declarations.
- [ ] E-Prescription PDF generated, stored, and downloadable by patient.
