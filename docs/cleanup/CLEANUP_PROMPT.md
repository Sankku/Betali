# 🤖 PROMPT PARA AGENTE DE LIMPIEZA - Betali Codebase

**Proyecto:** Betali SaaS - Sistema de Gestión de Inventarios
**Objetivo:** Eliminar código muerto, archivos obsoletos y duplicados sin afectar funcionalidad
**Análisis previo:** Ver `CLEANUP_ANALYSIS.md` para detalles completos

---

## 🎯 INSTRUCCIONES PARA EL AGENTE

Eres un agente de limpieza de código especializado. Tu tarea es eliminar archivos obsoletos, código muerto y duplicados del proyecto Betali siguiendo estrictamente las instrucciones a continuación.

**REGLAS CRÍTICAS:**
1. ✅ Solo eliminar archivos explícitamente listados
2. ✅ Verificar que el archivo NO esté importado antes de eliminar
3. ✅ Ejecutar tests después de cada fase
4. ✅ Reportar cualquier error inmediatamente
5. ❌ NUNCA eliminar sin verificación previa
6. ❌ NUNCA tocar archivos en `node_modules/`
7. ❌ NUNCA eliminar los 23 archivos MercadoPago untracked

---

## 📋 FASE 1: ELIMINACIÓN SEGURA (ALTA PRIORIDAD)

### Task 1.1: Eliminar Auth Route Backups

**Verificación previa:** Confirmar que NO están importados en `server.js`

```bash
# Verificar que NO hay imports
grep -r "auth.backup\|auth.refactored\|auth.transactional\|auth-simplified" backend/ --include="*.js" --include="*.ts"

# Si el grep retorna 0 resultados, proceder a eliminar:
```

**Archivos a eliminar:**
- [ ] `backend/routes/auth.backup.js`
- [ ] `backend/routes/auth.refactored.js`
- [ ] `backend/routes/auth.transactional.js`
- [ ] `backend/routes/auth-simplified.js`

**Espacio recuperado:** ~51 KB

---

### Task 1.2: Eliminar Componente Frontend Sin Uso

**Verificación previa:** Confirmar que NO está importado

```bash
# Verificar que NO hay imports
grep -r "orders-page-refactored-example" frontend/src/ --include="*.ts" --include="*.tsx"

# Si el grep retorna 0 resultados, proceder a eliminar:
```

**Archivos a eliminar:**
- [ ] `frontend/src/components/features/orders/orders-page-refactored-example.tsx`

---

### Task 1.3: Eliminar Scripts Obsoletos del Backend

**Ubicación:** `backend/scripts/`

**MANTENER estos scripts (NO eliminar):**
- Scripts de health check activos
- Scripts de smoke tests esenciales
- Scripts de migración en producción actual
- Cualquier script importado en `package.json`

**ELIMINAR estas categorías de scripts:**

#### A. Scripts de verificación one-time:
- [ ] Todos los archivos `check-*.js` (excepto si están en package.json)
- [ ] Todos los archivos `verify-*.js` (excepto si están en package.json)

#### B. Scripts de fix one-time:
- [ ] Todos los archivos `fix-*.js`
- [ ] Todos los archivos `repair-*.js`

#### C. Scripts de testing ad-hoc:
- [ ] Archivos `test-*.js` (excepto infraestructura de testing esencial)
- [ ] Ejemplo: `test-purchase-orders.js`, `test-roles-permissions.js`

#### D. Scripts de reset duplicados:
- [ ] `reset-database.backup.js` (si existe)
- [ ] `reset-database.old.js` (si existe)
- [ ] Mantener solo UNA versión activa de reset

#### E. Scripts de migración ya aplicadas:
- [ ] `apply-*-migration.js` (verificar que la migración ya se aplicó)

#### F. Scripts de debug temporales:
- [ ] Todos los archivos `debug-*.js`
- [ ] Todos los archivos `temp-*.js`

**Método de verificación:**

```bash
# Para cada script, verificar si está en package.json
grep -F "nombre-del-script.js" backend/package.json

# Si NO está en package.json, verificar si está importado en otros archivos
grep -r "nombre-del-script" backend/ --include="*.js" --include="*.ts" --exclude-dir=scripts

# Si ambas verificaciones retornan 0, es seguro eliminar
```

