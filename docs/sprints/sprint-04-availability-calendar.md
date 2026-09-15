# Sprint 4 — Availability & Calendar System

**Sprint:** 4 of 10  
**Timeline:** Weeks 7–8  
**Total Points:** ~46  
**Status:** Complete  
**Prerequisites:** Sprint 3 complete; LocumStaff Partner Directory Availability API available.

---

## 1. Sprint Goal
1. Automatically synchronize confirmed duty windows from LocumStaff's Availability API (`GET /v1/partner-directory/availability`).
2. Implement slot generation logic that divides raw shifts into discrete, bookable appointment slots (e.g., 30-min duration with 5-min buffer).
3. Enable direct doctors to create custom, recurring weekly availability and block unworked hours/holidays.
4. Deliver interactive calendar widgets on both the Patient App (booking picker) and Doctor Portal (schedule manager).

---

## 2. Availability Generation & Slicing Logic

```
LocumStaff Availability Feed
(Raw Window: 08:00 - 16:00, virtual=true)
        │
        ▼
ChekUp Slot Slicing Engine (Config: 30m slot, 5m buffer)
        │
        ▼
Generates discrete records in availability_slots:
  - Slot 1: 08:00 - 08:30 (is_booked=false, source='locumstaff')
  - Buffer: 08:30 - 08:35
  - Slot 2: 08:35 - 09:05 (is_booked=false, source='locumstaff')
  - ...
  - Slot N: 15:25 - 15:55 (is_booked=false, source='locumstaff')
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria | Status |
|---|---|---|---|---|
| BE-401 | LocumStaff Availability Sync Worker (`AvailabilitySyncJob`). | 8 | Queries `GET /v1/partner-directory/availability`; filters for `virtual = true`; converts duty windows into discrete slots based on platform configuration. | Complete |
| BE-402 | Direct doctor availability CRUD APIs. | 5 | Endpoints: `POST /doctors/availability` (create single/recurring slots), `DELETE /doctors/availability/:id` (delete unbooked future slot). | Complete |
| BE-403 | Public doctor availability query API (`GET /doctors/:id/availability`). | 3 | Accepts `startDate` and `endDate`; filters out past slots and already booked slots; returns all timestamps normalized in UTC. | Complete |
| BE-404 | Slot overlap and conflict prevention validator. | 2 | Ensures doctors cannot generate overlapping availability slots across multiple entries. | Complete |
| BE-405 | Doctor holiday and blackout date management. | 3 | Doctors can mark date ranges as unavailable; system cancels unbooked slots and prevents auto-slicing during blackout periods. | Complete |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria | Status |
|---|---|---|---|---|
| PA-401 | Interactive booking calendar component on doctor profile (`/doctors/:slug`). | 5 | Day/week view; highlights days with open slots; displays available time chips converted to patient's local browser timezone. | Complete |
| PA-402 | Slot selection interaction state. | 2 | Patient selects an available time slot chip; displays summary preview (date, time, consultation fee) with "Proceed to Booking" CTA. | Complete |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria | Status |
|---|---|---|---|---|
| DP-401 | **Doctor Calendar Management View** (`/calendar`). | 8 | Comprehensive interactive calendar displaying available slots (green), booked consultations (blue), and past shifts. | Complete |
| DP-402 | Single and recurring slot creation modal. | 5 | Form allowing doctor to select days of the week, start/end times, slot interval, and recurrence end date. | Complete |
| DP-403 | Slot deletion and batch cancellation UI. | 2 | Doctors can remove upcoming unbooked availability slots with one click. | Complete |
| DP-404 | LocumStaff-synced shift badges and indicators. | 2 | Synced shifts display a distinct "Synced from LocumStaff" badge with lock icon preventing direct edits on third-party windows. | Complete |
| DP-405 | Doctor holiday/blackout manager UI. | 3 | Modal to specify out-of-office date ranges with confirmation dialog. | Complete |

---

## 4. Deliverables Checklist
- [x] LocumStaff confirmed duty windows automatically slice into bookable slots.
- [x] Direct doctors can configure recurring weekly working hours and holidays.
- [x] Patients see real-time available time chips on doctor profile pages in local time.
- [x] Calendar prevents overlapping slots and enforces slot buffers.
