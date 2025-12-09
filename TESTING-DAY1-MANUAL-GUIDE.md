# 🧪 DÍA 1: Testing Manual - Stock Reservation System

**Fecha**: 2025-12-07
**Objetivo**: Validar que el sistema de reservas de stock funciona 100%
**Tiempo Estimado**: 2-3 horas

---

## 📋 Pre-requisitos

### 1. Backend Corriendo
```bash
# Terminal 1 - Backend
cd backend
node server.js

# Verificar que aparezca:
# ✓ Server running on port 4000
# ✓ NODE_ENV=development (no rate limiting)
```

### 2. Frontend Corriendo
```bash
# Terminal 2 - Frontend
cd frontend
bun run dev

# Verificar que aparezca:
# ✓ Local: http://localhost:3000
```

### 3. Login
- Ir a: http://localhost:3000
- Login con tu cuenta existente
- Verificar que estás en tu organización

---

## 🧪 TEST 1: Pedido en "Pending" - NO debe crear reserva

### ✅ Pasos

1. **Verificar stock inicial**
   - Ir a `Products`
   - Seleccionar un producto (ej: "Product Test")
   - Anotar el stock actual (ej: 100 unidades)
   - Anotar el warehouse

2. **Crear pedido en "pending"**
   - Ir a `Orders` → `Create New Order`
   - Seleccionar client
   - Seleccionar el warehouse del paso 1
   - Agregar el producto del paso 1
   - Cantidad: **10**
   - Estado: **Pending** (o Draft)
   - Click `Create Order`

3. **Verificar resultado**
   - ✅ El pedido se creó exitosamente
   - ✅ Stock físico sigue en 100 (sin cambios)
   - ✅ Stock disponible sigue en 100 (sin cambios)

4. **Verificar en backend logs**
   ```
   ❌ NO debería aparecer: "Reserving stock for order"
   ✅ Debería aparecer: "Order created successfully"
   ```

5. **Verificar en base de datos** (opcional)
   ```sql
   SELECT * FROM stock_reservations
   WHERE order_id = 'ORDER_ID_CREATED';
   -- Resultado esperado: 0 rows
   ```

### 📝 Resultado Esperado
- [ ] Pedido creado con status "pending"
- [ ] Stock físico: sin cambios
- [ ] Stock disponible: sin cambios
- [ ] Sin reservas en stock_reservations

### ❌ Si Falla
- Revisar logs del backend
- Verificar que el estado sea "pending" o "draft"
- Si se creó reserva, hay un bug → Documentar

---

## 🧪 TEST 2: Cambiar a "Processing" - DEBE crear reserva

### ✅ Pasos

1. **Editar el pedido del TEST 1**
   - Ir a `Orders`
   - Buscar el pedido que creaste
   - Click en `Edit`

2. **Cambiar estado a "processing"**
   - Cambiar Status: **Processing**
   - Click `Save`

3. **Verificar resultado**
   - ✅ El pedido se actualizó exitosamente
   - ✅ Stock físico sigue en 100 (sin cambios todavía)
   - ✅ Stock disponible ahora es 90 (100 - 10 reservadas)

4. **Verificar en backend logs**
   ```bash
   ✅ Debería aparecer:
      "Reserving stock for order"
      "Stock reserved successfully"
      "reservationCount: 1"
   ```

5. **Verificar en la UI**
   - Ir a `Create New Order`
   - Seleccionar el mismo producto
   - ✅ Debería mostrar: "90 available" (en lugar de 100)
   - ✅ Si tienes < 90 unidades, debería aparecer warning

6. **Verificar en base de datos** (opcional)
   ```sql
   SELECT * FROM stock_reservations
   WHERE order_id = 'ORDER_ID'
     AND status = 'active';
   -- Resultado esperado: 1 row con quantity = 10
   ```

### 📝 Resultado Esperado
- [ ] Pedido actualizado a "processing"
- [ ] Stock físico: 100 (sin cambios)
- [ ] Stock disponible: 90 (reducido en 10)
- [ ] Reserva creada con status "active"
- [ ] UI muestra stock disponible correcto (90)

### ❌ Si Falla
- Si NO se crea reserva → Bug crítico
- Si stock disponible no cambia → Bug en get_available_stock
- Revisar logs del backend para errores
- Documentar el error exacto

---

## 🧪 TEST 3: Cambiar a "Shipped" - DEBE deducir stock físico

### ✅ Pasos

1. **Editar el mismo pedido**
   - Ir a `Orders`
   - Buscar el pedido del TEST 2
   - Click en `Edit`

2. **Cambiar estado a "shipped"**
   - Cambiar Status: **Shipped**
   - Click `Save`

