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

---

## Live VPS Deployment & Automated CI/CD (Vercel-like Experience)

The platform is deployed to a live **Ubuntu VPS (`94.237.91.42`)** with an automated continuous deployment pipeline powered by **GitHub Actions**, **Docker Compose**, and **Caddy** (with automatic Let's Encrypt SSL/TLS).

Whenever code is pushed to the `main` branch, GitHub Actions builds and compiles all applications in the cloud, packages them into optimized Docker containers, pushes them to GitHub Container Registry (`ghcr.io`), and seamlessly triggers a rolling zero-downtime update on the VPS.

### 1. Production Architecture & Endpoints

| Service | Domain / URL | Container | Port | Description |
| :--- | :--- | :--- | :--- | :--- |
| **Patient Web** | `https://chekup.co.za` | `chekup-patient-web` | `3000` | Next.js 16 (React 19) Patient Portal & Booking |
| **Doctor Portal** | `https://doctor.chekup.co.za` | `chekup-doctor-portal` | `3001` | Next.js 16 Doctor Workspace & E-prescribing |
| **Admin Panel** | `https://admin.chekup.co.za` | `chekup-admin-panel` | `3002` | Next.js 16 Isolated Back-Office Governance |
| **Backend API** | `https://api.chekup.co.za` | `chekup-api` | `4000` | NestJS API, WebSockets & BullMQ |
| **Object Storage** | `https://storage.chekup.co.za`| `chekup-minio` | `9000` | MinIO S3 API for Documents & Prescriptions |
| **Reverse Proxy** | Ports `80` & `443` | `chekup-caddy` | `80/443`| Automatic Let's Encrypt SSL & HTTP/3 |
| **Operational DB**| `localhost:5434` (internal: 5432) | `chekup-operational-postgres` | `5432` | PostgreSQL 16 (Users, Profiles, Slots) |
| **Patient DB** | `localhost:5433` (internal: 5432) | `chekup-patient-postgres` | `5432` | PostgreSQL 16 (Consultations, Records) |
| **Redis** | `localhost:6379` | `chekup-redis` | `6379` | Redis 7 for Queues, Sessions & Caching |

---

### 2. DNS Configuration

In your domain registrar / DNS management dashboard (e.g. Cloudflare, Namecheap, GoDaddy), the following **A records** point to your VPS IP:

| Type | Name / Host | Target IP | Description |
| :--- | :--- | :--- | :--- |
| **A** | `@` (or `chekup.co.za`) | `94.237.91.42` | Root Domain (Patient Portal) |
| **A** | `www` | `94.237.91.42` | Auto-redirects to `https://chekup.co.za` |
| **A** | `doctor` | `94.237.91.42` | Doctor Portal (`doctor.chekup.co.za`) |
| **A** | `admin` | `94.237.91.42` | Admin Panel (`admin.chekup.co.za`) |
| **A** | `api` | `94.237.91.42` | Backend API & WebSockets (`api.chekup.co.za`) |
| **A** | `storage` | `94.237.91.42` | MinIO S3 API (`storage.chekup.co.za`) |

> **Automatic SSL**: Caddy listens on ports 80 and 443. As traffic arrives, Caddy automatically provisions and auto-renews free Let's Encrypt certificates for all domains and subdomains.

---

### 3. One-Time VPS Bootstrap & First Boot

On a clean Ubuntu 22.04 / 24.04 VPS:

```bash
# 1. SSH into the server
ssh root@94.237.91.42

# 2. Update packages and install Docker
apt-get update -y && apt-get install -y curl git ufw ca-certificates gnupg lsb-release
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt-get update -y && apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 3. Configure UFW Firewall (Only allow SSH & Web ports)
ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp && ufw allow 443/udp && ufw --force enable

# 4. Clone repository into /opt/chekup247
mkdir -p /opt/chekup247 && cd /opt/chekup247
git clone git@github.com:bluebridgetechnology/chekup247.git /opt/chekup247

# 5. Configure environment files
cp deploy/production.env.example .env.production
cp .env.production .env
nano .env.production
# (Fill in JWT_SECRET, ADMIN_SESSION_SECRET, ADMIN_BOOTSTRAP_PASSWORD, and database passwords)

# 6. Start the production stack
docker compose -f docker-compose.prod.yml up -d
```

---

### 4. Automated CI/CD Workflow (`.github/workflows/deploy.yml`)

Whenever you push to `main`:
```bash
git add .
git commit -m "feat: new feature"
git push origin main
```

The GitHub Actions workflow triggers automatically:
1. **Cloud Build**: Multi-stage Docker builds for `api`, `patient-web`, `doctor-portal`, and `admin-panel` execute on GitHub's fast runners with Docker layer caching.
2. **Registry Push**: Images are tagged with commit SHA and `:latest`, then pushed to GitHub Container Registry (`ghcr.io`).
3. **VPS SSH Deployment**: The action connects to `94.237.91.42` via SSH, pulls the latest images, triggers a rolling container restart (`docker compose up -d`), and prunes old image layers to preserve disk space.

#### Required GitHub Secrets:
In GitHub → **Settings** → **Secrets and variables** → **Actions**:
- `VPS_HOST`: `94.237.91.42`
- `VPS_USER`: `root`
- `VPS_SSH_KEY`: Private SSH key authorized on the VPS
- `VPS_SSH_PORT`: `22`
- `GHCR_PAT`: *(Optional)* Personal Access Token with `read:packages` scope if the GitHub repository/packages are private.

---

### 5. Production Maintenance Commands

All production operations are managed from `/opt/chekup247` on the VPS:

```bash
cd /opt/chekup247

# View running container health status
docker compose -f docker-compose.prod.yml ps

# View live logs for all services
docker compose -f docker-compose.prod.yml logs -f

# View live logs for specific services
docker compose -f docker-compose.prod.yml logs -f api
docker compose -f docker-compose.prod.yml logs -f patient-web
docker compose -f docker-compose.prod.yml logs -f caddy

# Restart a specific service
docker compose -f docker-compose.prod.yml restart api
docker compose -f docker-compose.prod.yml restart caddy

# Manual update / rebuild
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
docker image prune -f
```

