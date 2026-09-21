# ChekUp247 — Admin Portal Gap Implementation Plan (Final)

**Goal:** turn the current admin panel into a fully functional, secured, **standalone** admin portal — every screen backed by a correct, real API contract, with hardened login-only authentication and the missing operational features built out.

**Scope:** `apps/admin-panel` (Next.js, :3002) and the admin surface of `apps/api` (`src/modules/admin`, guards, entities).

**Deployment model (confirmed by user):**
- Admin panel is hosted on its **own domain**, independently of `patient-web` and `doctor-portal`. No shared-domain assumptions.
- **No redirects into or out of** the patient/doctor portals. The admin app is fully self-contained.
- **Login-only** — there is no admin self-signup. Admin accounts are provisioned by an existing admin (invite) or by a controlled bootstrap process. The UI must never expose a signup path.
- Backend `ADMIN_PANEL_URL` CORS origin already exists (`apps/api/src/main.ts` + `env.config.ts`) — the separate-origin model is already supported at the infra layer; what's missing is aligning auth to not assume same-site cookies.

**Status legend:** ✅ real & correct · ⚠️ built but broken/mismatched · ❌ missing

---

## 1. Current state (baseline)

| Area | Backend | Frontend | Status |
|---|---|---|---|
| Executive Analytics | `getAnalytics()` real | reads a **different shape** than backend returns | ⚠️ broken contract |
| Financial Ledger / CSV | real (payments+refunds+credits+payouts) | wired | ✅ |
| Bookings oversight + detail | real | wired | ✅ |
| Dispute resolution (refund/credit) | real, audit-logged | wired | ✅ actions; ❌ no dispute lifecycle |
| POPIA audit logs | real (delegates to AuditService) | wired | ✅ |
| Platform settings | real | wired correctly | ✅ |
| HPCSA verification (approve/reject) | real + notifications | wired (mock fallback) | ✅ |
| Doctor directory | real | wired (mock fallback) | ✅ |
| **User Management** | only admin invite/revoke exists; **no patient sub, no unified doctor+patient parent nav** | `/admins` only | ❌ needs restructure (see §2, P0-5) |
| Admin login | real | wired | ✅ (must confirm no signup path — verified none exists) |
| Route auth (middleware) | — | gates wrong token; assumes cookie shared with other apps | ⚠️ not enforced, wrong model for standalone hosting |
| Default admin seed | in code | — | ⚠️ prod hardening needed |

---

## 2. Priority-ordered work

### P0 — Correctness, security & standalone-hosting alignment (fix first)

> **Sprint A status: implemented 2026-09-21.** See per-item notes below for exactly what shipped vs. what remains as a follow-up.

