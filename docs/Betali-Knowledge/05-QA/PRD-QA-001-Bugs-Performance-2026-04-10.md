# PRD-QA-001: Bug & Performance Audit — Betali Codebase

**Fecha:** 2026-04-10  
**Autor:** AI Code Audit (claude-sonnet-4-6)  
**Estado:** ✅ RESUELTO — todos los issues aplicados el 2026-04-10  
**Tipo:** Auditoría de calidad — bugs y performance

---

## Resumen Ejecutivo

Auditoría granular del codebase de Betali (frontend React 18 + backend Node.js + Supabase) realizada el 2026-04-10. Se identificaron **11 issues** distribuidos en 4 niveles de severidad. Los problemas más críticos se concentran en el backend (N+1 queries en FEFO) y en la seguridad multi-tenant del repositorio (org_id opcional en queries). En frontend los problemas principales son invalidaciones de cache demasiado amplias y console statements en producción.

---

## Issues por Severidad

### 🔴 ALTA — Impacto directo en performance o seguridad

---

#### ✅ [BUG-001] N+1 Queries en FEFO Lot Assignment — RESUELTO

**Archivo:** `backend/services/ProductLotService.js` — líneas 154–155, 187–189  
**Severidad:** Alta (Performance)  
**Impacto:** Cada orden con multi-lote dispara N queries secuenciales a Supabase. Con 10 lotes = 10 roundtrips encadenados.

**Código problemático:**
```js
// fefoAssignLot (línea 154-155)
for (const lot of lots) {
  const stock = await this.stockRepo.getCurrentStock(lot.lot_id, warehouseId, organizationId);
  // ...
}

// fefoAssignMultiLot (línea 187-189)
for (const lot of lots) {
  if (remaining <= 0) break;
  const stock = await this.stockRepo.getCurrentStock(lot.lot_id, warehouseId, organizationId);
  // ...
}
```

**Fix propuesto:** Traer todos los stocks en una sola query batch antes del loop:
```js
const lotIds = lots.map(l => l.lot_id);
const stockMap = await this.stockRepo.getCurrentStockBatch(lotIds, warehouseId, organizationId);
// luego usar stockMap[lot.lot_id] en el loop (sin await)
```
Requiere agregar `getCurrentStockBatch` en `StockRepository` usando `.in('lot_id', lotIds)`.

---

#### ✅ [BUG-002] organization_id Opcional en Repositorios Multi-Tenant — RESUELTO

**Archivos:**
- `backend/repositories/ClientRepository.js` — línea 128–130
- `backend/repositories/SupplierRepository.js` — línea 139–141
- `backend/repositories/UserRepository.js` — línea 85–87

**Severidad:** Alta (Seguridad Multi-Tenant)  
**Impacto:** Si el caller omite `organization_id`, estos repositorios devuelven datos de TODAS las organizaciones. Un bug en el controller o service que no pase el orgId expone datos de otros tenants.

**Código problemático:**
```js
// ClientRepository.findAll
async findAll(options = {}) {
  let query = this.client.from(this.table).select('*');
  if (options.organization_id) {           // ← filtro opcional, no obligatorio
    query = query.eq('organization_id', options.organization_id);
  }
}
```

**Fix propuesto:** Hacer el filtro obligatorio y lanzar error si falta:
```js
async findAll(options = {}) {
  if (!options.organization_id) {
    throw new Error('[Security] organization_id is required for findAll');
  }
  let query = this.client.from(this.table)
    .select('*')
    .eq('organization_id', options.organization_id);
  // ...
}
```

---

### 🟡 MEDIA — Degradación de performance o UX incorrecta

---

#### ✅ [PERF-001] Invalidación de Cache sin Scope de Organización — RESUELTO

**Archivo:** `frontend/src/hooks/useClients.ts` — líneas 118–119, 137–139, 156–157  
**Severidad:** Media (Performance)  
**Impacto:** Al crear, actualizar o eliminar un cliente, se invalida el cache `['clients']` globalmente — no acotado por `organization_id`. Esto fuerza refetch en **todas** las queries de clientes activas, incluso de orgs distintas en sesiones con org-switching.

**Código problemático:**
```ts
// useCreateClient, onSuccess
queryClient.invalidateQueries({ queryKey: ['clients'] });
queryClient.invalidateQueries({ queryKey: ['clients', 'stats'] });
```

**Fix propuesto:** Incluir orgId en el queryKey de invalidación:
```ts
queryClient.invalidateQueries({ queryKey: ['clients', currentOrganizationId] });
queryClient.invalidateQueries({ queryKey: ['clients', 'stats', currentOrganizationId] });
```
Y asegurar que las `useQuery` de clients también incluyan orgId en su queryKey.

---

