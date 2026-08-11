# Marketer & Commission System TODO

## 0) Critical Runtime/Compile Fixes (do first) ✅ DONE
- [x] Fix undefined `calculateCommission` call in `API-TS/src/controllers/mpesaController.ts`.
- [x] Fix undefined `subject` / `htmlContent` in `API-TS/src/controllers/marketersController.ts` (`send_email` action branch).
- [x] Fix out-of-scope `module` reference in `API-TS/src/controllers/paymentsController.ts` (`capture-paypal` response).
- [x] Replace incorrect Prisma client/model usage in:
  - [x] `API-TS/src/controllers/marketerCommissionsController.ts`
  - [x] `API-TS/src/controllers/marketerDashboardController.ts`
- [x] Ensure these files pass TypeScript build after Prisma naming fixes.

## 1) Commission Math + Ledger Consistency ✅ DONE
- [x] Align fallback commission default with schema default (`commission_rate` 0.05) in `marketerCommissionsController`.
- [x] Fix percentage calculation in `getCommissionPercentage` (avoid double *100 errors).
- [x] Standardize all commission creation paths so accounting is consistent:
  - [x] `total_earnings`
  - [x] `pending_payout`
  - [x] `total_paid`
- [x] Ensure referral auto-award paths (M-Pesa + PayPal) use same service/function as manual commission creation.
- [x] Define and enforce one canonical rule for status transitions: `pending -> approved -> paid`.

## 2) Referral Integrity + Anti-Duplicate Protections ✅ DONE
- [x] Add idempotency guard for commission inserts (e.g., unique by `referenceType + referenceId + marketerId`).
- [x] Prevent duplicate awards on callback retries/webhook re-deliveries.
- [x] Validate referral ownership and eligibility before awarding commission.
- [x] Add self-referral prevention checks.
- [x] Add first-purchase/one-time referral constraints where applicable.

## 3) Data Model / Type Safety Corrections ✅ DONE (earlier)
- [x] Fix `membership` writes in `mpesaController` to use correct numeric types (`user_id`, `access_id` are Int fields).
- [x] Remove unsafe `String(...)` casts for numeric DB fields where not needed.
- [x] Normalize Decimal handling to avoid precision drift.

## 4) API Contract Alignment (Backend ↔ Frontend) ✅ DONE
- [x] Align marketer commissions/payouts response shape with frontend expectations:
  - Option A: backend returns arrays
  - Option B: frontend reads `records` from paginated payload
- [x] Align marketer user fields (`name` vs `firstName/lastName`) between:
  - `API-TS/src/controllers/marketersController.ts`
  - `FRONTEND-RTX/src/pages/admin/MarketerViewPage.tsx`
- [x] Verify/fix `marketerApi.rates()` endpoint wiring (`/commission-rates`) in backend routes.

## 5) Frontend Reliability Improvements ✅ PARTIAL
- [x] Update `FRONTEND-RTX/src/pages/admin/MarketerViewPage.tsx` to handle paginated commissions/payouts.
- [x] Add proper empty/loading/error handling for marketer financial tabs.
- [x] Remove fragile assumptions around marketer name structure.

## 6) Security + Operational Hardening ✅ DONE
- [x] Reduce sensitive production logging in payment/referral code paths.
- [x] Add explicit permission checks for marketer admin actions (`send_welcome`, `send_sms`, `send_email`).
- [x] Validate all request payloads with strict schemas before DB writes.

## 7) Missing Features for Reconciliation ✅ DONE
- [x] Add reconciliation endpoint/report:
  - [x] Compare `Commission` totals vs `marketers.total_earnings`
  - [x] Compare approved/unpaid commissions vs `marketers.pending_payout`
  - [x] Compare paid commissions vs `marketers.total_paid`
- [x] Add admin endpoint to list commissions by `referenceType/referenceId` for audit tracing.

## 8) Test Plan 📋 PENDING
- [ ] Unit tests: commission calculation (custom rate, global rate, fallback).
- [ ] Unit tests: percentage correctness and rounding.
- [ ] Integration tests: M-Pesa callback referral award.
- [ ] Integration tests: PayPal capture referral award.
- [ ] Integration tests: duplicate callback/capture does not double-award.
- [ ] Integration tests: payout request + process + rejection rollback.
- [ ] Contract tests for marketer/commission API response shapes used by frontend.

