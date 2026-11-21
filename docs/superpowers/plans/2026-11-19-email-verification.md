# Email Verification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require real accounts to verify their email before private app access, while preserving Google verification, recovery security, rate limits, and privacy.

**Architecture:** Add a one-use, expiring email-verification token table storing only SHA-256 token digests. Registration creates the account and sends a verification link through the existing mail transport; login returns a dedicated verification-required response until the token is redeemed. The React access flow gains resend and verification-complete states without exposing whether arbitrary emails exist.

**Tech Stack:** Express 5, SQLite `node:sqlite`, Zod, Nodemailer transport, React 19, Vite, Node test runner.

**Spec:** Approved design in the conversation: email verification with hashed tokens, expiry, limited resend, Google accounts verified automatically, and restricted access until verification.

## Global Constraints

- Never place passwords, mail credentials, verification tokens, or private keys in chat, logs, Git, or public assets.
- Store only SHA-256 verification-token digests; the raw token exists only in the generated HTTPS link.
- Do not reveal whether an arbitrary email belongs to an account from verification or resend endpoints.
- Preserve existing password recovery behavior and Google OAuth behavior.
- Use additive SQLite migrations and keep the existing API error style.
- Do not create a commit or deploy until explicitly requested.

---

### Task 1: Add verification storage and mail primitives

**Files:**
- Modify: `server/db.mjs` migration block and schema indexes
- Modify: `server/mail.mjs` mail helpers
- Modify: `.env.example` mail configuration comments if a verification origin setting is needed
- Test: `tests/recovery.test.mjs` or a new `tests/email-verification.test.mjs`

**Interfaces:**
- Produce `email_verifications(token_hash TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, expires_at INTEGER, created_at INTEGER, consumed_at INTEGER)`.
- Produce a mail helper `sendVerificationEmail({ to, token, locale })` that uses the configured HTTPS origin and never logs the token.
- Produce a bounded verification resend window using the existing recovery request throttling pattern.

- [ ] **Step 1: Write failing storage and mail tests**

Cover token digest persistence, expiry fields, one-use consumption, unknown-email response equivalence, and the requirement that the generated message contains the HTTPS verification URL without logging the raw token.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run: `corepack pnpm test -- tests/email-verification.test.mjs`
Expected: FAIL because the verification table and mail helper do not exist.

- [ ] **Step 3: Add the additive migration and mail helper**

Add the table and indexes in `openDatabase()`. Add a mail helper that builds `/app?verify_email=<token>` from the configured HTTPS origin, uses localized subject/body text, and sends through the existing transport without returning or logging credentials.

- [ ] **Step 4: Run focused tests**

Run: `corepack pnpm test -- tests/email-verification.test.mjs`
Expected: PASS for storage and mail primitives.

---

### Task 2: Integrate registration, login, resend, and redemption

**Files:**
- Modify: `server/app.mjs` registration/login routes and auth helpers
- Modify: `server/recovery.mjs` only if shared throttling or token utilities belong there
- Modify: `server/routes.mjs` to allow the verification return route
- Test: `tests/email-verification.test.mjs`

**Interfaces:**
- `POST /api/auth/verify-email`: accepts `{ token }`, consumes one valid token, sets `users.email_verified_at`, revokes prior verification tokens, and creates no session automatically.
- `POST /api/auth/resend-verification`: accepts `{ email }`, always returns the same success response, sends only when an unverified real account exists, and enforces a per-email cooldown/window.
- Registration returns `emailVerificationRequired: true` and sends the first verification mail for password accounts.
- Login returns HTTP `403` with `{ code: 'EMAIL_VERIFICATION_REQUIRED' }` for an unverified password account; Google accounts are marked verified during creation.

- [ ] **Step 1: Add failing route tests**

Test registration creates an unverified account, login is restricted, resend does not disclose unknown emails, a valid token verifies exactly once, expired tokens fail, and a password reset does not bypass verification.

