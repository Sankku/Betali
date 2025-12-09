# 🚀 EMPEZAR TESTING AHORA - Guía Rápida

**Fecha**: 2025-12-07
**Objetivo**: Testing de Stock Reservation System (DÍA 1)

---

## ⚡ Inicio Rápido (5 minutos)

### 1. Backend y Frontend Corriendo

```bash
# Terminal 1 - Backend
cd backend
node server.js
# ✓ Debería mostrar: Server running on port 4000

# Terminal 2 - Frontend
cd frontend
bun run dev
# ✓ Debería mostrar: Local: http://localhost:3000
```

### 2. Login en la Aplicación

- Ir a: **http://localhost:3000**
- Login con tu cuenta (`mail@prueba.com` o la que uses)
- Verificar que estás en tu organización

### 3. Crear Datos de Prueba (EN LA UI)

Ya tienes warehouse creado, pero necesitas productos y clientes.

**Crear Productos**:
1. Ir a `Products` → `Add New Product`
2. Crear 3 productos:
   - **TEST Product A**:
     - Name: TEST Product A
     - Batch Number: TEST-A-001
     - Expiration Date: 2025-12-31
     - Origin Country: Argentina
     - Description: For testing stock reservations

   - **TEST Product B**:
     - Name: TEST Product B
     - Batch Number: TEST-B-001
     - Expiration Date: 2025-12-31
     - Origin Country: Argentina
     - Description: For testing stock reservations

   - **TEST Product C (Low Stock)**:
     - Name: TEST Product C
     - Batch Number: TEST-C-001
     - Expiration Date: 2025-12-31
     - Origin Country: Argentina
     - Description: For testing low stock warnings

**Agregar Stock Inicial**:
1. Ir a `Stock Movements` → `Add Movement`
2. Para cada producto:
   - Product: Seleccionar el producto
   - Warehouse: TEST Warehouse
   - Movement Type: Entry
   - Quantity:
     - Product A: 100 unidades
     - Product B: 50 unidades
     - Product C: 10 unidades
   - Reason: "Initial stock for testing"

**Crear Cliente**:
1. Ir a `Clients` → `Add New Client`
2. Datos:
   - Name: TEST Client
   - CUIT: 20-12345678-9
   - Email: test@example.com
   - Phone: 1234567890
   - Address: Test Address 123

---

## 🧪 TESTING - Seguir Esta Guía

Archivo principal: **`TESTING-DAY1-MANUAL-GUIDE.md`**

Este archivo contiene:
- ✅ 8 tests detallados paso a paso
- ✅ Resultados esperados
- ✅ Cómo verificar cada test
- ✅ Checklist completo

### Tests a Ejecutar (en orden):

1. **TEST 1**: Pedido "pending" → No crea reserva
2. **TEST 2**: Cambiar a "processing" → Crea reserva
3. **TEST 3**: Cambiar a "shipped" → Deduce stock
4. **TEST 4**: Cancelar desde "processing" → Libera stock
5. **TEST 5**: Cancelar desde "shipped" → Restaura stock
6. **TEST 6**: Stock disponible en UI
7. **TEST 7**: Warning de low stock
8. **TEST 8**: Error de insufficient stock

---

## 📊 Comandos Útiles Durante Testing

### Ver estado de productos
```bash
node backend/scripts/check-stock-status.js products
```

### Ver órdenes recientes
```bash
node backend/scripts/check-stock-status.js orders
```

### Ver reservas activas
```bash
node backend/scripts/check-stock-status.js reservations
```

### Ver movimientos de stock
```bash
node backend/scripts/check-stock-status.js movements
```

---

## 🔍 Qué Verificar en Cada Test

### Durante el testing, revisar:

**1. Logs del Backend** (Terminal 1)
```bash
# Cuando cambia a "processing"
✅ "Reserving stock for order"
✅ "Stock reserved successfully"

# Cuando cambia a "shipped"
✅ "Order shipped - creating stock movements"
✅ "Fulfilling reservations for order"

# Cuando se cancela
✅ "Releasing stock reservations for cancelled order"
```

**2. En la UI**
- Stock disponible se actualiza correctamente
- Warnings aparecen cuando stock < threshold
- Errors bloquean pedidos con stock insuficiente

**3. En la Base de Datos** (Opcional)
```sql
-- Ver reservas
SELECT * FROM stock_reservations
WHERE organization_id = 'YOUR_ORG_ID'
ORDER BY reserved_at DESC;

-- Ver stock disponible
SELECT * FROM get_available_stock(
  'PRODUCT_ID',
  'WAREHOUSE_ID',
  'ORG_ID'
);
```

---

## 📝 Documentar Resultados

Después de cada test:
1. Marcar checkbox en `TESTING-DAY1-MANUAL-GUIDE.md`
2. Si hay bugs, documentarlos en la sección correspondiente
3. Tomar screenshots si es necesario

Al finalizar los 8 tests:
1. Copiar `TESTING-DAY1-MANUAL-GUIDE.md` → `TESTING-RESULTS-DIA1.md`
2. Llenar todas las secciones
3. Agregar estadísticas finales

