# PRD: Main Flow Bug Fixes

> **Product**: Betali Inventory Management SaaS  
> **Feature**: Critical Bug Fixes — Auth, Multi-tenant, Inventory, API Layer  
> **Priority**: P0 (Blocking / Data Integrity)  
> **Status**: Not Started  
> **Reference**: `docs/architecture/BUG_REPORT.md`  
> **Target Release**: Next sprint  

---

## Executive Summary

A codebase audit identified 14 bugs across the four main application flows: authentication, multi-tenant organization management, inventory/stock movements, and the API integration layer. Six are HIGH severity, including one confirmed multi-tenant data isolation leak and two race conditions that cause users to see wrong data. This PRD defines the scope, acceptance criteria, and implementation plan to resolve all 14 issues.

---

## Problem Statement

### Current State
- `StockMovementRepository.findByDateRange()` returns results across ALL organizations — confirmed data isolation breach.
- `AuthContext` logout may not clear the React Query cache due to a stale closure.
- Organization switching fires API requests with the wrong `x-organization-id` header due to a localStorage/React state sync gap.
- Server crashes with 500 when a stock movement references a deleted lot or warehouse.
- API errors in product and stock movement hooks are silently swallowed, showing empty lists instead of error states.

### Impact
| Area | Risk |
|------|------|
| Data security | Cross-org stock movement data exposure |
| Auth | Stale cached data visible after logout |
| UX | Empty lists with no error feedback, wrong org data on switch |
| Reliability | Server 500 on deleted references, new org not appearing |

---

## Goals

1. Close the multi-tenant data isolation leak in stock movements.
2. Eliminate race conditions in auth and org-switching flows.
3. Prevent server crashes on missing referenced data.
4. Ensure API errors are always surfaced to the user.
5. Harden type contracts and middleware org validation.

---

## Non-Goals

- No new features in this PRD.
- No database schema changes (fixes are code-only).
- No UI redesign — only error state surfacing.

---

## Requirements

### Phase 1 — Data Integrity & Security (P0, do first)

#### REQ-1: Fix `findByDateRange` Organization Filter
- **Bug**: BUG-004
- **File**: `backend/repositories/StockMovementRepository.js:83-107`
- **Requirement**: `findByDateRange()` MUST always filter by `organization_id`. Either:
  - (a) Remove `findByDateRange()` and update all callers to use `findByDateRangeAndOrganization()`, or
  - (b) Merge both into a single method that requires `organizationId` as a non-optional parameter.
- **Acceptance Criteria**:
  - No query to `stock_movements` table is executed without an `organization_id` filter.
  - Existing tests updated; new test verifies org isolation.

---

#### REQ-2: Fix `StockMovementService.getMovementById()` Crash
- **Bug**: BUG-011
- **File**: `backend/services/StockMovementService.js:89-93`
- **Requirement**: `Promise.all` enrichment of lot and warehouse refs must not crash when a referenced entity is deleted.
- **Acceptance Criteria**:
  - If `findById` throws for lot or warehouse, return `null` for that field.
  - The endpoint returns 200 with `lot: null` / `warehouse: null` instead of 500.

---

### Phase 2 — Auth & Session Correctness (P0)

#### REQ-3: Fix Stale `queryClient` Closure in AuthContext
- **Bug**: BUG-001
- **File**: `frontend/src/context/AuthContext.tsx:83`
- **Requirement**: The `useEffect` that subscribes to auth state changes must not capture a stale `queryClient` reference.
- **Acceptance Criteria**:
  - `queryClient` added to dependency array, OR subscription stored in a ref that is always current.
  - Logging out clears all queries from the cache immediately.
  - Manual test: log in → create query data → log out → log in as different user → no previous user data visible.

---

#### REQ-4: Fix `useAuthStateChange` Ref Initialization
- **Bug**: BUG-006
- **File**: `frontend/src/hooks/useAuthStateChange.ts:15, 37-38`
- **Requirement**: 
  - Initialize `lastUserIdRef` as `null` (no type cast).
  - Compare session IDs (not user IDs) to deduplicate auth events.
- **Acceptance Criteria**:
  - `SIGNED_IN` event with same user ID but new session token triggers a full refresh.
  - No duplicate fetches on tab re-focus when session is unchanged.

---

### Phase 3 — Organization Switching Correctness (P1)

#### REQ-5: Fix Organization Header Race Condition
- **Bug**: BUG-003
- **File**: `frontend/src/services/http/httpClient.ts:24-32`
- **Requirement**: `x-organization-id` header must always match the currently active organization at the moment the request is made.
- **Approach**: 
  - Write to localStorage synchronously at the same time as state update (before re-renders trigger).
  - OR store org ID in a module-level variable that is updated before dispatching state changes.
- **Acceptance Criteria**:
  - After `switchOrganization()` resolves, all subsequent requests carry the new org ID.
  - No requests with the old org ID are made after the switch.

