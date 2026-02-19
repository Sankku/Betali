# 🚀 Próxima Sesión - START HERE

**Last Updated**: 2025-12-08 (E2E Setup Complete)
**Current Progress**: 80%
**Next Objective**: Semana 2 - Purchase Orders Backend (Day 6-7)

---

## ✅ Lo que se completó en la sesión anterior

### Semana 4 - Day 4-5: E2E Testing Setup ✅ COMPLETO

- ✅ Playwright instalado y configurado
- ✅ 15 tests E2E implementados (superó la meta de 5)
- ✅ Infrastructure completa (helpers, fixtures, test data)
- ✅ Documentación comprehensiva
- ✅ Ready para CI/CD

**Ver detalles**: `E2E-SETUP-COMPLETE.md` y `SESSION-SUMMARY-E2E-SETUP.md`

---

## 🎯 Próxima Sesión: Purchase Orders Backend (Day 6-7)

### Objetivo

Implementar el sistema completo de órdenes de compra (Purchase Orders) en el backend, permitiendo:
- Crear órdenes de compra a proveedores
- Gestionar estados de órdenes
- Registrar recepción de productos → Generar stock movements
- Multi-tenant isolation completo

### Tiempo Estimado

**2 días** según roadmap

---

## 📋 Tareas a Completar - Day 6 (Backend Part 1)

### 1. **Migration - Base de Datos** ⏳

**Archivo**: `/backend/scripts/migrations/007_create_purchase_orders.sql`

```sql
-- Tabla principal de purchase orders
CREATE TABLE purchase_orders (
  purchase_order_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  supplier_id UUID REFERENCES suppliers(supplier_id),
  warehouse_id UUID REFERENCES warehouse(warehouse_id),
  user_id UUID REFERENCES users(user_id),
  status VARCHAR(50) DEFAULT 'draft',
  order_date TIMESTAMP DEFAULT NOW(),
  expected_delivery_date DATE,
  subtotal DECIMAL(15,2),
  tax_amount DECIMAL(15,2),
  total_price DECIMAL(15,2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT check_purchase_status CHECK (
    status IN ('draft', 'pending', 'approved', 'received', 'cancelled')
  )
);

-- Tabla de detalles de purchase order
CREATE TABLE purchase_order_details (
  detail_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(purchase_order_id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(organization_id),
  product_id UUID NOT NULL REFERENCES products(product_id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  received_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes para performance
CREATE INDEX idx_purchase_orders_org_id ON purchase_orders(organization_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_order_details_order_id ON purchase_order_details(purchase_order_id);
CREATE INDEX idx_purchase_order_details_org_id ON purchase_order_details(organization_id);

-- RLS Policies para multi-tenant
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_org_isolation ON purchase_orders
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);

CREATE POLICY purchase_order_details_org_isolation ON purchase_order_details
  FOR ALL USING (organization_id = current_setting('app.current_organization_id')::UUID);
```

**Checklist**:
- [ ] Create migration file
- [ ] Apply migration to database
- [ ] Verify tables created
- [ ] Test RLS policies

### 2. **Repository - PurchaseOrderRepository.js** ⏳

**Archivo**: `/backend/repositories/PurchaseOrderRepository.js`

**Métodos a implementar**:
```javascript
class PurchaseOrderRepository extends BaseRepository {
  async create(orderData) {
    // Create purchase order with details
  }

  async findById(id, organizationId) {
    // Get purchase order with details
  }

  async findAll(organizationId, filters = {}) {
    // List all purchase orders with filters
  }

  async updateStatus(id, organizationId, status) {
    // Update order status
  }

  async delete(id, organizationId) {
    // Soft delete or cancel order
  }

  async getOrderWithDetails(id, organizationId) {
    // Get complete order with all details
  }
}
```

**Checklist**:
- [ ] Extend BaseRepository
- [ ] Implement CRUD methods
- [ ] Add organization_id filtering
- [ ] Include error handling
- [ ] Add logging