#### ✅ [PERF-002] queryClient.clear() en Verificación Inicial de Sesión — RESUELTO

**Archivo:** `frontend/src/context/AuthContext.tsx` — línea 57–59  
**Severidad:** Media (UX / Flash de loading)  
**Impacto:** En el useEffect inicial, si no hay sesión activa (ej. en la primera carga de la landing o en la pantalla de login), se llama a `queryClient.clear()`. Si el usuario navega desde una página pública a login y vuelve, esto limpia todo el cache prematuro.

**Código problemático:**
```ts
// useEffect inicial, línea 57-59
if (!session?.user) {
  queryClient.clear();  // limpia TODO el cache en cualquier estado sin sesión
}
```

**Fix propuesto:** Solo limpiar el cache en respuesta al evento explícito de logout (`SIGNED_OUT`), no en la verificación inicial:
```ts
supabase.auth.onAuthStateChange((_event, session) => {
  if (_event === 'SIGNED_OUT') {
    queryClient.clear();
    // limpiar localStorage...
  }
});
```

---

#### ✅ [PERF-003] Loop Secuencial en OrganizationService — Eliminar Movimientos por Warehouse — RESUELTO

**Archivo:** `backend/services/OrganizationService.js` — líneas 441–445  
**Severidad:** Media (Performance — caso de uso de baja frecuencia)  
**Impacto:** Al eliminar una organización, los movimientos de stock se borran de forma secuencial, un warehouse a la vez. Con muchos warehouses esto es innecesariamente lento.

**Código problemático:**
```js
for (const warehouseId of warehouseIds) {
  const movements = await this.stockMovementRepository.deleteByFilter({ warehouse_id: warehouseId });
  deletedMovements += movements;
}
```

**Fix propuesto:** Paralelizar con Promise.all:
```js
const results = await Promise.all(
  warehouseIds.map(wId => this.stockMovementRepository.deleteByFilter({ warehouse_id: wId }))
);
deletedMovements = results.reduce((sum, n) => sum + n, 0);
```

---

#### ✅ [BUG-003] removeQueries Patrón Inconsistente en useAuthStateChange — RESUELTO

**Archivo:** `frontend/src/hooks/useAuthStateChange.ts` — líneas 41–45  
**Severidad:** Media (Correctness)  
**Impacto:** En el evento de cambio de auth, se hace `removeQueries` sobre `user-organizations` y `currentUser`, luego se hace `invalidateQueries` sobre `organizations` y `users`. El remove y el invalidate actúan sobre queries relacionadas de forma no atómica, potencialmente dejando datos inconsistentes en cache durante la transición.

**Código problemático:**
```ts
queryClient.removeQueries({ queryKey: ['user-organizations'] });
queryClient.removeQueries({ queryKey: ['currentUser'] });
queryClient.invalidateQueries({ queryKey: ['organizations'] });
queryClient.invalidateQueries({ queryKey: ['users'] });
```

**Fix propuesto:** Usar `queryClient.clear()` (ya se hace en AuthContext) o bien solo `invalidateQueries` sin `removeQueries` — el invalidate es suficiente para forzar refetch en el próximo mount.

---

#### ✅ [BUG-004] ClientController — Acceso Directo al Repository Saltando el Service Layer — RESUELTO

**Archivo:** `backend/controllers/ClientController.js` — línea ~360  
**Severidad:** Media (Arquitectura / Clean Architecture violation)  
**Impacto:** El controller accede a `this.clientService.repository.findByEmail(...)` directamente, saltando la capa de servicio. Esto rompe el patrón Clean Architecture del proyecto y hace que la lógica de validación del service no se ejecute.

**Fix propuesto:** Exponer `findByEmail` como método del `ClientService` y llamarlo desde el controller:
```js
// ClientService
async findByEmail(email, organizationId) {
  return this.repository.findByEmail(email, organizationId);
}

// ClientController — en lugar de this.clientService.repository.findByEmail(...)
const existing = await this.clientService.findByEmail(email, organizationId);
```

---

### 🟠 BAJA-MEDIA — Ruido técnico y deuda menor

---

#### ⏭️ [PERF-004] staleTime: 0 en Detail de Purchase Order (Agresivo pero Intencional) — OMITIDO (decisión intencional del dev)

**Archivo:** `frontend/src/hooks/usePurchaseOrders.ts` — línea 55  
**Severidad:** Baja-Media  
**Nota:** El developer dejó un comentario explicando la decisión: "Always refetch on mount so re-opening the modal gets fresh data". Es válido para el flujo de modal, pero implica siempre un roundtrip a la API al abrir el modal de detalle. Si la PO no cambió, es un fetch innecesario.