- [ ] **Step 2: Run focused tests and confirm failure**

Run: `corepack pnpm test -- tests/email-verification.test.mjs`
Expected: FAIL because the routes and account field do not exist.

- [ ] **Step 3: Implement the server flow**

Add `email_verified_at` through an additive migration. Generate 32 random bytes, store only the digest, expire tokens after 24 hours, revoke prior tokens for the account, and send the email after registration. Use a 15-minute resend cooldown and a bounded daily window. Verify tokens inside `BEGIN IMMEDIATE`, reject consumed/expired tokens, set the timestamp, and commit once. Keep the response for unknown email identical to the success response.

- [ ] **Step 4: Add login and auth enforcement**

Password login must reject unverified accounts with the dedicated code before creating a session. Existing Google users and new Google registrations must set `email_verified_at` immediately. Existing already-verified accounts remain unchanged.

- [ ] **Step 5: Run focused tests**

Run: `corepack pnpm test -- tests/email-verification.test.mjs`
Expected: PASS for registration, login restriction, resend privacy, expiry, one-use redemption, and Google exemption.

---

### Task 3: Add the access UI and verification return flow

**Files:**
- Modify: `src/App.jsx` registration/login states and auth-error handling
- Modify: `src/api-client.mjs` only if a typed `EMAIL_VERIFICATION_REQUIRED` error is needed
- Modify: `src/main.jsx` and `server/routes.mjs` for `/verificar-correo` or the chosen return route
- Modify: `src/translations.json`
- Modify: `src/styles.css` or the access stylesheet
- Test: `tests/routes.test.mjs` and existing frontend/auth tests

**Interfaces:**
- A password registration success shows a verification-required view with resend and change-email actions.
- Login code `EMAIL_VERIFICATION_REQUIRED` shows the same view without clearing unrelated saved state.
- Visiting the verification link calls `/api/auth/verify-email`, displays success/failure, and links to `/app`; it never signs the user in automatically.
- Resend actions disable during the request and show generic success/error copy.

- [ ] **Step 1: Add route and state tests**

Cover the verification route returning the SPA, the verification-required login state, and the fact that successful verification does not create an authenticated session.

- [ ] **Step 2: Implement the UI state**

Add a small access panel using existing `Button`, localization, and API client patterns. Preserve the existing Google path, password recovery path, remembered-login behavior, and demo isolation.

- [ ] **Step 3: Add localized copy and responsive styling**

Add Spanish, English, and German strings for verification, resend, expiration, success, and generic failure. Keep all controls usable above the mobile safe area.

- [ ] **Step 4: Run the focused suite and build**

Run: `corepack pnpm test -- tests/routes.test.mjs tests/email-verification.test.mjs && corepack pnpm build`
Expected: PASS and a production Vite build.

---

### Task 4: Documentation and full regression verification

**Files:**
- Modify: `docs/RECUPERACION.md` or create `docs/VERIFICACION-CORREO.md` only if the existing document cannot contain the flow
- Modify: `docs/OPERACION.md`
- Modify: `README.md`
- Test: all `tests/*.test.mjs`

**Interfaces:**
- Documentation explains SMTP configuration, HTTPS callback URL, token lifetime, resend limits, Google exemption, and the fact that verification does not auto-login.

- [ ] **Step 1: Document operator configuration and privacy behavior**

Describe required mail configuration without including any secret values. State that verification tokens are digests, unknown addresses receive the same response, and support must handle inaccessible email accounts.

- [ ] **Step 2: Run complete verification**

Run: `corepack pnpm check && corepack pnpm test && corepack pnpm build && git diff --check`
Expected: all tests pass, build succeeds, and no whitespace errors are reported.

- [ ] **Step 3: Manually verify the web flow**

Start the local server, open `/app`, verify the unverified state and resend feedback, open the verification return route with a test token, confirm success/failure states, and verify `/demo` remains independent. Stop the local server after QA.