### 3. **Repository - PurchaseOrderDetailRepository.js** ⏳

**Archivo**: `/backend/repositories/PurchaseOrderDetailRepository.js`

**Métodos a implementar**:
```javascript
class PurchaseOrderDetailRepository extends BaseRepository {
  async createBulk(details) {
    // Create multiple order details
  }

  async findByPurchaseOrderId(purchaseOrderId, organizationId) {
    // Get all details for an order
  }

  async updateReceivedQuantity(detailId, quantity, organizationId) {
    // Update received quantity when order is received
  }

  async deleteByPurchaseOrderId(purchaseOrderId, organizationId) {
    // Delete all details for an order
  }
}
```

**Checklist**:
- [ ] Extend BaseRepository
- [ ] Implement methods
- [ ] Bulk operations support
- [ ] Organization filtering

---

## 📋 Tareas a Completar - Day 7 (Backend Part 2)

### 4. **Service - PurchaseOrderService.js** ⏳

**Archivo**: `/backend/services/PurchaseOrderService.js`

**Métodos críticos**:
```javascript
class PurchaseOrderService {
  async createPurchaseOrder(orderData, organizationId) {
    // 1. Validate supplier exists
    // 2. Validate warehouse exists
    // 3. Validate products exist
    // 4. Calculate totals
    // 5. Create order + details in transaction
    // 6. Return complete order
  }

  async updatePurchaseOrderStatus(orderId, organizationId, newStatus) {
    // 1. Validate status transition
    // 2. Apply business rules
    // 3. Update status
    // 4. Return updated order
  }

  async handlePurchaseOrderReceived(orderId, organizationId) {
    // 1. Get order details
    // 2. Create stock entry movements for each item
    // 3. Update received_quantity in details
    // 4. Mark order as 'received'
    // 5. Return success
  }

  async handlePurchaseOrderCancelled(orderId, organizationId) {
    // 1. Validate can be cancelled
    // 2. Update status to 'cancelled'
    // 3. Don't affect stock (nothing received yet)
  }

  async getPurchaseOrders(organizationId, filters) {
    // List orders with filters
  }

  async getPurchaseOrderById(orderId, organizationId) {
    // Get single order with all details
  }
}
```

**Checklist**:
- [ ] Create service class
- [ ] Implement business logic
- [ ] Add transaction support
- [ ] Integrate with stock movements
- [ ] Add validation
- [ ] Add error handling

### 5. **Controller - PurchaseOrderController.js** ⏳

**Archivo**: `/backend/controllers/PurchaseOrderController.js`

**Endpoints**:
```javascript
class PurchaseOrderController {
  async createPurchaseOrder(req, res) {
    // POST /api/purchase-orders
  }

  async getPurchaseOrders(req, res) {
    // GET /api/purchase-orders
  }

  async getPurchaseOrderById(req, res) {
    // GET /api/purchase-orders/:id
  }

  async updatePurchaseOrderStatus(req, res) {
    // PATCH /api/purchase-orders/:id/status
  }

  async deletePurchaseOrder(req, res) {
    // DELETE /api/purchase-orders/:id
  }
}
```

**Checklist**:
- [ ] Create controller
- [ ] Implement endpoints
- [ ] Add validation middleware
- [ ] Add authentication middleware
- [ ] Add organization context

### 6. **Routes - purchase-orders.js** ⏳

**Archivo**: `/backend/routes/purchase-orders.js`

```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const purchaseOrderController = require('../controllers/PurchaseOrderController');

router.post('/', authMiddleware, purchaseOrderController.createPurchaseOrder);
router.get('/', authMiddleware, purchaseOrderController.getPurchaseOrders);
router.get('/:id', authMiddleware, purchaseOrderController.getPurchaseOrderById);
router.patch('/:id/status', authMiddleware, purchaseOrderController.updatePurchaseOrderStatus);
router.delete('/:id', authMiddleware, purchaseOrderController.deletePurchaseOrder);

module.exports = router;
```

