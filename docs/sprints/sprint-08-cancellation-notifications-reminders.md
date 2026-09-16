# Sprint 8 — Cancellation, Notifications & Reminders

**Sprint:** 8 of 10  
**Timeline:** Weeks 15–16  
**Total Points:** ~70 ⚠️ (Heavy Sprint)  
**Status:** Ready for Backlog Grooming  
**Prerequisites:** Sprint 7 complete; Brevo account verified; SMS gateway evaluated; WhatsApp Business API application submitted.

---

## 1. Sprint Goal
1. Implement the **24-hour Cancellation & Reschedule Engine** with partial deduction and platform credit issuance.
2. Implement **Multi-Channel Notification Dispatcher**: Email via Brevo, SMS via local SA gateway or Twilio, WhatsApp via Meta Business API, and in-app notifications via WebSockets.
3. Support patient notification preferences (selecting 1 or 2 preferred channels).
4. Automate scheduled consultation reminders at T-24 hours, T-1 hour, and T-15 minutes via BullMQ delayed jobs.

---

## 2. Cancellation & Deduction Policy Matrix

```
[Patient Initiates Cancellation / Reschedule]
                  │
                  ▼
          Is start_time >= 24 Hours away?
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
    [YES: >= 24h]       [NO: < 24h]
        │                   │
        ├─ Option A:        ├─ Calculate configured deduction % (e.g., 30%)
        │  Reschedule       │  allocated to Doctor
        │  to another open  │
        │  slot (no fee)    └─ Patient chooses remainder (70%):
        │                            │
        └─ Option B:                 ├─ Option A: 100% Platform Credit
           100% Refund               │  (Never expires, stored in wallet_credits)
           to original               │
           payment card              └─ Option B: Cash Refund to original card
                                        (minus deduction)
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-801 | Cancellation Logic & Policy Engine (`POST /bookings/:id/cancel`). | 5 | Computes >=24h vs <24h rules; allocates penalty deduction to doctor; executes refund or credit issuance; reopens availability slot on VPS. |
| BE-802 | Appointment Rescheduling API (`POST /bookings/:id/reschedule`). | 5 | Validates new slot is open; atomically swaps slot reference; updates Daily.co room timestamps; preserves payment record. |
| BE-803 | Platform Credit Management Service. | 5 | Manages `wallet_credits` table on AWS RDS; credits never expire; supports partial redemption at checkout; maintains audit history. |
| BE-804 | **Brevo Transactional Email Integration**. | 5 | HTML responsive email templates for booking confirmations, reminders, cancellations, receipts, and prescription downloads. |
| BE-805 | **SMS Gateway Integration** (Local SA provider / Twilio). | 5 | Connects to evaluated SMS provider; dispatches concise SMS alerts for booking confirmations and short-notice reminders. |
| BE-806 | **WhatsApp Business API Integration**. | 8 | Dispatches pre-approved Meta message templates for appointment reminders with interactive "Join Call" and "View Details" buttons. |
| BE-807 | Patient Channel Preference Enforcement Service. | 3 | Checks `notification_preferences` and dispatches alerts strictly to patient's 1 or 2 chosen channels. |
| BE-808 | **Automated Reminder Scheduler** (`ReminderJob`). | 5 | BullMQ delayed jobs scheduled upon booking confirmation for T-24h, T-1h, and T-15m; automatically cancelled if booking is cancelled. |
| BE-809 | In-App Notification Center API (`GET /notifications`, `POST /notifications/:id/read`). | 3 | Unread notification count; real-time event broadcasting via WebSocket. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-801 | **Cancellation Dialog & Flow**. | 5 | Dynamic modal: if >=24h, presents choice of "Reschedule" or "Full Refund"; if <24h, displays deduction penalty and radio selection between "Platform Credit" and "Partial Card Refund". |
| PA-802 | **Reschedule Calendar Modal**. | 3 | Opens doctor's calendar, allows patient to select a replacement slot, and confirms slot swap without extra payment. |
| PA-803 | **In-App Notification Center Bell & Dropdown**. | 5 | Notification icon with badge counter in header; dropdown displaying recent alerts with unread dot, timestamps, and deep links. |
| PA-804 | Notification Preferences Settings Tab (`/settings/notifications`). | 2 | Interactive switches allowing patient to toggle channels (Email, SMS, WhatsApp) with maximum 2-channel limit. |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DP-801 | In-app notification center for doctor events. | 3 | Doctor receives alerts when appointments are booked, rescheduled, or cancelled (including penalty credit notification). |
| DP-802 | Cancelled appointment badge on calendar. | 2 | Calendar displays cancelled slots clearly with tooltip showing reason and earned cancellation fee. |

### Admin Panel (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| AP-801 | Platform Settings Management (`/settings`). | 3 | Admin can update global `commission_percent`, short-notice cancellation deduction %, and default consult duration. |

---

## 4. Deliverables Checklist
- [x] Patient can cancel or reschedule bookings with proper 24h threshold enforcement.
- [x] Platform credits are generated, tracked, and never expire.
- [x] Brevo delivers responsive transactional emails for all system events.
- [x] Automated reminders trigger at 24h, 1h, and 15m prior to consultation.
- [x] In-app notification center provides real-time alerts across patient and doctor apps.