---

## 🎯 Flujo Esperado

```
ESTADO DEL PEDIDO       │ STOCK FÍSICO │ STOCK RESERVADO │ STOCK DISPONIBLE
────────────────────────┼──────────────┼─────────────────┼─────────────────
PENDING/DRAFT           │  Sin cambios │        0        │   Sin cambios
PROCESSING              │  Sin cambios │   +cantidad     │   -cantidad
SHIPPED                 │   -cantidad  │        0        │   Sin cambios
CANCELLED (de proc.)    │  Sin cambios │   -cantidad     │   +cantidad
CANCELLED (de shipped)  │   +cantidad  │        0        │   +cantidad
```

### Ejemplo con 100 unidades:
1. Stock inicial: **100 físico, 100 disponible**
2. Pedido 10 en "pending": **100 físico, 100 disponible**
3. Cambio a "processing": **100 físico, 90 disponible** (10 reservadas)
4. Cambio a "shipped": **90 físico, 90 disponible** (10 ya enviadas)
5. Cancelar: **100 físico, 100 disponible** (10 restauradas)

---

## ✅ Criterios de Éxito

Para considerar el DÍA 1 completo:

- [ ] 8/8 tests ejecutados
- [ ] 8/8 tests pasando (o bugs documentados)
- [ ] Stock se reserva correctamente en "processing"
- [ ] Stock se deduce correctamente en "shipped"
- [ ] Stock se libera correctamente al cancelar
- [ ] UI muestra información correcta
- [ ] Logs del backend muestran mensajes correctos
- [ ] Resultados documentados en `TESTING-RESULTS-DIA1.md`

---

## 🐛 Si Encuentras Bugs

Para cada bug encontrado, documenta:

1. **Descripción**: ¿Qué está mal?
2. **Pasos para reproducir**: ¿Cómo llegar al bug?
3. **Esperado**: ¿Qué debería pasar?
4. **Actual**: ¿Qué está pasando?
5. **Prioridad**: Crítico / Alto / Medio / Bajo
6. **Screenshots**: Si es posible

---

## 📈 Progreso del MVP

```
SEMANA 1: Testing & Validación
├─ DÍA 1: Stock Reservation Testing  ⏳ HACER AHORA
├─ DÍA 2: Multi-Tenant Testing - Parte 1  ⏳ SIGUIENTE
├─ DÍA 3: Multi-Tenant Testing - Parte 2  ⏳ PENDIENTE
├─ DÍA 4-5: E2E Testing Setup  ⏳ PENDIENTE
```

---

## 🎉 Después del Testing

### Si TODO pasa:
✅ ¡Excelente! El sistema de reservas funciona 100%
✅ Crear `TESTING-RESULTS-DIA1.md` con resultados
✅ Continuar con DÍA 2: Multi-Tenant Testing

### Si hay bugs CRÍTICOS:
⚠️ Arreglarlos antes de continuar
⚠️ Re-ejecutar tests afectados
⚠️ Documentar las soluciones

### Si hay bugs MENORES:
📝 Documentarlos en backlog
📝 Priorizar para después
✅ Continuar con DÍA 2

---

## 💡 Tips Importantes

1. **Usa el mismo producto** para todos los tests (más fácil de trackear)
2. **Anota los IDs** de los pedidos que creas
3. **Revisa los logs** del backend constantemente
4. **No te apures** - mejor hacerlo bien que rápido
5. **Toma breaks** cada 2 tests para mantener foco

---

## 📞 Archivos de Referencia

- **Guía principal**: `TESTING-DAY1-MANUAL-GUIDE.md`
- **Sistema de reservas**: `STOCK-RESERVATION-TEST-GUIDE.md`
- **Roadmap completo**: `ROADMAP-ACTUALIZADO-2025-12-07.md`
- **Progreso MVP**: `MVP-PROGRESS-ANALYSIS.md`
- **Resumen sesión**: `TESTING-SESSION-SUMMARY.md`

---

## 🚀 ¡EMPEZAR AHORA!

### Checklist Pre-Testing:
- [ ] Backend corriendo (port 4000)
- [ ] Frontend corriendo (port 3000)
- [ ] Login exitoso en la app
- [ ] Warehouse "TEST Warehouse" existe
- [ ] 3 productos creados con stock inicial
- [ ] Cliente "TEST Client" creado
- [ ] `TESTING-DAY1-MANUAL-GUIDE.md` abierto

### Primer Paso:
1. Abrir `TESTING-DAY1-MANUAL-GUIDE.md`
2. Ir a **TEST 1: Pedido en "Pending"**
3. Seguir los pasos exactamente
4. Marcar checkboxes conforme avanzas

---

**¡Éxito con el testing!** 🎯

Si todo funciona bien, estarás un paso más cerca de lanzar tu MVP. Si encuentras bugs, estarás identificando problemas ANTES de lanzar (mucho mejor).

**Win-win!** 🚀

---

**Última actualización**: 2025-12-07
**Tiempo estimado**: 2-3 horas
**Siguiente paso**: DÍA 2 - Multi-Tenant Testing