**Checklist**:
- [ ] Create routes file
- [ ] Add authentication
- [ ] Add to main app.js
- [ ] Test endpoints

---

## 🧪 Testing (Optional pero recomendado)

### Unit Tests

**Archivo**: `/backend/tests/unit/services/PurchaseOrderService.test.js`

**Tests básicos**:
- [ ] Create purchase order successfully
- [ ] Validate required fields
- [ ] Calculate totals correctly
- [ ] Handle order received → Create stock movements
- [ ] Cancel order
- [ ] Multi-tenant isolation

---

## 🔧 Setup Inicial - Comandos

### Antes de empezar

```bash
# 1. Pull latest changes
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant
git status
git pull origin develop

# 2. Check backend dependencies
cd backend
npm install

# 3. Verify database connection
node -e "const { supabase } = require('./config/supabase'); console.log('DB Connected');"
```

### Durante desarrollo

```bash
# Terminal 1 - Backend (auto-reload)
cd backend
node server.js

# Terminal 2 - Para testing manual
cd backend
node scripts/test-purchase-orders.js  # Crear después

# Terminal 3 - Logs
tail -f backend/logs/app.log
```

---

## 📁 Archivos a Crear (Checklist)

### Backend Files

- [ ] `/backend/scripts/migrations/007_create_purchase_orders.sql`
- [ ] `/backend/repositories/PurchaseOrderRepository.js`
- [ ] `/backend/repositories/PurchaseOrderDetailRepository.js`
- [ ] `/backend/services/PurchaseOrderService.js`
- [ ] `/backend/controllers/PurchaseOrderController.js`
- [ ] `/backend/routes/purchase-orders.js`

### Optional but Recommended

- [ ] `/backend/tests/unit/services/PurchaseOrderService.test.js`
- [ ] `/backend/scripts/test-purchase-orders.js` (manual testing script)
- [ ] `/backend/validations/purchaseOrderValidation.js`

### Documentation (Day 7)

- [ ] `PURCHASE-ORDERS-IMPLEMENTATION.md` (document what you built)

---

## 💡 Tips para esta Sesión

### 1. **Seguir Patrones Existentes**

Usa como referencia los archivos existentes:
- `OrderRepository.js` - Similar structure
- `OrderService.js` - Similar business logic
- `ProductController.js` - Similar controller pattern

### 2. **Multi-Tenant Siempre**

**CRÍTICO**: Todos los queries deben incluir `organization_id`:

```javascript
// ✅ CORRECTO
const orders = await supabase
  .from('purchase_orders')
  .select('*')
  .eq('organization_id', organizationId);

// ❌ INCORRECTO (Data leak!)
const orders = await supabase
  .from('purchase_orders')
  .select('*');
```

### 3. **Transaction Support**

Para crear purchase order + details:

```javascript
// Use transaction helper si existe
const result = await this.withTransaction(async (client) => {
  const order = await this.purchaseOrderRepo.create(orderData);
  const details = await this.detailRepo.createBulk(detailsData);
  return { order, details };
});
```

### 4. **Status Transitions**

Validar transiciones permitidas:

```javascript
const allowedTransitions = {
  'draft': ['pending', 'cancelled'],
  'pending': ['approved', 'cancelled'],
  'approved': ['received', 'cancelled'],
  'received': [],
  'cancelled': []
};
```

### 5. **Stock Movements Integration**

Cuando order is "received":

```javascript
// For each detail in the order
for (const detail of orderDetails) {
  await stockMovementService.createMovement({
    product_id: detail.product_id,
    warehouse_id: order.warehouse_id,
    movement_type: 'entry',
    quantity: detail.quantity,
    reference_type: 'purchase_order',
    reference_id: order.purchase_order_id,
    organization_id: organizationId
  });
}
```

---

## 📖 Documentos de Referencia

