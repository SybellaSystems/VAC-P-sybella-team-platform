# PHASE 1 — Risk Assessment Report

**Platform:** VAC-P  
**Date:** June 2026  
**Review type:** Pre-upgrade architecture audit

---

## 1. Risk summary

| Priority | Count | Must resolve before |
|----------|-------|---------------------|
| Critical | 4 | Phase 2 (Phase 1.5) |
| High | 6 | Phase 3–4 |
| Medium | 5 | Phase 5–8 |
| Low | 3 | Phase 12 |

---

## 2. Critical risks

### R-C1: Unauthenticated privileged API routes

**Description:** Several server routes accept requests without verifying the caller:

- `POST /api/email` — sends arbitrary email via SendGrid
- `POST /api/notifications/broadcast` — inserts notifications for all active users (service role)
- `POST /api/stripe/checkout` — creates checkout sessions
- `GET /api/integrations/project/[projectId]` — reads integration config (credentials stripped but metadata exposed)

**Impact:** Spam, notification flooding, unauthorized data access, billing abuse.

**Likelihood:** High if endpoints are publicly reachable on Netlify.

**Mitigation:**
1. Add session verification middleware (Supabase JWT from cookie/header) or shared admin API key
2. Restrict broadcast and email routes to admin role only
3. Rate-limit public-facing API routes
4. Add integration API auth (project membership check)

**Owner:** Backend / Phase 1.5  
**Rollback:** Feature-flag new auth checks; keep legacy header for one release

---

### R-C2: Client-only route protection

**Description:** `app/(app)/layout.tsx` guards routes in `useEffect` after render. No `middleware.ts` exists.

**Impact:** Brief exposure of layout shell; deep links may flash content; inconsistent with server API trust model.

**Mitigation:**
1. Add Next.js middleware with Supabase session cookie validation for `(app)/*`
2. Align API routes with same session model

**Owner:** Platform / Phase 1.5

---

### R-C3: Role enum schema drift

**Description:** `lib/rbac.ts` defines `ceo`, `operations`, `customer_support` but DB CHECK on `profiles.role` (migration `20260514120000`) allows only 12 roles.

**Impact:** Profile insert/update failures; admin UI may assign invalid roles.

**Mitigation:**
1. Additive migration to extend CHECK constraint
2. Sync `ALL_ROLES` with DB constraint via generated types or CI check

**Owner:** Database / Phase 1.5  
**Rollback:** Down migration restores previous CHECK; backfill invalid roles first

---

### R-C4: Broken email queue reference

**Description:** `lib/email.ts` imports `createServerSupabase` but `queueEmail()` calls undefined `supabase` and inserts into `email_queue` table that **does not exist** in migrations.

**Impact:** Runtime error when `ENABLE_EMAIL_QUEUE=true`; email fallback path fails silently.

**Mitigation:**
1. Either add `email_queue` migration + fix import, or remove dead code path
2. Add unit test for email send + queue fallback

**Owner:** Backend / Phase 1.5

---

## 3. High risks

### R-H1: RLS policy regression on migration

**Description:** 8 migration files with overlapping `CREATE IF NOT EXISTS` and policy drops. Schema changes in Phases 4–11 will touch RLS-heavy tables.

**Impact:** Data lockout, cross-tenant leakage (if multi-tenant added), finance/share exposure.

**Mitigation:**
- Additive migrations only; test on staging snapshot
- Document down-scripts per migration
- Post-migration RLS verification script (role × table matrix)

**Owner:** Database / every schema phase

---

### R-H2: Offline-first scope creep

**Description:** User requirements mandate offline-first sync for all features. No IndexedDB, sync queue, or conflict resolution exists.

**Impact:** Multi-month effort; data conflicts; duplicate writes.

**Mitigation:**
- Phase sync incrementally: Phase 4 (projects/tasks) → Phase 6 (import rows) → Phase 5 (messages)
- Define last-write-wins vs merge rules per entity
- Do not block Phase 2 UX on full offline