**Alternativa a evaluar:** Usar `staleTime: 30_000` (30s) como mínimo, con `refetchOnWindowFocus: true`, para evitar el fetch redundante cuando el usuario abre el mismo modal dos veces en rápida sucesión.

---

#### ⏳ [DEBT-001] 192 console.log/error/warn en Frontend (51 archivos) — PENDIENTE (backlog)

**Archivos afectados:** 51 archivos en `frontend/src/`  
**Severidad:** Baja (Deuda técnica / potencial info-leak en DevTools)  
**Detalle:** El count total es 192 ocurrencias. Los archivos con más instancias:
- `hooks/usePurchaseOrders.ts`: 10 instancias
- `hooks/useOrders.ts`: 8 instancias
- `services/api/userService.ts`: 12 instancias
- `hooks/useSuppliers.ts`: 11 instancias

**Fix propuesto:** Agregar regla ESLint `no-console: "warn"` al menos, para que el build destaque consoles restantes. En producción, reemplazar con el logger de Winston o silenciar via Vite `define: { 'console.log': '() => {}' }`.

---

#### ✅ [DEBT-002] Validación de Parámetros de Paginación sin Bounds Checking — RESUELTO

**Archivo:** `backend/controllers/ClientController.js` — buildQueryOptions  
**Severidad:** Baja  
**Impacto:** `parseInt(query.page)` y `parseInt(query.limit)` sin validación de NaN o valores negativos. Una request con `?page=-1&limit=99999` causaría un resultado inesperado.

**Fix propuesto:**
```js
const page = Math.max(1, parseInt(query.page) || 1);
const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
```

---

## Resumen de Issues

| ID | Área | Severidad | Archivo Principal | Estado |
|----|------|-----------|-------------------|--------|
| BUG-001 | Backend Performance | 🔴 Alta | `ProductLotService.js:154` | ✅ Resuelto |
| BUG-002 | Backend Security | 🔴 Alta | `ClientRepository.js:128` | ✅ Resuelto |
| PERF-001 | Frontend Cache | 🟡 Media | `useClients.ts:118` | ✅ Resuelto |
| PERF-002 | Frontend UX | 🟡 Media | `AuthContext.tsx:57` | ✅ Resuelto |
| PERF-003 | Backend Performance | 🟡 Media | `OrganizationService.js:442` | ✅ Resuelto |
| BUG-003 | Frontend Cache | 🟡 Media | `useAuthStateChange.ts:41` | ✅ Resuelto |
| BUG-004 | Backend Architecture | 🟡 Media | `ClientController.js:360` | ✅ Resuelto |
| PERF-004 | Frontend Cache | 🟠 Baja-Media | `usePurchaseOrders.ts:55` | ⏭️ Omitido (intencional) |
| DEBT-001 | Frontend Code Quality | 🟠 Baja | 51 archivos | ⏳ Pendiente (backlog) |
| DEBT-002 | Backend Validation | 🟠 Baja | `ClientController.js` | ✅ Resuelto |

**Total: 10 issues** — 2 Alta, 5 Media, 3 Baja

---

## Plan de Acción Sugerido

### Sprint inmediato (Alta prioridad)
1. **BUG-002** — Hacer organization_id obligatorio en los 3 repositorios afectados. Fix de 30 min, alta criticidad para multi-tenancy.
2. **BUG-001** — Agregar `getCurrentStockBatch` en StockRepository y refactorizar ProductLotService. Fix estimado: 2-3 hs.

### Siguiente sprint (Media prioridad)
3. **PERF-001** — Agregar orgId al queryKey de `useClients` mutations.
4. **PERF-002** — Refinar `queryClient.clear()` para que solo ocurra en `SIGNED_OUT`.
5. **BUG-003** — Simplificar useAuthStateChange para usar solo invalidateQueries.
6. **BUG-004** — Encapsular findByEmail en ClientService.

### Deuda técnica (backlog)
7. **PERF-003** — Paralelizar loop de deletion en OrganizationService.
8. **DEBT-001** — Agregar regla ESLint `no-console` y limpiar los 192 casos.
9. **DEBT-002** — Agregar bounds checking en paginación de todos los controllers.

---

## Notas del Auditor

- **AuthContext.tsx línea 86** tiene correctamente `[]` como dependency array — el useEffect no presenta el bug de re-subscripción múltiple. ✅
- Los patterns `removeQueries(detail) + invalidateQueries(list)` en `usePurchaseOrders.ts` son distintas keys y constituyen un patrón válido para forzar re-fetch de vista completa. No son el anti-pattern prohibido (mismo key). ✅
- La mayoría de hooks de `useQuery` tienen `staleTime` configurado apropiadamente (5 min base). ✅
- El global `defaultOptions.staleTime: 5 * 60 * 1000` en `query-provider.tsx` sirve como fallback correcto. ✅