---

#### REQ-6: Fix Organization Init Race Condition
- **Bug**: BUG-002
- **File**: `frontend/src/context/OrganizationContext.tsx:91-107, 141-224`
- **Requirement**: The init effect must not override state set by `switchOrganization()`.
- **Approach**: Add `isSwitchingRef` boolean ref; skip init effect body when `isSwitchingRef.current === true`.
- **Acceptance Criteria**:
  - Rapid org switch during initial load always resolves to the user-selected org.
  - No flicker back to previous org after switch.

---

#### REQ-7: Fix `createOrganization` Error Handling
- **Bug**: BUG-005
- **File**: `frontend/src/context/OrganizationContext.tsx:296-354`
- **Requirement**: `createOrganization()` must:
  - Not use stale cache as fallback after a failed refetch.
  - Surface errors to the caller (reject the promise or throw).
- **Acceptance Criteria**:
  - Creating an org and then checking the switcher always shows the new org.
  - Network failure during refetch shows an error toast/message.

---

### Phase 4 — API Layer & Middleware (P1)

#### REQ-8: Fix Error Swallowing in `useProducts`
- **Bug**: BUG-008
- **File**: `frontend/src/hooks/useProducts.ts:31-32`
- **Requirement**: `queryFn` must re-throw errors so TanStack Query can manage error state.
- **Acceptance Criteria**:
  - API errors cause the query to enter `isError` state.
  - UI renders an error message instead of an empty list.

---

#### REQ-9: Fix `optionalOrganizationContext` Middleware
- **Bug**: BUG-009
- **File**: `backend/middleware/organizationContext.js:76-109`
- **Requirement**: Validate that the organization entity itself is active, not only the membership relationship.
- **Acceptance Criteria**:
  - Requests with a deactivated org ID return 403.
  - Active orgs are unaffected.

---

#### REQ-10: Standardize `stockMovementService` Response Shape
- **Bug**: BUG-010
- **File**: `frontend/src/services/api/stockMovementService.ts:37, 50, 144`
- **Requirement**: All methods return consistently shaped data. Remove `|| response` fallbacks.
- **Acceptance Criteria**:
  - All callers of `stockMovementService` receive `{ data: [...] }` or raw array — one shape only, documented.
  - No `|| response` fallback pattern anywhere in the service.

---

### Phase 5 — Low Severity Hardening (P2)

#### REQ-11: Replace String Error Matching in `useProducts`
- **Bug**: BUG-012
- Use error codes for duplicate batch detection.

#### REQ-12: Add Response Validation in `switchOrganization`
- **Bug**: BUG-013
- Add a Zod schema or type guard before applying state from the switch response.

#### REQ-13: Document Context Dependency Order
- **Bug**: BUG-014
- Add a comment block at the top of each context file listing allowed imports to prevent circular deps.

#### REQ-14: Fix `useAvailableStock` Non-null Assertions
- **Bug**: BUG-007
- Add runtime guard inside `queryFn` instead of relying solely on `enabled`.

---

## Implementation Plan

| Phase | REQs | Owner | Notes |
|-------|------|-------|-------|
| 1 — Data Integrity | REQ-1, REQ-2 | Backend | Do first — data leak |
| 2 — Auth | REQ-3, REQ-4 | Frontend | Affects all users |
| 3 — Org Switching | REQ-5, REQ-6, REQ-7 | Frontend | Core UX flow |
| 4 — API Layer | REQ-8, REQ-9, REQ-10 | Full-stack | Error visibility |
| 5 — Hardening | REQ-11–14 | Frontend | Can be bundled in one PR |

---

## Testing Requirements

- **REQ-1**: Integration test — confirm `findByDateRange` never returns rows from a different org.
- **REQ-2**: Unit test — `getMovementById` returns `lot: null` when lot is missing.
- **REQ-3**: Manual test — logout clears all query cache entries.
- **REQ-5**: Manual test — inspect network requests immediately after org switch; all carry new org ID.
- **REQ-8**: Unit test — mock API error → assert query is in `isError` state.

---

## Acceptance Criteria (overall)

- [ ] No `stock_movements` query executes without `organization_id` filter
- [ ] Logout always clears React Query cache
- [ ] Org switch always sends correct org ID in subsequent requests
- [ ] `getMovementById` never returns 500 for deleted refs
- [ ] Product list shows error state (not empty list) on API failure
- [ ] New organization appears in switcher immediately after creation
- [ ] All 14 bugs in `docs/architecture/BUG_REPORT.md` are closed

---

## References

- Bug Report: `docs/architecture/BUG_REPORT.md`
- Architecture: `docs/architecture/SAAS_ARCHITECTURE.md`
- MCP Docs: `docs/architecture/BETALI_MCP_DOCS.md`
