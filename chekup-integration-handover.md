# Chekup SSO & Directory Handover

> **Status:** The handshake described below is real and already built — not a proposal. Verified against the code on 14 Sep 2026 (`apps/api/src/modules/oidc`, `apps/api/src/modules/partner-directory`).
> **Companion docs:** `docs/plans/locumstaff-roadmap.md` (LS–RM–01, original scope) · `docs/plans/telehealth-extraction-plan.md` (what needs to move out of LocumStaff into the new app — read that one too if you're standing up the new app from scratch)
> **Audience:** whoever is building the new consultation app (in-house now, not a third-party) — this is the contract to connect against.

---

## 1. What this covers, and what it doesn't

LocumStaff is the identity and staffing source of truth. It hands over two things, both read-only, both already implemented:

1. **Doctor directory + availability** — a server-to-server API your backend calls.
2. **SSO** — a doctor already signed into the LocumStaff mobile app lands in your app already authenticated, via a standard OIDC authorization-code + PKCE flow.

**LocumStaff will not send or receive patient data, bookings, or consult records.** Nothing below writes anything back to LocumStaff. If your app needs something beyond a doctor's name/specialty/photo/facility and their duty windows, that's new scope on the LocumStaff side, not something implied by this handover — ask before assuming it.

### 1.1 Eligibility — read this before you build against it

A doctor is currently eligible for both the directory and SSO if:
- `role = LOCUM`
- `status = VERIFIED`
- `profile.profession = GENERAL_PRACTITIONER` (the only value in scope at launch — see `ELIGIBLE_PROFESSIONS` in both `oidc.service.ts` and `partner-directory.service.ts`)

**⚠️ Known gap, not yet fixed:** you told this session doctors should only get SSO into the new app if they've signified willingness to do virtual consultations (`Profile.willingToDoVirtualConsultations`). The availability feed already reports this per-window (see §3.2), but **`authorize()` in `oidc.service.ts` does not currently check it** — today, any `VERIFIED` GP can complete SSO regardless of that flag. This needs a one-line addition to the eligibility check in both `authorize()` and the re-check inside `token()` before this can be trusted to match what you actually want. Flagging it here rather than fixing it silently — say the word if you want it patched now.

---

## 2. SSO handshake (OIDC, authorization code + PKCE)

### 2.1 Why it's shaped this way

There's no LocumStaff-hosted browser login page to redirect a user to — the doctor is already signed into the **native mobile app** with a LocumStaff JWT. So the flow is adapted: the mobile app calls `/authorize` directly (as an authenticated API call, not a browser redirect) and gets back a URL to open, which already contains the authorization code. From your app's perspective past that point, it's a standard OIDC exchange.

```
Doctor already signed into LocumStaff mobile app
        │
        ▼
Mobile app calls POST /v1/oidc/authorize (own LocumStaff JWT)
        │  → { redirectUrl: "https://<your-app>/callback?code=...&state=..." }
        ▼
Mobile app opens redirectUrl (your app's callback)
        │
        ▼
Your backend calls POST /v1/oidc/token (client_id + client_secret + code [+ code_verifier])
        │  → { id_token, token_type: "Bearer", expires_in }
        ▼
Your backend verifies id_token against LocumStaff's JWKS → doctor is authenticated
```

### 2.2 Discovery & keys

- `GET /.well-known/openid-configuration` — unprefixed (not under `/v1`), so any standard OIDC client library can auto-discover everything else from just the issuer origin.
- `GET /v1/oidc/jwks.json` — RS256 public signing key(s), `kid`-tagged. The keypair is generated once on first use and persisted server-side (not admin-rotatable today — if you need rotation, that's a LocumStaff-side change to request, not something you handle client-side beyond honoring `kid`).
- Issuer is `API_PUBLIC_URL` (must be set in LocumStaff's production env — currently falls back to `http://localhost:PORT` with a warning if unset, which will not verify correctly against a real deployed instance of your app).

### 2.3 `POST /v1/oidc/authorize`

Called by the **LocumStaff mobile app**, authenticated with the doctor's own LocumStaff JWT (`Authorization: Bearer <locumstaff-jwt>`). This is not something your app calls.

Request body (all optional — see note below):

```json
{
  "redirect_uri": "https://<your-app>/oidc/callback",
  "response_type": "code",
  "scope": "openid profile email",
  "state": "opaque-value-you-generated",
  "nonce": "opaque-value-you-generated",
  "code_challenge": "base64url(sha256(code_verifier))",
  "code_challenge_method": "S256"
}
```

`client_id`/`redirect_uri` are optional today because there's exactly one registered client — if provided, they're validated against the configured value; if omitted, the server uses the one registered client. **Use PKCE** (`code_challenge`/`code_verifier`) — there's no reason not to, and it's the only replay protection on the code beyond its 60-second TTL and single-use enforcement.

Response:
```json
{ "redirectUrl": "https://<your-app>/oidc/callback?code=<code>&state=<state>" }
```
Errors: `403 Forbidden` if the doctor doesn't meet eligibility (§1.1); `503` if your app isn't registered yet (see §4); `400` if a provided `client_id`/`redirect_uri` doesn't match what's configured.

### 2.4 `POST /v1/oidc/token`

Called by **your backend**, not your frontend — it needs `client_secret`.

Request (`application/json`):
```json
{
  "grant_type": "authorization_code",
  "code": "<code from the callback>",
  "redirect_uri": "https://<your-app>/oidc/callback",
  "client_id": "<your client_id>",
  "client_secret": "<your client_secret>",
  "code_verifier": "<original random string, if you sent code_challenge>"
}
```

Response:
```json
{ "id_token": "<RS256 JWT>", "token_type": "Bearer", "expires_in": 300 }
```

ID token claims:
```json
{
  "sub": "user-uuid",
  "iss": "https://api.locumstaff.example",
  "aud": "<your client_id>",
  "iat": 1234567890,
  "exp": 1234568190,
  "email": "doctor@example.com",
  "given_name": "Jane",
  "family_name": "Doe",
  "name": "Jane Doe",
  "profession": "GENERAL_PRACTITIONER",
  "nonce": "<echoed back if you sent one>"
}
```

Codes are **single-use** (deleted from Redis on first exchange, whether or not the exchange succeeds) and expire after **60 seconds**. ID tokens are valid for **300 seconds** — this is an identity assertion for establishing a session in your app, not a long-lived API credential; mint your own session/token after this. Eligibility (`VERIFIED` status) is re-checked at exchange time, not just at `/authorize` — a doctor suspended in that window gets `401`, not a token.

Errors: `503` if not configured, `401` for bad `client_id`/`client_secret` or a doctor no longer `VERIFIED`, `400` for an invalid/expired/already-used code, a `redirect_uri`/`client_id` mismatch from the original `/authorize` call, or a failed `code_verifier` check.

---

## 3. Partner Directory API (doctor data pull)

Server-to-server only — your backend calls this, never your frontend, using a static API key (**not** the OIDC flow above, which is only for identifying a signed-in doctor).

**Auth:** `Authorization: Bearer <api-key>` or `X-API-Key: <api-key>` header. Constant-time compared server-side. `401` if missing/wrong, `503` if not yet configured.

### 3.1 `GET /v1/partner-directory/doctors`

No query params currently (returns all eligible doctors). Response:

```json
[
  {
    "id": "user-uuid",
    "firstName": "Jane",
    "lastName": "Doe",
    "title": "Dr",
    "photoUrl": "https://.../signed-url",
    "profession": "GENERAL_PRACTITIONER",
    "specialisations": ["Family Medicine", "Paediatrics"],
    "facility": { "id": "facility-uuid", "name": "Sunnyside Clinic", "address": "123 Main Rd" }
  }
]
```

Sorted by last name, then first name. `photoUrl` is a signed URL valid for 1 hour — don't cache it long-term, re-fetch if it's gone stale. `facility` is usually `null` for a locum (they're not tied to one practice the way a facility-manager account is) — don't treat it as required. **This is deliberately not the field a consult needs to know where the doctor is working** — that's per-window on the availability endpoint below, because it comes from the actual confirmed shift, not the doctor's general profile.

### 3.2 `GET /v1/partner-directory/availability`

Query params (all optional): `startDate` (`YYYY-MM-DD`, default today), `endDate` (`YYYY-MM-DD`, default +30 days), `doctorId` (restrict to one doctor's `id` from §3.1).

Response:
```json
[
  {
    "doctorId": "user-uuid",
    "start": "2026-09-20T08:00:00.000Z",
    "end": "2026-09-20T16:00:00.000Z",
    "branch": { "id": "branch-uuid", "name": "Sunnyside Clinic — Main", "address": "123 Main Rd" },
    "inPerson": true,
    "virtual": true
  }
]
```

Each window is a `CONFIRMED` shift with an accepted locum. `virtual` reflects that doctor's `willingToDoVirtualConsultations` preference — **this is a window-level flag on availability, not currently an eligibility gate on SSO** (see §1.1's known gap — don't assume the two are already in sync). **LocumStaff reports the window; your app owns dividing it into bookable appointment slots** — consult duration, buffer time, daily caps are entirely your decision, not something to ask LocumStaff to encode.

---

## 4. Getting registered / credentials

Nothing above works until your app is registered. This is currently entered by a LocumStaff admin under **Admin → System → Integrations** (`apps/admin/app/(dashboard)/system/integrations/page.tsx`), backed by `apps/api/src/modules/integrations-config`. Four values, all currently labeled "Chekup" in that UI and in `PlatformConfig` (`Chekup_DIRECTORY_API_KEY`, `Chekup_OIDC_CLIENT_ID`, `Chekup_OIDC_CLIENT_SECRET`, `Chekup_OIDC_REDIRECT_URI`) — worth relabeling once the new app has a real name, but functionally it's just config, not a hardcoded assumption about who's on the other end:

| Value | What it's for |
|---|---|
| Directory API key | §3's `Authorization`/`X-API-Key` header |
| OIDC client ID | §2.3/§2.4's `client_id` |
| OIDC client secret | §2.4's `client_secret` — never exposed client-side |
| OIDC redirect URI | Must exactly match what you send in `/authorize` and `/token` |

Only one client is supported today (the checks are written "the configured client," singular) — fine for a single new app, but flag it if you're ever adding a second consumer.

---

## 5. What you're on your own for

Everything past "here's who the doctor is and when they're free": patient identity/enrollment, appointment booking and its lifecycle, consult duration/buffer/capacity rules, video calling infrastructure, prescriptions, consultation notes, payment for the consult itself. Some of this already exists as a trial build inside the LocumStaff repo and is meant to be extracted into your new app rather than rebuilt from zero — see `docs/plans/telehealth-extraction-plan.md` for exactly what and how.

---

`Handover doc` · Last verified against code 14 Sep 2026