**Estimado:** ~90 archivos, ~2.5 MB

---

### Task 1.4: Eliminar Documentación Temporal de MercadoPago

**Verificación:** Confirmar que la integración MercadoPago está completa y funcional

```bash
# Verificar que los archivos de código MercadoPago existen
ls -la backend/controllers/MercadoPagoController.js
ls -la backend/services/MercadoPagoService.js
ls -la frontend/src/components/features/billing/PaymentModal.tsx
```

**Si los archivos de código existen, eliminar estos docs temporales:**

- [ ] `MERCADOPAGO-BRICKS-SETUP.md`
- [ ] `MERCADOPAGO-IMPLEMENTATION-COMPLETE.md`
- [ ] `MERCADOPAGO-INTEGRATION-READY.md`
- [ ] `MERCADOPAGO-TESTING-GUIDE.md`
- [ ] `RUN_MIGRATIONS.md`

**Espacio recuperado:** ~1 MB

---

### Task 1.5: Eliminar Documentación de Features Completadas

**Archivos a eliminar (todos en raíz del proyecto):**

#### Purchase Orders:
- [ ] `PURCHASE-ORDERS-BACKEND-COMPLETE.md`
- [ ] `PURCHASE-ORDERS-FRONTEND-COMPLETE.md`
- [ ] `PURCHASE-ORDERS-TESTING-REPORT.md`
- [ ] `PURCHASE-ORDERS-FIX-APPLIED.md`

#### Inventory & Alerts:
- [ ] `INVENTORY-ALERTS-IMPLEMENTATION.md`

#### Billing System:
- [ ] `HELP-SYSTEM-COMPLETED.md`
- [ ] `BILLING-SYSTEM-COMPLETE.md`
- [ ] `MANUAL-BILLING-BACKEND-COMPLETED.md`

#### UI Features:
- [ ] `PRICING-PAGE-IMPLEMENTED.md`
- [ ] `DASHBOARD-METRICS-IMPLEMENTED.md`

#### Buscar y eliminar otros archivos con patrones:
- [ ] Todos los archivos `*-COMPLETE.md`
- [ ] Todos los archivos `*-IMPLEMENTED.md`
- [ ] Todos los archivos `*-APPLIED.md`
- [ ] Todos los archivos `*-FIX.md` (excepto guías activas)

**Comando de búsqueda:**

```bash
# Encontrar todos los archivos completados
find . -maxdepth 1 -name "*-COMPLETE.md" -o -name "*-IMPLEMENTED.md" -o -name "*-APPLIED.md"

# Revisar la lista antes de eliminar
```

**Estimado:** ~20 archivos

---

### Task 1.6: Limpiar Coverage Reports

```bash
# Verificar que existe
ls -la backend/coverage/

# Eliminar (es output generado, no código fuente)
rm -rf backend/coverage/
```

**Espacio recuperado:** ~6.5 MB

---

### Task 1.7: Verificación Post-Fase 1

**CRÍTICO:** Ejecutar tests para asegurar que no se rompió nada

```bash
# Backend tests
cd backend && bun run test

# Frontend build (verifica imports)
cd frontend && bun run build

# Si ambos pasan, Fase 1 completada ✓
```

**Reportar:**
- [ ] Número de archivos eliminados
- [ ] Espacio total recuperado
- [ ] Estado de tests (✓ o ✗)
- [ ] Errores encontrados (si hay)

---

## 📋 FASE 2: DECISIONES DE ARQUITECTURA (MEDIA PRIORIDAD)

### Task 2.1: Evaluar CheckoutButton.tsx

**Análisis requerido:**

```bash
# Verificar uso actual
grep -r "CheckoutButton" frontend/src/ --include="*.ts" --include="*.tsx"

# Verificar uso de PaymentModal (la alternativa Bricks)
grep -r "PaymentModal" frontend/src/ --include="*.ts" --include="*.tsx"
```

**Pregunta al usuario:**
"El proyecto tiene dos implementaciones de checkout:
1. `CheckoutButton.tsx` (Checkout Pro - redirect a MercadoPago)
2. `PaymentModal.tsx` (Checkout Bricks - modal in-page)