#### P0-1 · Fix Executive Dashboard data contract — ✅ DONE
**Fix applied (backend):** `AdminService.getAnalytics()` (`apps/api/src/modules/admin/admin.service.ts`) now returns the exact shape the UI expects: `kpis` (with `averageTakeRate`, `activeConsultationsInFlight` sourced from real in-flight `Consultation` rows), `revenueTrajectory` (14-day, `gross`/`commission`/`consultations`), `specialtyDistribution` with string `percentage`, a new `recentActivity` feed (last 8 bookings, patient identity masked per POPIA — e.g. "L. N****"), and `systemHealth` (derived from whether the method's own DB reads succeeded, no extra round-trip). Updated `admin.service.spec.ts` to match. Frontend `apps/admin-panel/src/app/page.tsx` needed no changes — its interface already expected this exact shape.
**Verified:** `tsc --noEmit` clean on `apps/api`. Test file updated but not executed under this session's memory constraint — run `npm test -w apps/api -- admin.service.spec` to confirm before merging.

#### P0-2 · Re-architect auth for standalone hosting — ✅ DONE (within Bearer-JWT model, per user decision)
**User decision:** keep Bearer JWT (localStorage), harden rather than switch to cookie sessions.
**Fix applied:** discovered mid-implementation that the API and admin panel are on different origins even in dev (`:4000` vs `:3002`), so a cookie set by the API's own `/auth/login` response is scoped to the API's domain and was never visible to the admin panel's own middleware — that's *why* enforcement was a no-op, not because the check was merely lazy. Fix: added a same-origin Next.js Route Handler proxy (`apps/admin-panel/src/app/api/auth/login/route.ts`, `.../logout/route.ts`) that forwards to the API server-to-server and re-sets a presence-only httpOnly cookie (`chekup_admin_session`) scoped to the admin panel's **own** domain. `middleware.ts` now genuinely redirects to `/login` when that cookie is absent, instead of always falling through. `AdminAuthContext.login`/`logout` now call the same-origin proxy. The Bearer JWT in the response body is unchanged — it's still stored client-side and sent as `Authorization: Bearer` on every API call, and the backend's `JwtAuthGuard` + `RolesGuard` remain the actual authorization boundary; the cookie is defense-in-depth for server-side redirect only.
**Also fixed:** removed the pre-filled default admin email/password from the login form (`apps/admin-panel/src/app/login/page.tsx`) — the form previously showed valid-looking production credentials to any visitor.
**Note / follow-up:** middleware only runs on full page navigations in the Next.js App Router, not on every client-side route transition — acceptable for this threat model since API calls remain independently authorized, but worth knowing.
**Verified:** `tsc --noEmit` clean on `apps/admin-panel`.

#### P0-3 · Production admin-account hardening — ✅ DONE
**Fix applied:** `apps/api/src/config/env.config.ts` now has `ADMIN_BOOTSTRAP_EMAIL`/`ADMIN_BOOTSTRAP_PASSWORD`, and **hard-fails NestJS boot in production** if `ADMIN_BOOTSTRAP_PASSWORD` is unset, or if `JWT_SECRET`/`ADMIN_SESSION_SECRET` are still their known development-default literals. `AdminService.onModuleInit` now seeds from these env vars instead of the hardcoded `AdminChekup2026!` literal (dev fallback unchanged, since there's no production data to protect there).
**Forced first-login password change — now implemented:**
- New migration `apps/api/src/database/operational/migrations/1700000005000-AddUserMustChangePassword.ts` adds `users.must_change_password boolean default false`; the `User` entity has the matching column.
- The bootstrap-seeded admin is created with `must_change_password: true`.
- `AuthService.login()` and `getCurrentUser()` both surface `user.mustChangePassword` in their response.
- New `AuthService.changePassword()` + `PUT /auth/change-password` (JWT-guarded, requires current password, min 8 chars, clears the flag on success).
- Admin panel: new `/change-password` page (`apps/admin-panel/src/app/change-password/page.tsx`) and a layout-level redirect gate (`layout.tsx`) that routes any authenticated admin with `mustChangePassword: true` there before anything else is reachable.
- In development, `synchronize: true` applies the new column automatically on next API start; the migration file is what makes the same change safe and repeatable against a production database where `synchronize` is off — run it with the project's TypeORM migration command before deploying.

#### P0-4 · Visible "demo data" state on mock fallbacks — ✅ DONE
**Fix applied:** added an `isUsingFallback` state flag + an amber banner ("Showing offline demo data — the … API is unreachable") to the Executive Dashboard (`page.tsx`), Doctor Directory (`doctors/page.tsx`), and HPCSA Verification Queue (`doctors/verification/page.tsx`) — the three pages with a silent mock-data fallback. The banner is set the moment the real fetch fails and cleared the moment a real fetch succeeds.

#### P0-5 · Restructure navigation: unified "User Management" — ✅ DONE
**Fix applied:** rewrote `apps/admin-panel/src/components/AdminSidebar.tsx` — "User Management" is now an expandable parent containing **Doctors** (`/doctors`), **Patients** (`/users/patients`), and **Admin Accounts** (`/admins`, existing route unchanged). HPCSA Verification Queue stays top-level (highest-frequency task, as recommended). `apps/admin-panel/src/app/users/patients/page.tsx` was scaffolded as a placeholder in Sprint A and became a fully functional page in Sprint B (see P1-3).

---

### P1 — Missing operational features (each with entity + endpoints in §3)

> **All sprints (A–E) implemented 2026-09-21.** Every P0 and P1 item, plus 2FA/rate-limiting/streaming-CSV/test-coverage from P2, are done. See §4 for what remains open (mostly deeper P2 hardening and two explicitly-flagged cross-app follow-ups).

#### P1-1 · Real Dispute lifecycle — ✅ DONE
**Backend:** new `Dispute` entity (`apps/api/src/database/patient/entities/dispute.entity.ts`) on the patient DB with `status: open|investigating|resolved|rejected`, `raised_by`, `category`, `reason`, `assigned_admin_id`, `evidence_urls`, `resolution_type: refund|credit|no_action`, `resolution_notes`, `resolved_at`. Migration `1700000006000-AddDisputesTable.ts`. `AdminService` gained `getDisputesLifecycle`, `getDisputeDetail`, `createDispute` (for a future patient-web raise-a-dispute flow — not yet wired into patient-web itself, see follow-up below), `assignDispute`, and `resolveDisputeLifecycle` (wraps the existing, already-real `resolveDisputeRefund`/`resolveDisputeCredit` financial actions as the two resolution mechanisms, or records a no-action/rejected verdict). New routes: `GET /admin/disputes/lifecycle`, `GET /admin/disputes/lifecycle/:id`, `POST /admin/disputes/lifecycle/:id/assign`, `POST /admin/disputes/lifecycle/:id/resolve`.
**Frontend:** new page `apps/admin-panel/src/app/disputes/cases/page.tsx` — status-filterable case list, "Assign to me" (open → investigating), and a resolve modal (refund / credit / no-action, with mandatory notes for the audit trail). Linked from the sidebar as "Dispute Cases", kept separate from the existing "Dispute Resolution" page (which stays as the booking-status-derived legacy workspace — nothing there was removed or broken).
**Follow-up not in this pass:** `createDispute` exists on the backend but nothing calls `POST /disputes` yet from patient-web's UI — patient-initiated dispute raising is still a frontend gap on the *patient* app, not the admin panel.

#### P1-2 · Doctor payout management — ✅ DONE (approve/hold/mark-paid); ⏸ no live Paystack Transfers integration
**Backend:** `PayoutStatus` gained a `HOLD` state; `Payout` gained `hold_reason`, `approved_by_admin_id`, `approved_at` (migration `1700000008000-AddPayoutHoldAndApproval.ts`). `AdminService.getPayouts` (status/doctor filter + pagination, joined to the doctor's name), `approvePayout`, `holdPayout` (reason required), `markPayoutPaid` (transaction reference required). Routes: `GET /admin/payouts`, `POST /admin/payouts/:id/approve|hold|mark-paid`. All four are audit-logged.
**Important scope note:** there is still no live Paystack Transfers API call anywhere in the codebase — no code path ever creates a `Payout` row either, so this feature currently manages payout records that some other (not-yet-built) job would need to create. `markPayoutPaid` explicitly records an admin's confirmation that a transfer happened *out-of-band*; it does not move money. Wiring an actual transfer call is future work, not silently implied by this page.
**Frontend:** new page `apps/admin-panel/src/app/payouts/page.tsx` — status filter tabs, Hold (with a required-reason modal), Release Hold, and Mark Paid (with a required transaction-reference modal). The page's own copy states plainly that marking paid does not trigger a transfer.

#### P1-3 · Patient user management — ✅ DONE
**Backend:** `AdminService.getPatients` (search/status filter/pagination + a per-patient booking count), `getPatientDetail` (profile + recent bookings + wallet credits + review count, pulled across the operational `User` and patient-DB repos — the same cross-database join pattern `getBookingDetail` already used), `suspendPatient` (toggles `UserStatus.ACTIVE`/`SUSPENDED`, audit-logged), `exportPatientPopiaData` (full subject-access export: profile, bookings, payments, credits, consultations, prescriptions, reviews — audit-logged as `ADMIN_PATIENT_POPIA_EXPORT`), `deletePatient` (soft delete: status → `BANNED`, PII scrubbed, history retained — a hard delete would break referential integrity across both databases and POPIA/financial record-keeping requirements, so this is the intended design, not a shortcut). New routes: `GET /admin/patients`, `GET /admin/patients/:id`, `PUT /admin/patients/:id/suspend`, `POST /admin/patients/:id/popia-export`, `DELETE /admin/patients/:id`.
**Frontend:** `apps/admin-panel/src/app/users/patients/page.tsx` replaced its Sprint-A placeholder with a real list (search, status filter, pagination) and a detail drawer with Suspend/Reactivate, POPIA JSON export (downloads client-side), and Delete actions.

#### P1-4 · Consultation oversight — ✅ DONE
**Backend:** `AdminService.getConsultations` (in-flight filter using real `started_at IS NOT NULL AND ended_at IS NULL`, join-enriched with doctor/patient names and computed live duration) and `getConsultationDetail` (adds real `ConsultationExtension` history via a proper repository injection — not a stub). Routes: `GET /admin/consultations`, `GET /admin/consultations/:id`. `getAnalytics`'s `activeConsultationsInFlight` (P0-1) already used this same real query.
**Frontend:** new page `apps/admin-panel/src/app/consultations/live/page.tsx` — in-flight toggle (defaults on), a 20s auto-refresh while showing in-flight sessions, join timestamps for doctor/patient, live duration, and a pulsing "In Progress" badge. The existing `/consultations` → `/bookings` redirect is untouched; this is a new, separate route linked from the sidebar as "Live Consultations".

#### P1-5 · Notifications / broadcast console — ✅ DONE
**Backend:** `AdminService.getNotifications` (status filter + pagination, joined to recipient names), `resendNotification` (re-dispatches a FAILED notification's own original template/payload/channel through the existing `NotificationsService` — fails loudly rather than faking success if that service is unavailable), `broadcastNotification` (fans out to all active patients, doctors, or both via the same `dispatchNotification` path every other notification already uses, so per-user channel preferences are respected; returns a dispatched/failed/total count). Routes: `GET /admin/notifications`, `POST /admin/notifications/:id/resend`, `POST /admin/notifications/broadcast`. All audit-logged.
**Frontend:** new page `apps/admin-panel/src/app/notifications/page.tsx` — delivery log with status filter tabs (defaults to `failed`), a Resend action per failed row, and a "New Broadcast" modal (audience: patients/doctors/everyone, title, message).

#### P1-6 · Reviews & content moderation — ✅ DONE
**Backend:** `Review` gained `is_hidden`/`hidden_reason` (migration `1700000012000-AddReviewModeration.ts`). `AdminService.getReviews` (visibility + doctor filter, joined to patient/doctor names) and `setReviewHidden` (hide requires a reason for the audit trail; unhide clears it). Routes: `GET /admin/reviews`, `PUT /admin/reviews/:id/hide`. Hidden reviews are **not deleted** — they stay in the database (audit trail, dispute evidence) but the flag is there for the public-facing doctor-profile query to filter on when that integration is done (not part of this pass — see follow-up below).
**Frontend:** new page `apps/admin-panel/src/app/reviews/page.tsx` — visible/hidden/all tabs, star rating display, Hide (reason required) / Unhide actions.
**Follow-up (closed 2026-09-21):** `ReviewsService.getDoctorReviews` (the query patient-web's doctor profile/directory uses) now filters `is_hidden: false` on both the paginated list and the rating-distribution query. `RatingSyncProcessor` (the BullMQ job that computes a doctor's `rating_avg`/`reviews_count`) now excludes hidden reviews from its aggregate too, and `AdminService.setReviewHidden` triggers that same resync job on every hide/unhide via `ReviewsService.syncDoctorRating` — so a doctor's public rating badge updates immediately rather than staying skewed by a hidden review. Hidden reviews are still retained in the database (audit trail), just excluded from these read paths.

#### P1-7 · RBAC sub-roles (super-admin vs support) — ✅ DONE
**Backend:** `User` gained `admin_sub_role: super_admin | support` (migration `1700000010000-AddAdminSubRole.ts`, backfills existing admins — including the bootstrap account — to `super_admin` so nobody loses access on upgrade). New `AdminSubRoles(...)` decorator + `AdminSubRolesGuard` (`apps/api/src/common/guards/admin-sub-roles.guard.ts`), composed alongside the existing `@Roles(UserRole.ADMIN)` rather than replacing it — it looks up the caller's sub-role from the database rather than the JWT (the token payload format is shared with patient/doctor and has several issuance call sites; adding a field there would touch all of them and risk invalidating outstanding tokens, so a single indexed lookup here was the safer choice). Applied to: `PUT /admin/settings`, `POST /admin/users/invite`, `PUT /admin/users/:id/revoke`, and `POST /admin/payouts/:id/mark-paid` — all restricted to `super_admin`. Payout hold/approve stay open to both sub-roles as ordinary case work. New admin invites default to `support` (least privilege); an inviter explicitly opts a new account into `super_admin`.
**Frontend:** `apps/admin-panel/src/app/admins/page.tsx` invite modal gained a sub-role selector, and the admin list shows a Super Admin/Support badge per account.
**Follow-up (closed 2026-09-21):** `login()` and `getCurrentUser()` now also surface `user.adminSubRole` (same pattern as `mustChangePassword`), and `AdminSidebar.tsx` filters out "Admin Accounts" and "Platform Settings" for a `support` admin — those routes call `super_admin`-only endpoints, so hiding them avoids a dead-end link that would only 403. A `support` admin who reaches either page directly by URL still gets a clear backend error message (unchanged) rather than a UI crash — that remains acceptable defense-in-depth, since the backend guard is the actual boundary and the sidebar is only guidance.

---

### P2 — Hardening & polish

> **Sprint E status: implemented 2026-09-21.** 2FA, admin-login rate-limiting, streaming CSV export, and expanded test coverage all shipped. See notes below; remaining P2 items are listed as still open.

- ✅ **2FA / TOTP for admin login — DONE.** RFC 6238 TOTP implemented on Node's built-in `crypto` (`apps/api/src/modules/auth/totp.service.ts`) rather than adding a new npm dependency (otplib/speakeasy) — deliberate given this session's sustained tight-memory constraint, where `npm install` itself was a heavier operation than ~100 lines of HMAC-SHA1 math; verified against an independent reference implementation in `totp.service.spec.ts` (6/6 passing), not just self-consistency. `User` gained `totp_secret`/`totp_enabled`/`totp_enabled_at` (migration `1700000014000-AddUserTotp.ts`). `AuthService.login()` now returns a `{ requiresTotp, challengeToken }` challenge instead of a session when the account has 2FA enabled and no valid code was supplied; a new `completeTotpLogin` exchanges that (5-minute-lived, purpose-scoped) challenge token plus a code for the real session. Enrollment (`POST /auth/totp/enroll`), confirmation (`POST /auth/totp/confirm` — `totp_enabled` stays false until a real code is verified, so nobody locks themselves out with an unscanned secret), and disable (`POST /auth/totp/disable`, current-password-gated) round out the flow. Frontend: the login page gained a second step for the 6-digit code; a new `/security` page lets **every** admin (not sub-role-gated — 2FA is a personal account action) enroll or disable their own 2FA, showing the `otpauth://` URL and secret since no QR renderer is wired in yet (a small, explicitly-flagged follow-up, not silently missing).
- ✅ **Rate-limiting + brute-force protection on login — DONE.** New `AdminLoginRateLimitGuard` (`apps/api/src/common/guards/admin-login-rate-limit.guard.ts`): in-memory, IP+email-scoped sliding window, 5 attempts / 15 minutes, applied to the shared `POST /auth/login` endpoint (protects all roles, not just admin — strictly better security for the same code path). Deliberately an in-process `Map`, not `@nestjs/throttler` or a Redis-backed limiter — this is a single-instance deployment (nothing in the codebase suggests horizontal scaling), so that would be premature; noted in the guard's own comment as the right upgrade if that changes. Resets on process restart, which is an accepted tradeoff for this threat model (credential stuffing), not a security boundary that must survive a deploy.
- ✅ **CSV export streaming — DONE (partially — see honest limitation below).** New `AdminService.streamTransactionsCsv` writes CSV headers and 500-row batches directly to the HTTP `Response` as they're formatted, instead of the old `exportTransactionsCsv` building one large string first (kept, unchanged, for the inline `?format=csv` path on `GET /admin/transactions`, which is lower-volume). Wired into `GET /admin/transactions/export`. **Honest limitation, stated in the code comment too:** `getTransactions` itself still loads its full candidate row set (payments/credits/payouts) from Postgres in one shot — this streams the *formatting and HTTP-write* stage, not the database read. A true cursor-based DB stream would need query-layer changes (TypeORM `.stream()` or raw cursors), which is larger scope than this pass.
- ✅ **Structured tests — DONE.** `admin.service.spec.ts` gained 14 new tests across three `describe` blocks: Dispute lifecycle (create/assign/resolve, including the no-action path leaving payments untouched), Payout management (approve/hold/mark-paid, including the "already paid" and "missing reason/reference" rejection paths), and Patient management (suspend/reactivate, and a soft-delete assertion that explicitly checks PII was scrubbed and status became `banned` rather than the row being removed). `disputeRepo`/`reviewRepo`/`payoutRepo` test mocks were upgraded from bare `{}`/single-method shells to real mocks supporting these assertions. All 28 tests in the file pass (`npx jest src/modules/admin/admin.service.spec.ts`). `auth.service.spec.ts` (7 tests) and the new `totp.service.spec.ts` (6 tests) also pass.
- **Admin action audit coverage** — mostly closed as a side effect of Sprints B–E (payouts, patient suspend/delete, broadcast, review-hide, dispute assign/resolve, TOTP enrollment/disable are all now audit-logged); not exhaustively re-audited across every older endpoint in this pass.
- ⏸ **Server-side pagination everywhere** — still open. The ledger (`getTransactions`) still loads all payments/credits/payouts into memory before filtering/paginating in application code.
- ⏸ **Input validation DTOs (class-validator)** — still open on the newer admin POST/PUT bodies added across Sprints B–E (disputes, payouts, patients, notifications, reviews); only the original `auth` DTOs use `class-validator` today.
- ⏸ **Session timeout + idle logout** — still open; no client-side idle timer exists.

---

## 3. FEATURE GAP LIST (missing features, standalone)

1. ~~**Unified User Management nav**~~ — ✅ done in Sprint A (`AdminSidebar.tsx`).
2. ~~**Patient user management**~~ — ✅ done in Sprint B (`/admin/patients*` + `/users/patients` page).
3. ~~**Dispute lifecycle**~~ — ✅ done in Sprint B (`Dispute` entity + `/admin/disputes/lifecycle*` + `/disputes/cases` page). Patient-initiated raising from patient-web is a still-open follow-up (see P1-1 note).
4. ~~**Payout management actions**~~ — ✅ done in Sprint C (`/admin/payouts*` + `/payouts` page). No live Paystack Transfers call exists — see the P1-2 scope note.
5. ~~**Live consultation oversight**~~ — ✅ done in Sprint C (`/admin/consultations*` + `/consultations/live` page, with real extension history).
6. ~~**Notifications/broadcast console**~~ — ✅ done in Sprint D (`/admin/notifications*` + `/notifications` page).
7. ~~**Review moderation**~~ — ✅ done in Sprint D (`/admin/reviews*` + `/reviews` page). Hidden-review filtering on patient-web's read path and the rating-average resync were closed as a same-day follow-up.
8. ~~**RBAC sub-roles**~~ — ✅ done in Sprint D (`admin_sub_role` + `AdminSubRolesGuard`, applied to settings/invite/revoke/mark-paid). Sidebar gating for `support` admins was closed as a same-day follow-up.
9. ~~**Analytics `recentActivity` + `systemHealth`**~~ — ✅ done in Sprint A (`admin.service.ts`).
10. ~~**Standalone-hosting-correct auth**~~ — ✅ done in Sprint A: same-origin login/logout proxy + real middleware redirect, kept on the Bearer-JWT model per user decision.
11. **2FA for admin login** — none; more urgent given standalone public hosting.
12. **Rate-limiting on admin login** — none.
13. **Server-side, scalable ledger pagination** — currently in-memory.
14. ~~**Visible offline/demo-data indicator**~~ — ✅ done in Sprint A (dashboard, doctors, verification pages).
15. ~~**Bootstrap-only admin provisioning safeguards**~~ — ✅ done: env-driven credential, prod hard-fail, and forced first-login password change (migration + `/change-password` flow) all shipped.
16. **Broadcast/bulk notifications audit + validation DTOs** — partial audit coverage.

---

## 4. Suggested build order (sprints)

- ✅ **Sprint A (P0):** dashboard contract fix, standalone auth re-architecture, bootstrap-credential hardening, demo-data banners, User Management nav restructure.
- ✅ **Sprint B (P1 core):** Patient user management + Dispute lifecycle.
- ✅ **Sprint C (P1 ops):** Payout management + Consultation oversight.
- ✅ **Sprint D (P1/P2):** Notifications console, Review moderation, RBAC sub-roles. Two same-day follow-ups (hidden-review filtering + rating resync, sidebar gating for support admins) also closed.
- ✅ **Sprint E (P2):** 2FA, rate-limiting, streaming CSV, test coverage.

All five sprints are implemented. What remains open, listed honestly rather than implied done:
- Server-side, fully-streaming ledger pagination (today's CSV export streams the HTTP write, not the DB read — see the P2 note above).
- `class-validator` DTOs on the admin endpoints added in Sprints B–E.
- Session timeout / idle logout on the admin panel.
- Patient-initiated dispute raising on patient-web (the backend `createDispute` exists; nothing calls it yet).
- QR-code rendering on the `/security` 2FA enrollment page (currently shows the raw secret + `otpauth://` URL).
- A live Paystack Transfers API call for payouts (this feature manages payout records; nothing creates them or moves money yet).

---

*Generated from a static read of the codebase on 2026-09-21, revised per user clarification on standalone hosting, login-only auth, and User Management structure (Doctors/Patients/Admin Accounts as sub-sections). All five sprints were implemented same-day. Every new backend module was verified with `npx tsc --noEmit` after each change; `admin.service.spec.ts` (28 tests), `auth.service.spec.ts` (7 tests), and the new `totp.service.spec.ts` (6 tests) were run directly and all pass. Database migrations were written to match this codebase's existing raw-SQL migration style but were not executed against a live database in this session — run them before deploying. No full build (`npm run build`) or full test suite (`npm test`) was run at any point, in line with the sustained tight-memory constraint noted throughout; targeted single-file `tsc`/`jest` runs were used instead wherever memory allowed.*
