# Sprint 6 — Video Consultation (Daily.co Core)

**Sprint:** 6 of 10  
**Timeline:** Weeks 11–12  
**Total Points:** ~58  
**Status:** Completed  
**Prerequisites:** Sprint 5 complete; Daily.co API key and domain configured.

---

## 1. Sprint Goal
1. Implement real-time video consultation infrastructure using Daily.co custom call objects (not plain iframes).
2. Deliver custom video interface features: platform logo overlay, synchronized countdown timer with 5-min and 1-min warnings, background blur, and virtual background selection.
3. Build consultation lifecycle tracking (`started_at`, `ended_at`, `status = completed`) with WebSocket state synchronization.
4. Implement automated 10-minute grace period and no-show detection logic with automated patient refunds.

---

## 2. Consultation Lifecycle State Machine

```
   [Booking Confirmed]
          │  (Daily.co room created with expiration)
          ▼
   [Waiting Room] (Join button active T-5 minutes)
          │  (First participant joins)
          ▼
   [In Consultation] (started_at stamped, countdown timer starts)
          │
          ├─► [Timer Warning] (5 min & 1 min remaining alerts)
          │
          ├─► [Ended by Doctor] ─────────────► [Completed] ──> Proceed to E-Prescription
          │
          └─► [No-Show Detected] (10 min grace elapsed)
                   │
                   ├─ Doctor No-Show ────────► Auto-refund patient + flag doctor
                   └─ Patient No-Show ───────► Doctor paid + booking marked no_show
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-601 | Daily.co Room Provisioning Service. | 3 | Calls Daily.co REST API upon booking confirmation; creates private room with 2-participant limit, exp-timestamp (slot end + 15 min buffer). |
| BE-602 | Consultation lifecycle management APIs (`POST /consultations/:bookingId/join`, `POST /consultations/:bookingId/end`). | 5 | St लॉ started_at when first participant joins; ends consultation, updates status to `completed`, and kicks off prescription eligibility. |
| BE-603 | Real-time WebSocket Gateway (`ConsultationGateway`). | 8 | Uses NestJS WebSockets/Socket.io; tracks participant presence (`patient_joined`, `doctor_joined`), transmits timer synchronization, and triggers disconnect events. |
| BE-604 | Automated No-Show Detection Worker (`NoShowDetectionJob`). | 3 | BullMQ job runs 10 min after slot start; verifies if consultation started. If doctor missed: full refund to patient, flags doctor; if patient missed: doctor is paid. |
| BE-605 | Doctor clinical consultation notes API (`PUT /consultations/:id/notes`). | 3 | Securely persists doctor's private clinical notes to AWS RDS. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-601 | **Patient Consultation Call Screen** (`/consultations/:bookingId`). | 8 | Integrated `daily-js` custom call object; full-screen responsive video tile, participant audio/video controls, device selection drawer (mic/camera). |
| PA-602 | **Platform Logo Watermark Overlay**. | 2 | Crisp ChekUp247 logo watermark rendered in the top corner of the call frame. |
| PA-603 | **Session Countdown Timer Component**. | 5 | Synchronized against server `started_at`; counts down remaining minutes/seconds; changes color to amber at 5 min and red pulsing at 1 min. |
| PA-604 | **Background Blur Toggle**. | 2 | Native Daily.co video processor integration (`setInputSettings({ video: { processor: { type: 'background-blur' } } })`). |
| PA-605 | Pre-call Waiting Room Screen. | 3 | Hardware check (camera/mic preview); displays "Waiting for Dr. [Name] to join" with animated pulse indicator. |
| PA-606 | Consultation Completion Screen. | 2 | Displayed when call concludes; summarizes duration and informs patient that prescription (if issued) will appear shortly. |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DP-601 | **Doctor Consultation Workspace** (`/consultations/:bookingId`). | 8 | Two-column desktop view: video call panel on left (65% width) and real-time clinical notes panel on right (35% width). |
| DP-602 | Real-time clinical notes editor with auto-save. | 3 | Textarea with auto-saving indicator; persists notes every 30 seconds to the backend. |
| DP-603 | Virtual background switcher and background blur controls. | 3 | Doctors can toggle blur or select clean virtual clinic backgrounds from platform presets. |
| DP-604 | "End Consultation" confirmation dialog. | 2 | Doctor clicks "End Consultation"; confirms prompt; ends Daily.co session for all participants and redirects doctor to prescription builder. |

---

## 4. Deliverables Checklist
- [x] Branded video call works seamlessly between doctor and patient on desktop and mobile browsers.
- [x] Platform logo watermark is visible on the video feed.
- [x] Countdown timer accurately synchronizes with server-side start time.
- [x] Background blur operates reliably on compatible devices.
- [x] No-show cron handles doctor and patient no-shows according to policy.