Actualmente, `Pricing.tsx` usa `PaymentModal` (Bricks).

¿Deseas:
A) Eliminar `CheckoutButton.tsx` y estandarizar en Bricks?
B) Mantener ambos para flexibilidad?
C) Cambiar a CheckoutButton y eliminar PaymentModal?"

**Acción basada en respuesta del usuario**

---

### Task 2.2: Evaluar Archive Folder

**Ubicación:** `backend/archive/manual-billing/`

**Pregunta al usuario:**
"La carpeta `backend/archive/manual-billing/` contiene la implementación anterior de billing manual (3 archivos).

Este código fue reemplazado por la integración con MercadoPago.

¿Deseas:
A) Mantenerlo como referencia histórica?
B) Eliminarlo (el historial en git siempre estará disponible)?"

**Acción basada en respuesta del usuario**

---

### Task 2.3: Verificación Post-Fase 2

```bash
# Tests después de cambios arquitectónicos
cd backend && bun run test
cd frontend && bun run build
```

---

## 📋 FASE 3: CALIDAD DE CÓDIGO (BAJA PRIORIDAD)

**NOTA:** Esta fase NO es crítica y puede hacerse gradualmente

### Task 3.1: Limpiar Console.log Backend (GRADUAL)

**NO hacer todo de una vez.** Hacer por módulos:

```bash
# Identificar archivos con más console.log
grep -r "console\.log" backend/ --include="*.js" --include="*.ts" | cut -d: -f1 | uniq -c | sort -rn | head -20
```

**Proceso:**
1. Elegir un módulo (ej: controllers)
2. Reemplazar console.log con Logger existente
3. Ejecutar tests
4. Repetir con siguiente módulo

**NO urgente** - puede ser tarea continua durante desarrollo normal

---

### Task 3.2: Limpiar Console.log Frontend

**Solo 65 ocurrencias** - más manejable

```bash
# Listar todos los console.log
grep -rn "console\.log" frontend/src/ --include="*.ts" --include="*.tsx"
```

**Acción:**
- Remover console.log de desarrollo
- Mantener solo error logging crítico
- Considerar implementar Sentry u otro error tracking

---

### Task 3.3: Organizar Documentación Root

**Actualmente:** 85 archivos .md en root (muy desordenado)

**Propuesta de estructura:**

```
/docs/
  /architecture/        # SAAS_ARCHITECTURE.md, BETALI_MCP_DOCS.md
  /implementation/      # Guías de implementación activas
  /migrations/          # Guías de migración consolidadas
  /project-logs/        # SESSION-SUMMARY, DAY-1, etc.
  /testing/             # Reportes de testing
  /completed/           # Archivos históricos (opcional)
```

**Pregunta al usuario:**
"¿Deseas reorganizar los 85 archivos .md del root en una estructura de carpetas más clara?"

---

## 📋 FASE 4: GIT HYGIENE (POST-LIMPIEZA)

### Task 4.1: Commitear Archivos MercadoPago

**CRÍTICO:** Estos archivos son features implementadas, NO basura

```bash
# Agregar archivos MercadoPago backend
git add backend/controllers/MercadoPagoController.js
git add backend/services/MercadoPagoService.js
git add backend/routes/mercadopago.js
git add backend/migrations/add_mercadopago_fields.sql
git add backend/scripts/check-mercadopago-config.js
git add backend/scripts/verify-mercadopago-tables.js
git add backend/scripts/verify-mercadopago-tables.sql

# Agregar archivos MercadoPago frontend
git add frontend/src/components/features/billing/
git add frontend/src/hooks/useFeatureAccess.ts
git add frontend/src/pages/Dashboard/Payment*.tsx
git add frontend/src/pages/Dashboard/SubscriptionManagement.tsx
git add frontend/src/services/api/mercadoPagoService.ts

# Commit
git commit -m "feat: Add MercadoPago integration

- Add MercadoPago controller, service, and routes
- Add Checkout Bricks UI components
- Add payment success/failure/pending pages
- Add subscription management page
- Add feature access control hook

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

### Task 4.2: Actualizar .gitignore

**Verificar que coverage está ignorado:**

```bash
# Revisar .gitignore
grep -F "coverage" .gitignore backend/.gitignore