### Antes de empezar, revisar:

1. **ROADMAP-ACTUALIZADO-2025-12-07.md** - Ver detalles completos de Day 6-7
2. **SAAS_ARCHITECTURE.md** - Multi-tenant patterns
3. **backend/services/OrderService.js** - Ejemplo similar
4. **backend/repositories/OrderRepository.js** - Patrón a seguir

### Durante desarrollo:

- **backend/config/container.js** - Para registrar nuevos servicios
- **backend/server.js** - Para agregar nuevas routes

---

## ✅ Definition of Done - Day 6-7

### Backend Completo cuando:

- [ ] Migration aplicada exitosamente
- [ ] Tables creadas con RLS policies
- [ ] Repositories implementados y funcionando
- [ ] Service implementado con toda la business logic
- [ ] Controller implementado con todos los endpoints
- [ ] Routes configuradas y agregadas a app.js
- [ ] Puede crear purchase order via API
- [ ] Puede cambiar status a "received" → Crea stock movements
- [ ] Multi-tenant isolation verificado
- [ ] Tests manuales pasados
- [ ] Logs funcionando correctamente

### Endpoints funcionando:

- [ ] `POST /api/purchase-orders` - Create
- [ ] `GET /api/purchase-orders` - List all
- [ ] `GET /api/purchase-orders/:id` - Get one
- [ ] `PATCH /api/purchase-orders/:id/status` - Update status
- [ ] `DELETE /api/purchase-orders/:id` - Cancel

---

## 🚀 Quick Start - First Steps

### 1. Create Migration File (10 min)

```bash
cd backend/scripts/migrations
touch 007_create_purchase_orders.sql
# Copy SQL from above
```

### 2. Apply Migration (5 min)

```bash
# Via Supabase dashboard SQL editor
# or
node scripts/apply-migration.js 007_create_purchase_orders.sql
```

### 3. Create Repositories (30 min each)

```bash
cd backend/repositories
touch PurchaseOrderRepository.js
touch PurchaseOrderDetailRepository.js
# Implement following patterns from OrderRepository.js
```

### 4. Create Service (1 hour)

```bash
cd backend/services
touch PurchaseOrderService.js
# Implement business logic
```

### 5. Create Controller & Routes (30 min)

```bash
cd backend/controllers
touch PurchaseOrderController.js

cd ../routes
touch purchase-orders.js
```

### 6. Register in Container & App (10 min)

```javascript
// backend/config/container.js
const PurchaseOrderService = require('../services/PurchaseOrderService');
const PurchaseOrderController = require('../controllers/PurchaseOrderController');

// Register
container.register('purchaseOrderService', new PurchaseOrderService(...));
container.register('purchaseOrderController', new PurchaseOrderController(...));
```

```javascript
// backend/server.js
const purchaseOrderRoutes = require('./routes/purchase-orders');
app.use('/api/purchase-orders', purchaseOrderRoutes);
```

---

## 🎯 Success Criteria

Al final de Day 6-7 deberías poder:

1. ✅ Crear una purchase order via API
2. ✅ Ver lista de purchase orders
3. ✅ Cambiar status de "draft" → "pending" → "approved" → "received"
4. ✅ Cuando status = "received" → Stock movements creados automáticamente
5. ✅ Cancelar purchase order
6. ✅ Verificar que organizaciones diferentes no ven purchase orders de otras

---

## 📊 Progreso Esperado

**Antes Day 6-7**: 80%
**Después Day 6-7**: 82%

```
████████████████████░░ 82%
```

---

## 🎉 ¡Listo para empezar!

**Próximo objetivo**: Purchase Orders Backend (Day 6-7)

**Archivos que vas a crear**: 6-8 archivos
**Tiempo estimado**: 4-6 horas
**Dificultad**: Media (siguiendo patrones existentes)

**¡Buena suerte! 🚀**

---

**Last updated**: 2025-12-08
**Next review**: After Day 6-7 complete
