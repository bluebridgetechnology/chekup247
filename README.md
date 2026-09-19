# ChekUp247 Telehealth Platform

ChekUp247 is a South African telehealth ecosystem engineered for real-time remote consultations, compliant e-prescribing under HPCSA ethical standards, secure split-escrow payments via Paystack, and high-performance WebRTC video consultations powered by Daily.co.

---

## Monorepo Architecture

```text
chekup247/
├── apps/
│   ├── api/             # NestJS backend API, Dual PostgreSQL DBs, Redis & WebSockets (Port 4000)
│   ├── patient-web/     # Next.js 16 (React 19) patient-facing portal, doctor directory & booking (Port 3000)
│   ├── doctor-portal/   # Next.js 16 (React 19) practitioner workspace, clinical notes & e-scripts (Port 3001)
│   └── admin-panel/     # Next.js 16 (React 19) back-office governance, dispute arbitration & payouts (Port 3002)
├── docs/                # PRD, Sprints, Architecture, and QA Checklists
└── docker-compose.yml   # Operational Postgres, Patient Postgres, Redis, and MinIO
```

---

## Environment Configuration

Environment variables are located in:
- **Backend API**: `apps/api/.env` (and root `.env`)
- **Template Reference**: `.env.example`

### Daily.co Video Consultations (Dynamic Multi-Tenant Integration)

In ChekUp247's multi-tenant marketplace architecture, every appointment receives a dynamically generated, isolated private room on Daily's global mesh network:
- **No domain or room names to configure**: You **only need `DAILY_API_KEY`**.
- When an appointment is created, the backend calls `POST https://api.daily.co/v1/rooms`.
- Daily automatically provisions an ephemeral private room under your account, generates a collision-free room name, and returns the canonical dynamic URL (`https://<your-org>.daily.co/<unique-room>`).
- Participant access is governed by dynamic, short-lived meeting tokens (`POST /meeting-tokens`) with doctor moderator privileges (`is_owner: true`) and patient participant permissions (`is_owner: false`).

#### Configuration:
1. Open **`apps/api/.env`** (or root **`.env`**).
2. Set your API key:
   ```env
   DAILY_API_KEY=your_daily_api_key_here
   ```
   *(Obtain your key from [dashboard.daily.co/developers](https://dashboard.daily.co/developers))*

> **Note on Localhost & Dev**: Daily.co natively allows WebRTC calls originating from `localhost` / `http://localhost:3000` during development without domain restrictions.

---

## Production Deployment Checklist

Before deploying ChekUp247 to live production servers (VPS, AWS ECS/EC2, or Docker Swarm):

### 1. Daily.co Video & Webhook Configuration
- [ ] **Production API Key**: Set your live Daily.co Production API Key in your cloud secret manager (AWS Secrets Manager, Doppler, or production `.env`).
- [ ] **WebRTC HTTPS Enforcement**: Ensure SSL/TLS certificates are active on all domains (`https://`). Browsers strictly require HTTPS for camera, microphone, and background blur permissions outside of `localhost`.
- [ ] **Daily Webhook Registration**: Register your production webhook endpoint `https://api.chekup247.co.za/consultations/webhooks/daily` in the [Daily.co Webhooks Dashboard](https://dashboard.daily.co/webhooks) (or via `POST https://api.daily.co/v1/webhooks`) for events `["participant.joined", "participant.left"]`. Daily sends a verification probe `{"test": "test"}` which the backend automatically verifies with HTTP 200.

### 2. Platform URLs & Routing
- [ ] `API_BASE_URL` -> `https://api.chekup247.co.za`
- [ ] `PATIENT_WEB_URL` -> `https://chekup247.co.za`
- [ ] `DOCTOR_PORTAL_URL` -> `https://doctor.chekup247.co.za`
- [ ] `ADMIN_PANEL_URL` -> `https://admin.chekup247.co.za`
- [ ] `NEXT_PUBLIC_API_URL` on all Next.js frontends pointing to production backend HTTPS.

### 3. Databases & Infrastructure
- [ ] **VPS Operational Postgres** (Port 5434 in dev) configured with strong production password and SSL enabled (`OPERATIONAL_DB_SSL=true`).
- [ ] **AWS RDS Patient Postgres** (Port 5433 in dev) configured with production VPC peering, read-replica, and SSL enabled (`PATIENT_DB_SSL=true`).
- [ ] **Redis Cluster**: Production Redis password set, persistence enabled (AOF/RDB) for BullMQ background queues.
- [ ] **Storage (S3 / R2)**: Replace local MinIO credentials with AWS S3 (`af-south-1`) or Cloudflare R2 bucket with private ACLs and presigned URL access.

### 4. Third-Party Integrations
- [ ] **Paystack**: Swap `sk_test_*` / `pk_test_*` keys with live South African Paystack production keys and register production webhook URL (`/payments/webhook`).
- [ ] **SMS Portal SA**: Provide live production `SMSPORTAL_API_KEY` and `SMSPORTAL_API_SECRET`.
- [ ] **Brevo (Sendinblue)**: Set production `BREVO_API_KEY` and verify sender domain DNS (SPF, DKIM, DMARC).
- [ ] **WHO ICD-10 API**: Ensure production OAuth credentials are configured for clinical diagnostic code searching.

---

## Local Development Quickstart

```bash
# 1. Start Docker containers (Postgres, Redis, MinIO)
npm run docker:up

# 2. Run backend API
npm run dev:api

# 3. Run frontends in parallel
npm run dev:patient   # http://localhost:3000
npm run dev:doctor    # http://localhost:3001
npm run dev:admin     # http://localhost:3002
```