3. **Verificar resultado**
   - ✅ El pedido se actualizó exitosamente
   - ✅ Stock físico ahora es 90 (100 - 10 enviadas)
   - ✅ Stock disponible es 90
   - ✅ Reserva marcada como "fulfilled"

4. **Verificar en backend logs**
   ```bash
   ✅ Debería aparecer:
      "Order shipped - creating stock movements"
      "Fulfilling reservations for order"
      "Stock movements created successfully"
   ```

5. **Verificar en Stock Movements**
   - Ir a `Stock Movements`
   - ✅ Debería haber un nuevo movimiento tipo "exit"
   - ✅ Cantidad: 10
   - ✅ Razón: "Order shipped" (o similar)

6. **Verificar en base de datos** (opcional)
   ```sql
   -- Verificar reserva fulfilled
   SELECT status FROM stock_reservations
   WHERE order_id = 'ORDER_ID';
   -- Resultado esperado: status = 'fulfilled'

   -- Verificar stock movement
   SELECT * FROM stock_movements
   WHERE product_id = 'PRODUCT_ID'
     AND movement_type = 'exit'
   ORDER BY created_at DESC LIMIT 1;
   -- Resultado esperado: quantity = 10
   ```

### 📝 Resultado Esperado
- [ ] Pedido actualizado a "shipped"
- [ ] Stock físico: 90 (deducido en 10)
- [ ] Stock disponible: 90
- [ ] Reserva marcada como "fulfilled"
- [ ] Stock movement tipo "exit" creado

### ❌ Si Falla
- Si stock físico no se deduce → Bug crítico
- Si reserva sigue "active" → Bug en fulfillment
- Si no se crea stock movement → Bug en OrderService
- Documentar el error

---

## 🧪 TEST 4: Cancelar desde "Processing" - DEBE liberar stock

### ✅ Pasos

1. **Crear nuevo pedido**
   - Ir a `Orders` → `Create New Order`
   - Seleccionar el mismo producto
   - Cantidad: **10**
   - Estado: **Pending**
   - Click `Create Order`

2. **Cambiar a "processing"**
   - Editar el pedido
   - Cambiar Status: **Processing**
   - Click `Save`
   - Verificar que stock disponible baja a 80 (90 - 10)

3. **Cambiar a "cancelled"**
   - Editar el pedido
   - Cambiar Status: **Cancelled**
   - Click `Save`

4. **Verificar resultado**
   - ✅ El pedido está cancelado
   - ✅ Stock físico sigue en 90 (sin cambios)
   - ✅ Stock disponible vuelve a 90 (+10 liberadas)

5. **Verificar en backend logs**
   ```bash
   ✅ Debería aparecer:
      "Releasing stock reservations for cancelled order"
   ```

6. **Verificar en base de datos** (opcional)
   ```sql
   SELECT status FROM stock_reservations
   WHERE order_id = 'ORDER_ID';
   -- Resultado esperado: status = 'cancelled'
   ```

### 📝 Resultado Esperado
- [ ] Pedido cancelado desde "processing"
- [ ] Stock físico: 90 (sin cambios)
- [ ] Stock disponible: 90 (liberado)
- [ ] Reserva marcada como "cancelled"

### ❌ Si Falla
- Si stock no se libera → Bug crítico
- Si reserva sigue "active" → Bug en cancelación
- Documentar el error

---

## 🧪 TEST 5: Cancelar desde "Shipped" - DEBE restaurar stock

### ✅ Pasos

1. **Crear nuevo pedido completo**
   - Crear pedido en "pending" (12 unidades)
   - Cambiar a "processing"
   - Cambiar a "shipped"
   - Verificar que stock físico baja a 78 (90 - 12)

2. **Cancelar el pedido enviado**
   - Editar el pedido
   - Cambiar Status: **Cancelled**
   - Click `Save`

3. **Verificar resultado**
   - ✅ El pedido está cancelado
   - ✅ Stock físico vuelve a 90 (+12 restauradas)
   - ✅ Stock disponible es 90

4. **Verificar en backend logs**
   ```bash
   ✅ Debería aparecer:
      "Restoring stock for cancelled shipped order"
      "Creating reverse stock movements"
   ```

5. **Verificar en Stock Movements**
   - Ir a `Stock Movements`
   - ✅ Debería haber un movimiento tipo "entry"
   - ✅ Cantidad: 12
   - ✅ Razón: "Order cancelled - restocking" (o similar)

### 📝 Resultado Esperado
- [ ] Pedido cancelado desde "shipped"
- [ ] Stock físico: 90 (restaurado)
- [ ] Stock disponible: 90
- [ ] Stock movement tipo "entry" creado
- [ ] Reserva marcada como "cancelled"