**Owner:** Architecture / Phase 4+

---

### R-H3: Direct client Supabase writes on complex workflows

**Description:** Budget approvals, shares, HR updates use client anon key with RLS. Complex multi-table updates lack transactions.

**Impact:** Partial updates, race conditions, inconsistent approval state.

**Mitigation:**
- Move multi-step writes to RPC or API routes with service role + auth check
- Use Postgres functions for atomic approval transitions

**Owner:** Backend / Phase 4, 11

---

### R-H4: Integration credential storage

**Description:** `project_integrations.credentials` stored as JSONB; client pages can create integrations via anon client.

**Impact:** Credential exposure if RLS misconfigured; XSS exfiltration from client.

**Mitigation:**
- Server-only credential writes; never return credentials to client (API already strips — verify RLS)
- Encrypt credentials at rest (Supabase vault or pgcrypto)

**Owner:** Security / Phase 4

---

### R-H5: Insufficient automated testing

**Description:** CI runs lint, typecheck, build. `npm test` runs smoke (typecheck + supabase scan) with `|| true` in CI workflow.

**Impact:** Regressions undetected across 25 pages and 30 tables.

**Mitigation:**
- Playwright E2E for 5 critical flows
- API integration tests for webhook + auth
- Remove `|| true` from CI test step once tests exist

**Owner:** QA / Phase 1.5, 12

---

### R-H6: Stripe webhook without signature verification

**Description:** `app/api/stripe/webhook/route.ts` parses JSON without Stripe signature validation.

**Impact:** Forged webhook events logged to audit; future subscription logic could be corrupted.

**Mitigation:** Implement `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`

**Owner:** Billing / Phase 3

---

## 4. Medium risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-M1 | Large form UX refactor breaks validation | Pilot one form; preserve zod schemas |
| R-M2 | Orphan routes (/admin, /billing, /marketing) confuse users | Add to RBAC nav in Phase 2 |
| R-M3 | XLSX import throws — users blocked | Add `xlsx` package in Phase 6 |
| R-M4 | Realtime subscription leaks on unmount | NotificationContext already removes channel — audit other pages |
| R-M5 | Netlify build credits on full CI | Cache node_modules; split heavy E2E to nightly |

---

## 5. Low risks

| ID | Risk | Mitigation |
|----|------|------------|
| R-L1 | Next.js 13.5 EOL / security patches | Plan framework upgrade post-Phase 12 |
| R-L2 | `Database = any` weak typing | Regenerate types from Supabase CLI |
| R-L3 | PWA service worker cache stale assets | Existing update toast — monitor |

---

## 6. Risk heat map

```
Impact ↑
  Critical │ R-C1  R-C3  R-H1
  High     │ R-C2  R-H2  R-H5
  Medium   │ R-H4  R-M1  R-M3
  Low      │ R-L1  R-L2
           └────────────────→ Likelihood
             Low    Med    High
```

---

## 7. Pre-Phase 2 gate checklist

- [ ] R-C1: API routes authenticated
- [ ] R-C3: Role enum migration applied on staging
- [ ] R-C4: Email queue fixed or removed
- [ ] R-H5: E2E smoke test green on staging
- [ ] R-H1: Migration rollback tested once
- [ ] Baseline performance snapshot captured (dashboard load time)

---

## 8. Monitoring recommendations

| Signal | Tool | Threshold |
|--------|------|-----------|
| API 4xx/5xx rate | Netlify logs / Sentry | > 1% of requests |
| Supabase RLS denials | Supabase logs | Spike after migration |
| Failed auth | Auth dashboard | Unusual geo/IP |
| Email bounce rate | SendGrid | > 5% |
| Build failures | GitHub Actions | Block merge |

`lib/error-monitoring.ts` exists — wire to production DSN in Phase 1.5.

---

*This assessment supports UPGRADE_ROADMAP.md gating criteria.*