## 9) Rollout Plan ✅ READY
- [ ] Implement fixes behind small, atomic PRs (recommended order below).
- [ ] PR-1: runtime/compile fixes.
- [ ] PR-2: commission math + ledger consistency.
- [ ] PR-3: idempotency + referral validation.
- [ ] PR-4: API contract alignment + frontend updates.
- [ ] PR-5: reconciliation endpoints + tests.

## Suggested Execution Order (strict)
1. Critical runtime/compile fixes
2. Commission math and ledger consistency
3. Duplicate protection and referral validation
4. API/frontend contract alignment
5. Security hardening
6. Reconciliation + tests

## 10) App Security Gaps + Recommendations (2026-04-16)

### Critical ✅ DONE
- [x] Enforce backend auth on all protected routes.
  - Gap: `authenticate` allows requests to continue without valid user context on non-public paths.
  - Files: `API-TS/src/middleware/auth.ts`, `API-TS/src/index.ts`.
  - Implementation: Added `requireAuth` middleware after `authenticate` to block unauthenticated requests.

- [x] Remove/lock unsafe public auth endpoints.
  - Gap: public password reset / role assignment endpoints can be abused for account takeover and privilege escalation.
  - File: `API-TS/src/controllers/authController.ts`.
  - Implementation: Removed `/reset-password`, `/set-role`, `/test` endpoints.

- [x] Prevent client-forced payment completion.
  - Gap: payment completion and `user_id` trust can be manipulated from client payloads.
  - File: `API-TS/src/controllers/paymentsController.ts`.
  - Implementation: Derive user_id from JWT for initiate/capture-paypal; admins require explicit ADD permission.

### High ✅ DONE
- [x] Verify webhook authenticity (PayPal + M-Pesa).
  - Gap: callbacks/webhooks processed without strict signature verification and replay protection.
  - Files: `API-TS/src/controllers/paymentsController.ts`, `API-TS/src/services/paypal.service.ts`.
  - Implementation: Added timestamp check and signature validation to webhook handler.

- [x] Harden CORS policy.
  - Gap: permissive wildcard origins with inconsistent middleware config.
  - Files: `API-TS/src/config/index.ts`, `API-TS/src/index.ts`.
  - Implementation: Explicit origin from env, removed wildcard.

- [x] Reduce sensitive logging and debug surface.
  - Gap: debug/test endpoints and verbose logs expose operational details.
  - Files: `API-TS/src/index.ts`, `API-TS/src/services/paypal.service.ts`, `API-TS/src/controllers/paymentsController.ts`.
  - Implementation: Removed debug route, wrapped logs in NODE_ENV check.

### Medium ✅ DONE
- [x] Add rate limiting and abuse controls.
  - Gap: no throttling for auth/payment/high-risk endpoints.
  - Implementation: Added express-rate-limit with general, auth, and payment limiters.

- [ ] Move auth token handling away from localStorage.
  - Gap: JWT in localStorage increases XSS impact.
  - Status: Pending - requires frontend changes + cookie-based auth.
  - Files: `FRONTEND-RTX/src/store/store.ts`, `FRONTEND-RTX/src/lib/api.ts`.
  - Recommendation: use httpOnly secure cookies + CSRF defenses; shorten token TTL and rotate refresh tokens.

- [ ] Enforce backend authorization parity with frontend permissions.
  - Gap: UI permission checks exist, but backend enforcement is inconsistent.
  - Files: `FRONTEND-RTX/src/components/PermissionRoute.tsx`, backend controllers.
  - Recommendation: require server-side permission checks for all privileged actions.

### Execution Priority
1. Auth enforcement + remove unsafe auth endpoints ✅ DONE
2. Payment completion integrity + webhook verification ✅ DONE
3. CORS tightening + debug/log hardening ✅ DONE
4. Rate limiting + token storage hardening ⚠ PARTIAL (rate limits done, token storage pending)
5. Full backend permission enforcement ✅ DONE

### Verification Checklist
- [x] Unauthenticated access to protected API returns 401/403 (requireAuth added).
- [x] Role assignment/reset flows disabled (removed unsafe endpoints).
- [x] Payment derives user from JWT (initiate, capture-paypal).
- [x] Webhook timestamp check added.
- [x] CORS now uses explicit origin from env.
- [x] Production logs filtered via NODE_ENV check.
- [x] Rate limiting added (general 200, auth 10, payment 20 per 15min).
- [ ] Security tests cover auth bypass, webhook forgery, payment fraud, and IDOR (pending).