### ❌ Si Falla
- Si stock no se restaura → Bug crítico
- Si no se crea movimiento de entrada → Bug
- Documentar el error

---

## 🧪 TEST 6: Verificar Stock Disponible en UI

### ✅ Pasos

1. **Ir a Create New Order**
   - Ir a `Orders` → `Create New Order`
   - Seleccionar warehouse
   - Seleccionar producto

2. **Verificar indicador de stock**
   - ✅ Debería aparecer: "X available"
   - ✅ El número debe coincidir con stock disponible (90)

3. **Crear pedido con cantidad alta**
   - Ingresar cantidad: 50
   - ✅ NO debería haber error (tenemos 90 disponibles)

4. **Crear otro pedido con cantidad muy alta**
   - Ingresar cantidad: 100
   - ✅ DEBE aparecer error: "Insufficient stock"
   - ✅ Mensaje claro y descriptivo

### 📝 Resultado Esperado
- [ ] UI muestra stock disponible correcto
- [ ] Permite crear pedido con stock suficiente
- [ ] Bloquea pedido con stock insuficiente
- [ ] Mensajes de error claros

---

## 🧪 TEST 7: Verificar Warning de Low Stock

### ✅ Pasos

1. **Configurar low stock threshold**
   - Verificar en código que el threshold está en 10% (o el valor configurado)

2. **Crear pedido que deje stock bajo**
   - Si stock disponible es 90
   - Low stock threshold = 10% = 9 unidades
   - Crear pedido de 85 unidades (deja 5 disponibles)

3. **Verificar warning**
   - ✅ Debería aparecer warning amarillo
   - ✅ Mensaje: "Low stock: only X available"

### 📝 Resultado Esperado
- [ ] Warning aparece cuando stock < threshold
- [ ] Mensaje claro y visible
- [ ] Color amarillo (warning, no error)

---

## 🧪 TEST 8: Verificar Error de Insufficient Stock

### ✅ Pasos

1. **Intentar crear pedido > stock disponible**
   - Stock disponible: 5
   - Intentar pedido de: 10

2. **Verificar error**
   - ✅ DEBE aparecer error rojo
   - ✅ Mensaje: "Insufficient stock. Available: 5"
   - ✅ NO permite crear el pedido

### 📝 Resultado Esperado
- [ ] Error aparece claramente
- [ ] No permite crear pedido con stock insuficiente
- [ ] Mensaje descriptivo y útil

---

## 📊 Resumen de Resultados

### Tests Pasados
- [ ] TEST 1: Pending - No reserva
- [ ] TEST 2: Processing - Crea reserva
- [ ] TEST 3: Shipped - Deduce stock
- [ ] TEST 4: Cancel Processing - Libera stock
- [ ] TEST 5: Cancel Shipped - Restaura stock
- [ ] TEST 6: Stock disponible en UI
- [ ] TEST 7: Warning low stock
- [ ] TEST 8: Error insufficient stock

### Estadísticas
- **Tests Pasados**: ___ / 8
- **Tests Fallidos**: ___ / 8
- **Bugs Encontrados**: ___

---

## 🐛 Bugs Encontrados

### Bug #1
**Descripción**:
**Pasos para reproducir**:
**Esperado**:
**Actual**:
**Prioridad**: [ ] Crítico [ ] Alto [ ] Medio [ ] Bajo

### Bug #2
**Descripción**:
**Pasos para reproducir**:
**Esperado**:
**Actual**:
**Prioridad**: [ ] Crítico [ ] Alto [ ] Medio [ ] Bajo

---

## 📝 Notas Adicionales

### Observaciones

### Mejoras Sugeridas

### Próximos Pasos
- [ ] Arreglar bugs críticos
- [ ] Crear TESTING-RESULTS-DIA1.md con resultados
- [ ] Continuar con DÍA 2 (Multi-tenant testing)

---

## ✅ Verificación Final

Antes de dar por completado el DÍA 1, verifica:

- [ ] Todos los 8 tests ejecutados
- [ ] Resultados documentados
- [ ] Bugs reportados (si los hay)
- [ ] Screenshots tomados (opcional)
- [ ] Backend logs revisados
- [ ] Base de datos verificada (opcional)

---

**Testing realizado por**: _________________
**Fecha**: _________________
**Duración**: ___ horas
**Estado**: [ ] ✅ Completo [ ] ⚠️ Parcial [ ] ❌ Fallido

---

## 🎯 Próxima Sesión

Después de completar este testing:
1. Crear `TESTING-RESULTS-DIA1.md` con resultados detallados
2. Si hay bugs críticos → Arreglar antes de continuar
3. Si no hay bugs → Continuar con DÍA 2 (Multi-tenant testing)

---

**Última actualización**: 2025-12-07
