# Performance Fixes Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix a crash bug in `useUpdateTaxRate`, eliminate N+1 queries on the dashboard, add a safety limit to BaseRepository, and reduce unnecessary re-renders in `GlobalSyncContext` and `useOrders`.

**Architecture:** Fixes are isolated within their domains — backend JS services/repositories and frontend React hooks/context. No schema migrations needed for most tasks; the BaseRepository default limit is a pure in-code guard.

**Tech Stack:** React 18 + TanStack Query v5, Node.js + Express + Supabase JS client, Bun workspace monorepo.

---

## Chunk 1: Bug Fixes & Safety Guards

### Task 1: Fix crash in `useUpdateTaxRate` — missing `currentOrganization`

**Files:**
- Modify: `frontend/src/hooks/useTaxRates.ts:103-127`

The `useUpdateTaxRate` function references `currentOrganization` in its `onSuccess` callback, but never imports it from `useOrganization()`. At runtime this is `undefined`, causing silent broken cache invalidations or a ReferenceError.

- [ ] **Step 1: Read the file and locate the bug**

```bash
grep -n "currentOrganization" frontend/src/hooks/useTaxRates.ts
```

Expected: lines 115-117 reference `currentOrganization` but line 103's function body never calls `useOrganization()`.

- [ ] **Step 2: Add `useOrganization` destructuring inside `useUpdateTaxRate`**

In `frontend/src/hooks/useTaxRates.ts`, inside `useUpdateTaxRate()` after `const queryClient = useQueryClient();`, add:

```typescript
const { currentOrganization } = useOrganization();
```

The final function opening should look like:
```typescript
export function useUpdateTaxRate() {
  const queryClient = useQueryClient();
  const { currentOrganization } = useOrganization();

  return useMutation({
```

- [ ] **Step 3: Verify the file builds without TS errors**

```bash
cd frontend && bun run build 2>&1 | grep -E "error|useTaxRates"
```

Expected: no TypeScript errors on `useTaxRates.ts`.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/hooks/useTaxRates.ts
git commit -m "fix: add missing useOrganization in useUpdateTaxRate"
```

---

### Task 2: Add default LIMIT to `BaseRepository.findAll()`

**Files:**
- Modify: `backend/repositories/BaseRepository.js:56-61`

Currently `findAll()` has no default limit — if callers omit `options.limit`, the Supabase query returns every row in the table. This can cause OOM on large tables and slow responses.

- [ ] **Step 1: Open the file and understand the current guard**

Read lines 41-70 of `backend/repositories/BaseRepository.js`. Note that `options.limit` is applied only when explicitly provided (line 56-58).

- [ ] **Step 2: Add a default limit constant and apply it**

Replace the limit block (lines 56-58):

**Before:**
```javascript
if (options.limit) {
  query = query.limit(options.limit);
}
```

**After:**
```javascript
const limit = options.limit ?? 500;
query = query.limit(limit);
```

And update the range calculation on line 60 to use the new `limit` variable:

**Before:**
```javascript
if (options.offset) {
  query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
}
```

**After:**
```javascript
if (options.offset) {
  query = query.range(options.offset, options.offset + limit - 1);
}
```

- [ ] **Step 3: Verify backend starts**

```bash
cd backend && bun run dev &
sleep 3 && curl -s http://localhost:4000/health | grep -c "ok"
kill %1
```

Expected: returns `1` (health ok).

- [ ] **Step 4: Commit**

```bash
git add backend/repositories/BaseRepository.js
git commit -m "fix: add 500-row default limit to BaseRepository.findAll() to prevent unbounded queries"
```

---

## Chunk 2: Eliminate N+1 Queries in Dashboard

### Task 3: Refactor `DashboardService.getRecentActivity()` to bulk-fetch

**Files:**
- Modify: `backend/services/DashboardService.js:100-144`

Currently the method fetches `N` movements then makes `2N` additional queries (one `findById` per movement for product + warehouse). Replace with two bulk queries that fetch all needed products and warehouses in one shot each.

- [ ] **Step 1: Read the current implementation**

Read `backend/services/DashboardService.js` lines 100-144 to confirm the `Promise.all` + `findById` pattern.

- [ ] **Step 2: Replace the enrichment logic with bulk queries**

Replace lines 100-144 with the following:

```javascript
async getRecentActivity(organizationId, limit = 10) {
  try {
    const movements = await this.stockMovementRepository.findAll(
      { organization_id: organizationId },
      { limit, orderBy: { column: 'movement_date', ascending: false } }
    );

    if (movements.length === 0) return [];

    // Collect unique IDs for bulk fetching
    const productIds = [...new Set(movements.map(m => m.product_id).filter(Boolean))];
    const warehouseIds = [...new Set(movements.map(m => m.warehouse_id).filter(Boolean))];

    // Two queries instead of 2N
    const [products, warehouses] = await Promise.all([
      productIds.length > 0
        ? this.productRepository.findAll({ product_id: undefined }, {})
            .then(all => all.filter(p => productIds.includes(p.product_id)))
        : Promise.resolve([]),
      warehouseIds.length > 0
        ? this.warehouseRepository.findAll({ organization_id: organizationId }, {})
        : Promise.resolve([]),
    ]);

    const productMap = new Map(products.map(p => [p.product_id, p.name]));
    const warehouseMap = new Map(warehouses.map(w => [w.warehouse_id, w.name]));

    return movements.map(movement => ({
      ...movement,
      product_name: productMap.get(movement.product_id) || 'Unknown Product',
      warehouse_name: warehouseMap.get(movement.warehouse_id) || 'Unknown Warehouse',
    }));
  } catch (error) {
    this.logger.error(`Error fetching recent activity: ${error.message}`);
    throw error;
  }
}
```

> **Note on product bulk fetch:** If `ProductRepository` has a `findByIds(ids)` method, prefer it. If not, the filter-after-findAll above is safe because products are scoped to the org and the previous `limit` guard (Task 2) keeps result sets bounded.

- [ ] **Step 3: Verify the dashboard endpoint responds correctly**

```bash
cd backend && bun run dev &
sleep 3
# Replace ORG_ID and TOKEN with real values from your .env / test credentials
curl -s -H "Authorization: Bearer $TEST_TOKEN" \
  "http://localhost:4000/api/dashboard/recent-activity?organizationId=$TEST_ORG_ID" \
  | head -c 500
