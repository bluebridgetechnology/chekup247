# Sprint 2 — Authentication & LocumStaff SSO

**Sprint:** 2 of 10  
**Timeline:** Weeks 3–4  
**Total Points:** ~57  
**Status:** Completed ✅  
**Prerequisites:** Sprint 1 complete; LocumStaff integration credentials registered in LocumStaff Admin.

---

## 1. Sprint Goal
Implement end-to-end authentication and identity across all user roles:
1. Patient registration, email verification, social login, and session management via Better Auth.
2. Federated Doctor SSO using LocumStaff's native-app-initiated OIDC authorization-code + PKCE flow.
3. Doctor direct registration fallback with HPCSA document upload for non-LocumStaff doctors.
4. Isolated administrator login on the dedicated Admin Panel application.

---

## 2. SSO Handshake Architecture

```
Doctor in LocumStaff Mobile App
        │
        ▼
Mobile app calls POST /v1/oidc/authorize (LocumStaff JWT)
        │  → { redirectUrl: "https://doctor.chekup247.co.za/callback?code=...&state=..." }
        ▼
Mobile app opens redirectUrl in in-app browser
        │
        ▼
ChekUp Backend calls POST /v1/oidc/token (code + PKCE verifier + client credentials)
        │  → Returns id_token (RS256 JWT)
        ▼
Backend verifies id_token against LocumStaff JWKS
        │
        ├─ Match found (sso_external_id) ──> Issue ChekUp session
        └─ No match ────────────────────────> Auto-provision doctor_profile (VERIFIED)
```

---

## 3. Detailed Task Breakdown

### Backend (NestJS API)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| BE-201 | Integrate Better Auth with self-hosted PostgreSQL backing (`users` table on VPS). | 5 | Email/password sign-up, sign-in, session issuance with HTTP-only cookies, password hashing with Argon2/bcrypt. |
| BE-202 | Role-Based Access Control (RBAC) guard system (`@Roles('patient' | 'doctor' | 'admin')`). | 5 | Unauthorized access is intercepted with 403 Forbidden; supports route-level annotations. |
| BE-203 | Implement LocumStaff OIDC callback endpoint (`GET /auth/sso/locumstaff/callback`). | 8 | Code exchange against LocumStaff `POST /v1/oidc/token` with PKCE; verifies token signature against LocumStaff's JWKS; extracts `sub`, `email`, `given_name`, `family_name`, `profession`. |
| BE-204 | Implement doctor account match-or-create logic. | 3 | Matches existing doctor by `sso_external_id`. If new and LocumStaff status is `VERIFIED`, auto-provisions profile as `verified`. If not verified, sets status to `pending`. |
| BE-205 | Direct doctor onboarding endpoint (`POST /doctors/onboard`). | 5 | Accepts HPCSA registration number, bio, rate, and file uploads for ID/license documentation; creates `pending` doctor profile. |
| BE-206 | Google Social OAuth integration via Better Auth. | 2 | Seamless single-click registration/login for patients using Google accounts. |

### Patient App (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| PA-201 | Patient registration screen with interactive validation. | 3 | Fields: full name, email, phone, date of birth, password; inline validation and loading states. |
| PA-202 | Email verification screen and deep link handler. | 2 | Secure token verification with automatic login upon success. |
| PA-203 | Patient login screen (email/password + Google Social Sign-In). | 3 | Handles error toasts, "Remember me", and redirects to previous requested URL. |
| PA-204 | Forgot password and password reset workflow. | 2 | Secure email reset link with rate-limiting and expiration checks. |
| PA-205 | Patient profile management page (`/profile`). | 3 | Edit personal details, upload avatar, manage connected accounts. |
| PA-206 | Notification preferences configuration UI. | 2 | Patients choose 1 or 2 preferred communication channels (Email, SMS, WhatsApp). |

### Doctor Portal (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| DP-201 | SSO callback receiver page (`/callback`). | 3 | Intercepts redirect from LocumStaff mobile app, triggers token exchange, displays loading animation, and establishes doctor session. |
| DP-202 | Direct doctor registration wizard (`/register`). | 5 | Multi-step form: step 1 (personal & contact), step 2 (HPCSA registration & specialty), step 3 (document uploads), step 4 (hourly rate in ZAR & bio). |
| DP-203 | Direct doctor login page (`/login`). | 2 | Secure sign-in for directly registered doctors. |
| DP-204 | Doctor profile overview and editing view (`/profile`). | 3 | View verification badge, edit bio, set hourly consultation rate, update profile photo. |
| DP-205 | "Pending Verification" restricted dashboard state. | 2 | Unverified doctors see a friendly status screen with review timeline; access to calendar and bookings blocked. |

### Admin Panel (Next.js)
| Task ID | Task Description | Points | Deliverable / Acceptance Criteria |
|---|---|---|---|
| AP-201 | Dedicated admin login page (`admin.chekup247.co.za/login`). | 2 | Clean, secure login form with separate session store from patient app. |
| AP-202 | Admin user management (creation and revocation). | 3 | Superadmins can invite other admins; no public registration route exists. |

---

## 4. Dependencies & Blockers
- **LocumStaff Integration Registration:** LocumStaff Admin must configure `Chekup_OIDC_CLIENT_ID`, `Chekup_OIDC_CLIENT_SECRET`, `Chekup_OIDC_REDIRECT_URI`, and `Chekup_DIRECTORY_API_KEY`.
- **Better Auth Secret Keys:** Generate high-entropy session secrets and configure cookie domains.

---

## 5. Deliverables Checklist
- [x] Patient can sign up, verify email, and sign in.
- [x] Doctor can SSO into Doctor Portal via LocumStaff without re-entering credentials.
- [x] Direct doctor can submit registration with HPCSA license documents.
- [x] Admin can log in on the isolated admin domain.
- [x] RBAC guards verify and protect endpoints based on user role.
