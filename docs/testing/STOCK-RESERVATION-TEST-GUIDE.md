# 🧪 Guía de Pruebas - Sistema de Reserva de Stock

## ✅ Problemas Resueltos

### 1. **Rate Limiting Arreglado** ✅
- Rate limiting ahora está **DESHABILITADO** en desarrollo
- No más errores "Rate limit exceeded" en localhost
- Producción sigue protegida con límites estrictos

### 2. **Sistema de Reserva de Stock** ✅
El sistema SÍ está implementado correctamente:
- Stock se RESERVA cuando el estado cambia a "processing"
- Stock se DEDUCE cuando el estado cambia a "shipped"
- Reservas se LIBERAN cuando el pedido se cancela

---

## 🔄 Flujo Correcto de Stock

### **Estados de Pedido y su Efecto en Stock**

```
1. DRAFT/PENDING → Sin efecto en stock
   - Stock físico: 100 unidades
   - Stock disponible: 100 unidades
   - Stock reservado: 0 unidades

2. PROCESSING → Stock RESERVADO (no deducido)
   - Stock físico: 100 unidades (sin cambios)
   - Stock disponible: 90 unidades (100 - 10 reservadas)
   - Stock reservado: 10 unidades
   ⚠️ IMPORTANTE: Otros pedidos NO pueden usar estas 10 unidades

3. SHIPPED → Stock DEDUCIDO físicamente
   - Stock físico: 90 unidades (100 - 10 enviadas)
   - Stock disponible: 90 unidades
   - Stock reservado: 0 unidades (reserva marcada como "fulfilled")

4. CANCELLED → Stock LIBERADO
   - Si estaba en "processing": libera reservas
   - Si estaba en "shipped": devuelve stock físico
```

---

## 🧪 Cómo Probar el Sistema

### **Paso 1: Reiniciar Backend**
```bash
# Detén el servidor actual (Ctrl+C)
cd backend
node server.js
```

✅ **Verificar**: No debería haber más errores de "Rate limit exceeded"

---

### **Paso 2: Crear Pedido en Estado "Pending"**

1. Ve a **Orders → Create New Order**
2. Selecciona warehouse
3. Selecciona un producto (ej: "Product Test" con 100 unidades)
4. Cantidad: 10
5. Estado: **Pending** (o Draft)
6. Crea el pedido

**Resultado Esperado:**
- ✅ Stock físico: 100 (sin cambios)
- ✅ Stock disponible: 100 (sin cambios)
- ✅ No hay reservas creadas

**Verificar en logs del backend:**
```
NO debería aparecer: "Reserving stock for order"
```

---

### **Paso 3: Cambiar Estado a "Processing"**

1. Edita el pedido creado
2. Cambia estado a **Processing**
3. Guarda

**Resultado Esperado:**
- ✅ Stock físico: 100 (sin cambios todavía)
- ✅ Stock disponible: 90 (100 - 10 reservadas)
- ✅ Reserva creada en tabla `stock_reservations`

**Verificar en logs del backend:**
```
✅ Debería aparecer:
   "Reserving stock for order"
   "Stock reserved successfully"
   "reservationCount: 1"
```

**Verificar en la UI (Create Order):**
- Si intentas crear un nuevo pedido del mismo producto:
  - **Antes**: Decía "150 available" (ejemplo)
  - **Ahora**: Debería decir "140 available" (150 - 10 reservadas)

---

### **Paso 4: Cambiar Estado a "Shipped"**

1. Edita el pedido
2. Cambia estado a **Shipped**
3. Guarda

**Resultado Esperado:**
- ✅ Stock físico: 90 (100 - 10 enviadas)
- ✅ Stock disponible: 90
- ✅ Reserva marcada como "fulfilled" en `stock_reservations`
- ✅ Movimiento de stock tipo "exit" creado

**Verificar en logs:**
```
✅ Debería aparecer:
   "Order shipped - creating stock movements"
   "Fulfilling reservations for order"
   "Stock movements created successfully"
```

---

### **Paso 5: Probar Cancelación**

#### **Caso A: Cancelar desde "Processing"**

1. Crea nuevo pedido (10 unidades)
2. Cambia a "Processing" (reserva stock)
3. Cambia a "Cancelled"

**Resultado Esperado:**
- ✅ Stock físico: sin cambios
- ✅ Stock disponible: +10 (se liberan las reservas)
- ✅ Reserva marcada como "cancelled"

**Verificar en logs:**
```
✅ "Releasing stock reservations for cancelled order"
```

#### **Caso B: Cancelar desde "Shipped"**

1. Crea nuevo pedido (10 unidades)
2. Cambia a "Processing" → "Shipped" → "Cancelled"

**Resultado Esperado:**
- ✅ Stock físico: +10 (se restaura el stock)
- ✅ Movimiento de stock tipo "entry" creado
- ✅ Reserva marcada como "cancelled"

**Verificar en logs:**
```
✅ "Restoring stock for cancelled shipped order"
✅ "Creating reverse stock movements"
```

---

## 🔍 Cómo Verificar en Base de Datos