kill %1
```

Expected: JSON array with `product_name` and `warehouse_name` fields populated.

- [ ] **Step 4: Commit**

```bash
git add backend/services/DashboardService.js
git commit -m "perf: eliminate N+1 queries in DashboardService.getRecentActivity() via bulk fetch"
```

---

## Chunk 3: React Query Data Isolation

### Task 4: Add `organizationId` to `ORDER_QUERY_KEYS`

**Files:**
- Modify: `frontend/src/hooks/useOrders.ts:14-22`

Order query keys don't include `organizationId`. When a user switches organizations, cached orders from the old org remain active. Fix by threading `orgId` through the key factory.

- [ ] **Step 1: Add `useOrganization` import and read orgId**

At the top of `frontend/src/hooks/useOrders.ts`, the hook currently imports from `@tanstack/react-query` and `orderService`. Add:

```typescript
import { useOrganization } from '@/context/OrganizationContext';
```

- [ ] **Step 2: Update `ORDER_QUERY_KEYS` to accept `orgId`**

Replace the `ORDER_QUERY_KEYS` object (lines 14-22):

```typescript
export const ORDER_QUERY_KEYS = {
  all: (orgId: string | undefined) => ['orders', orgId] as const,
  lists: (orgId: string | undefined) => [...ORDER_QUERY_KEYS.all(orgId), 'list'] as const,
  list: (orgId: string | undefined, params?: OrderQueryParams) => [...ORDER_QUERY_KEYS.lists(orgId), params] as const,
  details: (orgId: string | undefined) => [...ORDER_QUERY_KEYS.all(orgId), 'detail'] as const,
  detail: (orgId: string | undefined, id: string) => [...ORDER_QUERY_KEYS.details(orgId), id] as const,
  stats: (orgId: string | undefined) => [...ORDER_QUERY_KEYS.all(orgId), 'stats'] as const,
  search: (orgId: string | undefined, query: string, filters?: OrderFilters) => [...ORDER_QUERY_KEYS.all(orgId), 'search', query, filters] as const,
};
```

- [ ] **Step 3: Update each hook to pass `orgId`**

For each hook in the file, add `const { currentOrganization } = useOrganization();` and pass `currentOrganization?.organization_id` to the key factory. Also add `enabled: !!currentOrganization` where missing.

`useOrders`:
```typescript
export function useOrders(params?: OrderQueryParams) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.list(orgId, params),
    queryFn: () => orderService.getOrders(params),
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000,
  });
}
```

`useOrderStats`:
```typescript
export function useOrderStats() {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.stats(orgId),
    queryFn: () => orderService.getOrderStats(),
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
}
```

`useSearchOrders`:
```typescript
export function useSearchOrders(query: string, filters?: OrderFilters) {
  const { currentOrganization } = useOrganization();
  const orgId = currentOrganization?.organization_id;
  return useQuery({
    queryKey: ORDER_QUERY_KEYS.search(orgId, query, filters),
    queryFn: () => orderService.searchOrders(query, filters),
    enabled: !!orgId && !!query && query.length >= 2,
    staleTime: 2 * 60 * 1000,
  });
}
```

Update any `invalidateQueries` calls in mutation `onSuccess` callbacks in the same file to pass `orgId`.

- [ ] **Step 4: Fix TypeScript errors**

```bash
cd frontend && bun run build 2>&1 | grep "useOrders"
```

Expected: no errors. If callers of `ORDER_QUERY_KEYS` outside `useOrders.ts` exist, update them too.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/hooks/useOrders.ts
git commit -m "fix: scope order query keys to organizationId for multi-tenant cache isolation"
```