# Si no está, agregar:
# coverage/
# */coverage/
```

---

### Task 4.3: Commit de Limpieza

```bash
git add -A
git commit -m "chore: Clean up dead code and obsolete documentation

Removed:
- 4 unused auth route backups (~51 KB)
- 1 unused frontend component
- ~90 obsolete backend scripts (~2.5 MB)
- ~25 completed implementation docs (~1 MB)
- Coverage reports (~6.5 MB)

Total: ~120 files removed, ~10 MB recovered

See CLEANUP_ANALYSIS.md for details

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## 📊 REPORTE FINAL ESPERADO

Al finalizar, el agente debe generar un reporte con:

```markdown
# 🧹 Reporte de Limpieza - Betali Codebase

## Resumen
- **Archivos eliminados:** [número]
- **Espacio recuperado:** [MB]
- **Tests:** [✓ Pasaron / ✗ Fallaron]
- **Errores encontrados:** [número]

## Fase 1: Eliminación Segura
- Auth route backups: [✓/✗] [4 archivos, ~51 KB]
- Componente sin uso: [✓/✗] [1 archivo]
- Scripts obsoletos: [✓/✗] [X archivos, ~Y MB]
- Docs MercadoPago: [✓/✗] [5 archivos, ~1 MB]
- Docs completados: [✓/✗] [X archivos]
- Coverage reports: [✓/✗] [~6.5 MB]

## Fase 2: Decisiones Arquitectónicas
- CheckoutButton.tsx: [Eliminado/Mantenido] - Decisión: [A/B/C]
- Archive folder: [Eliminado/Mantenido] - Decisión: [A/B]

## Fase 3: Calidad de Código
- Console.log limpieza: [Iniciada/Pendiente]
- Docs reorganización: [Completada/Pendiente]

## Fase 4: Git Hygiene
- MercadoPago files committed: [✓/✗]
- .gitignore updated: [✓/✗]
- Cleanup committed: [✓/✗]

## Tests Ejecutados
```bash
# Backend tests
[output]

# Frontend build
[output]
```

## Errores Encontrados
[Lista de errores si los hay]

## Próximos Pasos Recomendados
[Sugerencias]
```

---

## ⚠️ ADVERTENCIAS CRÍTICAS

### NO Eliminar:
❌ Archivos en `node_modules/`
❌ Archivos en `.git/`
❌ Los 23 archivos MercadoPago untracked (son features nuevas)
❌ Archivos actualmente importados
❌ Tests activos
❌ Configuración (package.json, tsconfig.json, etc.)

### Siempre Verificar:
✔️ Ejecutar grep antes de eliminar
✔️ Revisar git blame si hay duda
✔️ Ejecutar tests después de cada fase
✔️ Hacer commits incrementales

### Si Encuentras Problemas:
🛑 **DETENER inmediatamente**
📝 Reportar el problema con detalles
🔄 Revertir cambios con git
💬 Preguntar al usuario antes de continuar

---

## 🚀 COMANDO DE INICIO

```bash
# Crear branch de limpieza
git checkout -b cleanup/dead-code

# Confirmar que estás en el directorio correcto
pwd
# Debe ser: /Users/santiagoalaniz/Dev/Personal/SaasRestaurant

# Confirmar que los tests pasan antes de empezar
cd backend && bun run test
cd ../frontend && bun run build

# Si ambos pasan, comenzar Fase 1
```

---

## 📝 NOTAS PARA EL AGENTE

1. **Sé conservador:** Ante la duda, NO eliminar y preguntar al usuario
2. **Reporta constantemente:** Mantén al usuario informado de cada paso
3. **Tests frecuentes:** Ejecuta tests después de cada grupo de eliminaciones
4. **Commits incrementales:** No esperes al final para commitear
5. **Documenta decisiones:** Si algo no está claro, documenta por qué lo decidiste así

---

_Prompt generado el 2026-01-21 para limpieza del codebase Betali_
_Basado en análisis completo en CLEANUP_ANALYSIS.md_