### **Ver Reservas Activas**
```sql
SELECT
  r.*,
  p.name as product_name,
  o.status as order_status
FROM stock_reservations r
JOIN products p ON r.product_id = p.product_id
JOIN orders o ON r.order_id = o.order_id
WHERE r.organization_id = 'YOUR_ORG_ID'
ORDER BY r.reserved_at DESC;
```

### **Ver Stock Disponible vs Físico**
```sql
-- Stock físico (de movimientos)
SELECT
  product_id,
  SUM(CASE WHEN movement_type = 'entry' THEN quantity ELSE -quantity END) as physical_stock
FROM stock_movements
WHERE organization_id = 'YOUR_ORG_ID'
  AND warehouse_id = 'YOUR_WAREHOUSE_ID'
GROUP BY product_id;

-- Stock reservado
SELECT
  product_id,
  SUM(quantity) as reserved_stock
FROM stock_reservations
WHERE organization_id = 'YOUR_ORG_ID'
  AND warehouse_id = 'YOUR_WAREHOUSE_ID'
  AND status = 'active'
GROUP BY product_id;

-- Stock disponible (físico - reservado)
SELECT * FROM get_available_stock(
  'PRODUCT_ID',
  'WAREHOUSE_ID',
  'ORG_ID'
);
```

---

## ❌ Errores Comunes

### **Error 1: "Rate limit exceeded"**
✅ **Arreglado**: Reinicia el backend después del cambio en `rateLimiting.js`

### **Error 2: "Stock no se está reservando"**
**Posibles causas:**
1. El pedido NO está en estado "processing"
   - Solución: Cambiar estado a "processing"
2. Ya existe una reserva para ese pedido
   - Verificar en logs: "Stock already reserved for this order"

### **Error 3: "Stock available no cambia en la UI"**
**Posibles causas:**
1. El frontend está cacheando el valor
   - Solución: Refrescar la página o esperar 10 segundos (staleTime)
2. El warehouse_id no coincide
   - Verificar que estés viendo el mismo warehouse

### **Error 4: "Cannot reserve stock for order with status..."**
**Causa:** Intentas reservar stock para un pedido ya "shipped" o "cancelled"
**Solución:** Solo puedes reservar stock en estados "draft", "pending", o "processing"

---

## 📊 Checklist de Pruebas

### **Flujo Básico**
- [ ] Crear pedido en "pending" → No reserva stock
- [ ] Cambiar a "processing" → Reserva stock ✅
- [ ] Cambiar a "shipped" → Deduce stock físico ✅
- [ ] Verificar stock disponible disminuye correctamente

### **Flujo de Cancelación**
- [ ] Cancelar desde "pending" → Sin efecto (no había reservas)
- [ ] Cancelar desde "processing" → Libera reservas ✅
- [ ] Cancelar desde "shipped" → Restaura stock físico ✅

### **Validación de Stock**
- [ ] Crear pedido con cantidad > stock disponible → Error ❌
- [ ] Ver "X available" en UI actualizado correctamente
- [ ] Warnings de low stock funcionando

### **Edge Cases**
- [ ] Intentar reservar dos veces → No duplica reservas
- [ ] Stock insuficiente → Error claro y descriptivo
- [ ] Múltiples pedidos simultáneos → Stock se reserva correctamente

---

## 🎯 Resultado Esperado Final

Si todo funciona correctamente:

1. **Rate Limiting**: ✅ No más errores en desarrollo
2. **Stock Reservation**: ✅ Stock se reserva al procesar pedidos
3. **Stock Deduction**: ✅ Stock se deduce al enviar pedidos
4. **Stock Release**: ✅ Stock se libera al cancelar
5. **Real-time Validation**: ✅ UI muestra stock disponible correcto

---

## 🐛 Debugging

Si algo no funciona, revisa:

1. **Backend logs** - Busca estos mensajes:
   ```
   "Reserving stock for order"
   "Stock reserved successfully"
   "Order shipped - creating stock movements"
   "Releasing stock reservations"
   ```

2. **Browser DevTools Console** - Errores de API

3. **Network Tab** - Verifica que el endpoint `/api/products/:id/available-stock` responda correctamente

4. **Database** - Revisa tablas:
   - `stock_reservations` - debe tener registros con status "active"
   - `stock_movements` - debe tener movimientos de entrada/salida
   - `orders` - verifica el campo `status`

---

## 📝 Notas Importantes

1. **Stock Available NO es lo mismo que Stock Físico**
   - Stock Físico = Total en warehouse (de stock_movements)
   - Stock Reservado = Pedidos en "processing"
   - Stock Disponible = Físico - Reservado

2. **El flujo correcto es**:
   ```
   Pending → Processing (reserva) → Shipped (deduce) → Completed
                      ↓
                 Cancelled (libera/restaura)
   ```

3. **Nunca saltes "processing"**:
   - Si vas directo de "pending" a "shipped", el stock se deducirá pero sin reserva previa
   - Esto puede causar problemas de concurrencia

---

**¡Ahora prueba el sistema completo!** 🚀

Si encuentras algún problema, revisa los logs del backend y comparte el error específico.