---

### Task 5: Fix `useUserManagement` enabled guard

**Files:**
- Modify: `frontend/src/hooks/useUsers.ts:28`

`enabled` is not gated on `!!currentOrganization`, so the query fires before the org is loaded.

- [ ] **Step 1: Fix the enabled expression**

In `frontend/src/hooks/useUsers.ts` line 28, change:

```typescript
enabled: options.enabled !== false,
```

to:

```typescript
enabled: options.enabled !== false && !!currentOrganization,
```

- [ ] **Step 2: Verify build**

```bash
cd frontend && bun run build 2>&1 | grep "useUsers"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useUsers.ts
git commit -m "fix: gate useUserManagement on currentOrganization to prevent premature queries"
```

---

## Chunk 4: Frontend Rendering Optimizations

### Task 6: Memoize `GlobalSyncContext` value object

**Files:**
- Modify: `frontend/src/context/GlobalSyncContext.tsx:210-223`

The `value` object is recreated on every render of `GlobalSyncProvider`. Because context propagates by reference equality, all consumers re-render whenever any state in the provider changes — even unrelated loading state.

- [ ] **Step 1: Add `useMemo` import if not present**

Check line 1 of `frontend/src/context/GlobalSyncContext.tsx` — `useMemo` should be in the React import. If missing, add it.

- [ ] **Step 2: Wrap the value in `useMemo`**

Replace:
```typescript
const value = {
  isLoading,
  loadingMessage,
  lastSync,
  syncEvents,
  showLoading,
  hideLoading,
  triggerUserDataSync,
  triggerRoleSync,
  triggerOrganizationSync,
  triggerFullSync,
  addSyncEvent,
  clearSyncEvents,
};
```

With:
```typescript
const value = useMemo(() => ({
  isLoading,
  loadingMessage,
  lastSync,
  syncEvents,
  showLoading,
  hideLoading,
  triggerUserDataSync,
  triggerRoleSync,
  triggerOrganizationSync,
  triggerFullSync,
  addSyncEvent,
  clearSyncEvents,
}), [
  isLoading,
  loadingMessage,
  lastSync,
  syncEvents,
  showLoading,
  hideLoading,
  triggerUserDataSync,
  triggerRoleSync,
  triggerOrganizationSync,
  triggerFullSync,
  addSyncEvent,
  clearSyncEvents,
]);
```

- [ ] **Step 3: Verify build**

```bash
cd frontend && bun run build 2>&1 | grep "GlobalSync"
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/context/GlobalSyncContext.tsx
git commit -m "perf: memoize GlobalSyncContext value to prevent unnecessary consumer re-renders"
```

---

### Task 7: Configure Vite `manualChunks` for vendor splitting

**Files:**
- Modify: `frontend/vite.config.ts`

Without chunking config, Vite bundles everything together. Splitting vendor libs (React, Supabase, TanStack Query) and heavy optional libs (Recharts) into separate chunks allows the browser to cache them across deploys and reduces the main app bundle.

- [ ] **Step 1: Add `build` config to `vite.config.ts`**

Replace the entire file content with:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — rarely changes, cache long-term
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Supabase client — large, stable
          'vendor-supabase': ['@supabase/supabase-js'],
          // TanStack Query — stable
          'vendor-query': ['@tanstack/react-query'],
          // Recharts — optional charting lib, only needed on dashboard analytics
          'vendor-recharts': ['recharts'],
        },
      },
    },
  },
});
```

- [ ] **Step 2: Run a production build and inspect chunk sizes**

```bash
cd frontend && bun run build 2>&1 | grep -E "kB|chunk"
```

Expected: separate `vendor-react`, `vendor-supabase`, `vendor-query`, `vendor-recharts` chunks listed. Main app chunk should be smaller than before.

- [ ] **Step 3: Commit**

```bash
git add frontend/vite.config.ts
git commit -m "perf: add Vite manualChunks to split vendor and recharts into cacheable bundles"
```

---

## Summary

| Task | File(s) | Type | Impact |
|------|---------|------|--------|
| 1 | `useTaxRates.ts` | Bug fix | Crash prevention |
| 2 | `BaseRepository.js` | Safety guard | Prevent OOM / unbounded queries |
| 3 | `DashboardService.js` | N+1 fix | Eliminate 2N extra DB queries per dashboard load |
| 4 | `useOrders.ts` | Cache isolation | Prevent org data leakage between tenants |
| 5 | `useUsers.ts` | Guard | Prevent premature query before org loads |
| 6 | `GlobalSyncContext.tsx` | Rendering | Reduce consumer re-renders on every loading state change |
| 7 | `vite.config.ts` | Bundle | Smaller initial bundle, better cache efficiency |
