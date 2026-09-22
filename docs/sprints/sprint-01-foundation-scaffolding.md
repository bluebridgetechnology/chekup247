# Sprint 1 — Foundation & Project Scaffolding

**Sprint:** 1 of 10  
**Timeline:** Weeks 1–2  
**Total Points:** ~60  
**Status:** Completed  

---

## 1. Sprint Goal
Stand up the core architectural foundation across all four repositories/apps:
1. NestJS backend with physical dual-database connections (VPS Postgres and AWS RDS af-south-1 / local isolated instances).
2. Patient App (Next.js SSR).
3. Doctor Portal (Next.js).
4. Admin Panel (Next.js on isolated domain).
5. Background worker engine (BullMQ/Redis), storage engine (MinIO/R2), and CI/CD pipelines.

---

## 2. Architecture & Tech Stack Setup

```
┌─────────────────────────────────────────────────────────┐
│                    NestJS Backend                       │
│    (Modular Architecture, Global Pipes & Guards)        │
├────────────────────────────┬────────────────────────────┤
│   VPS PostgreSQL Source    │   AWS RDS PostgreSQL       │
│      (Operational DB)      │      (af-south-1)          │
│  - users                   │  - bookings                │
│  - doctor_profiles         │  - payments                │
│  - availability_slots      │  - consultations           │
│  - payouts                 │  - consultation_extensions │
│  - platform_settings       │  - prescriptions           │
│  - notification_prefs      │  - reviews                 │
│  - audit_logs              │  - notifications           │
│                            │  - wallet_credits          │
└────────────────────────────┴────────────────────────────┘
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-101 | Scaffolding NestJS repository and module hierarchy (`auth`, `doctors`, `bookings`, `payments`, `consultations`, `prescriptions`, `reviews`, `notifications`, `admin`). | 3 | API compiles with clean module boundaries and dependency injection. |
| BE-102 | Configure dual database connections in TypeORM/Prisma (VPS PostgreSQL and AWS RDS af-south-1). | 5 | Services can query and mutate both databases independently; health checks confirm connectivity. |
| BE-103 | Define ORM schemas and baseline migrations for all entities across both databases. | 8 | Zero drift; migrations run cleanly in development and staging environments. |
| BE-104 | Set up Redis and BullMQ connection pools with initial queue definitions (`notifications`, `reminders`, `directory-sync`, `payout`, `rating-sync`, `no-show`). | 3 | Worker process initializes and responds to test queue events. |
| BE-105 | Implement MinIO / Cloudflare R2 object storage provider with signed URL generation. | 3 | Backend can generate pre-signed upload URLs and expiring read URLs with mime-type checking. |
| BE-106 | Implement global exception filter, structured JSON logging, and validation pipes. | 3 | Standardized error payload `{ statusCode, message, error, timestamp, path }`. |
| BE-107 | Environment configuration module with Zod schema validation (`.env.example` created). | 2 | Startup fails immediately if required variables are missing or malformed. |
| BE-108 | Comprehensive health checks (`/health/live`, `/health/ready`) verifying DBs, Redis, storage. | 1 | Health endpoints return 200 OK with subsystem latency metrics. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-101 | Initialize Next.js project with App Router, TypeScript, and Tailwind CSS / Vanilla CSS modules. | 2 | Clean project initialization with absolute path aliases. |
| PA-102 | Establish core design system tokens: typography (Inter/Outfit), color system (brand teal, slate, dark/light modes), spacing, glassmorphism utilities. | 5 | Component styles match Figma/spec guidelines; WCAG AA contrast ratios achieved. |
| PA-103 | Build base layout shell: responsive navigation bar, mobile drawer, footer with legal/brand links. | 5 | Layout adapts gracefully from 320px mobile viewport to 4K desktop screens. |
| PA-104 | Scaffold public static routes (`/about`, `/how-it-works`, `/pricing`, `/faq`, `/contact`, `/terms`, `/privacy`). | 3 | Static pages render with metadata, breadcrumbs, and placeholder content. |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DP-101 | Initialize Doctor Portal Next.js project with shared design tokens. | 2 | Standalone application configured for `doctor.chekup247.com`. |
| DP-102 | Scaffold doctor dashboard layout shell: collapsible sidebar navigation, header with doctor status indicator, profile menu. | 3 | Layout structure ready for calendar, appointments, consultation workspace, and earnings views. |

### Admin Panel (Next.js — Isolated Application)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| AP-101 | Initialize Admin Panel Next.js project on isolated domain (`admin.chekup247.com`). | 2 | Completely isolated deployment pipeline and authentication domain. |
| AP-102 | Scaffold admin layout shell: sidebar, navigation, secure session indicator, data table UI primitives. | 3 | Foundation ready for verification queue, transaction ledger, and analytics. |
| AP-103 | Implement admin authentication boundary middleware. | 2 | Unauthorized users receive strict 401/403 responses; no patient/doctor cookies accepted. |

### DevOps & Tooling
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DO-101 | Multi-app CI/CD pipeline (GitHub Actions) for linting, testing, and automated staging deployment. | 5 | Push to `main` triggers automated checks and deploys all 4 components. |
| DO-102 | Local Docker Compose setup (`docker-compose.yml`) providing 2x PostgreSQL instances, Redis, and MinIO. | 3 | Developers can run `docker-compose up` to stand up all local dependencies in under 60 seconds. |
| DO-103 | Setup Husky pre-commit hooks, ESLint, and Prettier rules across all apps. | 1 | Formatting and linting automatically enforced before commits. |

---

## 4. Deliverables Checklist
- [x] Backend API boots and connects to both Postgres databases and Redis.
- [x] All database schemas and migrations applied without errors.
- [x] Patient App, Doctor Portal, and Admin Panel run independently with design tokens.
- [x] Docker Compose environment fully operational for local development.
- [x] CI/CD pipeline successfully validates builds.
