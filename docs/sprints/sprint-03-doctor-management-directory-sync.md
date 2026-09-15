# Sprint 3 — Doctor Management & Directory Sync

**Sprint:** 3 of 10  
**Timeline:** Weeks 5–6  
**Total Points:** ~50  
**Status:** Ready for Backlog Grooming  
**Prerequisites:** Sprint 2 complete; LocumStaff Directory API Key configured.

---

## 1. Sprint Goal
1. Build automated background synchronization of verified General Practitioners from LocumStaff's Partner Directory API (`GET /v1/partner-directory/doctors`).
2. Build administrator HPCSA verification queue for direct applicants.
3. Deliver a high-converting, SEO-optimized public Doctor Directory and Doctor Profile page on the Patient App.
4. Import and index the South African ICD-10 Master Industry Table (MIT) for later medical coding.

---

## 2. Directory Synchronization Flow

```
BullMQ Scheduled Job (Every 30 mins)
        │
        ▼
Calls LocumStaff GET /v1/partner-directory/doctors (Header: X-API-Key)
        │
        ▼
Filters eligible records:
  - role == 'LOCUM'
  - status == 'VERIFIED'
  - profession == 'GENERAL_PRACTITIONER'
        │
        ▼
Upserts doctor_profiles on VPS Postgres:
  - Updates name, bio, specialty, facility info
  - Caches signed photo URL with expiration tracking
  - Sets verification_status = 'verified', verification_source = 'locumstaff'
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-301 | Build LocumStaff Partner Directory sync worker (`DirectorySyncJob`). | 5 | Runs every 30 minutes; handles network retries, upserts doctors, and avoids persisting expired signed photo URLs. |
| BE-302 | Doctor search and filtering API (`GET /doctors`). | 5 | Query parameters: `specialty`, `ratingMin`, `priceMin`, `priceMax`, `searchQuery`, `page`, `limit`. Uses full-text indexing on VPS. |
| BE-303 | Doctor profile detail API (`GET /doctors/:id`). | 3 | Returns doctor bio, specialty, hourly rate, HPCSA verification status, and aggregated rating from AWS DB. |
| BE-304 | Admin doctor verification endpoints (`POST /admin/doctors/:id/verify`, `POST /admin/doctors/:id/reject`). | 3 | Updates `doctor_profiles.verification_status`; records admin ID and audit notes; triggers doctor notification. |
| BE-305 | Admin pending doctor list query (`GET /admin/doctors/pending`). | 2 | Returns paginated list of direct doctor submissions awaiting review with submitted documents. |
| BE-306 | ICD-10 Master Industry Table import script and search endpoint (`GET /medical/icd10`). | 3 | Imports official SA DoH ICD-10 CSV into database; exposes debounced typeahead search API. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-301 | **Doctor Directory Page** (`/doctors`). | 8 | Filter bar (specialties dropdown, price slider, rating filter, search bar), responsive grid of doctor cards, sorting options, pagination. |
| PA-302 | **Doctor Card Component**. | 3 | Displays avatar, full name with "Dr" title, verified HPCSA badge, specialty tags, star rating, hourly consultation fee, "Book Now" CTA. |
| PA-303 | **Doctor Profile Page** (`/doctors/:slug`). | 8 | Fully SSR-rendered for SEO; displays doctor bio, credentials, clinic affiliations, patient reviews, and placeholder booking calendar widget. |
| PA-304 | SEO OpenGraph & structured data (JSON-LD `Physician` schema) for doctor pages. | 2 | Google rich snippet compliance; dynamic metadata generated per doctor. |

### Admin Panel (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| AP-301 | **Doctor Verification Queue** (`/doctors/verification`). | 5 | List of pending doctors; split-screen drawer showing doctor details and inline PDF viewer for uploaded HPCSA certificates. |
| AP-302 | Verification action modal (Approve / Reject with rejection reason input). | 3 | Admin confirms decision; updates status immediately with optimistic UI. |
| AP-303 | **Doctor Management Table** (`/doctors`). | 3 | Global view of all platform doctors; filter by status (active/pending/suspended) and source (LocumStaff/Direct). |

---

## 4. Deliverables Checklist
- [ ] Automated sync pulls active LocumStaff doctors into ChekUp247.
- [ ] Admin can inspect submitted documents and verify or reject direct doctors.
- [ ] Patients can browse, search, and view doctor profiles with rich SEO tags.
- [ ] ICD-10 database populated with South African National DoH codes.
