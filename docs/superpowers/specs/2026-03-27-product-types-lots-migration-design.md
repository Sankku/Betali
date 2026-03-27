# Product Types & Lots Migration Design

## Goal

Separate the current `products` table (which conflates product type definitions with lot/batch tracking) into two distinct entities: `product_types` (SKU catalog) and `product_lots` (batch instances). This enables proper FEFO inventory management, per-type stock aggregation, and clearer data semantics.

## Context

The current `products` table uses `batch_number` as both a product identifier (SKU) and a lot/batch number. This conflation makes it impossible to:
- Show total stock of "Harina Gruesa 25kg" across all lots
- Track multiple lots of the same product with different expiration dates and costs
- Apply product-level pricing rules, discounts, or formulas independent of lot

**Data strategy:** Backup real user records (~10-15), truncate all transactional data, implement new schema, repopulate only user/org data. All product/stock/order data is test data and will be discarded.

---

## Architecture

### Database Schema

#### New table: `product_types`

```sql
CREATE TABLE product_types (
  product_type_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               VARCHAR(100) NOT NULL,
  name              VARCHAR(255) NOT NULL,
  product_type      VARCHAR(20) NOT NULL DEFAULT 'standard'
                    CHECK (product_type IN ('standard', 'raw_material', 'finished_good')),
  unit              VARCHAR(20) NOT NULL DEFAULT 'unidad'
                    CHECK (unit IN ('kg', 'g', 'mg', 'l', 'ml', 'unidad', 'docena')),
  min_stock         NUMERIC(10,4),
  max_stock         NUMERIC(10,4),
  description       TEXT,
  alert_enabled     BOOLEAN DEFAULT true,
  senasa_product_id UUID REFERENCES senasa_products(senasa_product_id),
  organization_id   UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  branch_id         UUID REFERENCES branches(branch_id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sku, organization_id)
);
```

#### Renamed/modified table: `products` → `product_lots`

The current `products` table is renamed to `product_lots`. Lot-level fields are retained; type-level fields move to `product_types`.

```sql
-- Renamed columns and additions
ALTER TABLE products RENAME TO product_lots;
ALTER TABLE product_lots RENAME COLUMN product_id TO lot_id;
ALTER TABLE product_lots RENAME COLUMN batch_number TO lot_number;
ALTER TABLE product_lots ADD COLUMN product_type_id UUID NOT NULL REFERENCES product_types(product_type_id);

-- Columns removed (moved to product_types):
-- product_type, unit, min_stock, max_stock, alert_enabled, name

-- Remaining lot-level columns:
-- lot_id, lot_number, product_type_id, expiration_date, origin_country,
-- price (cost of this specific lot), destination_id, external_product_id,
-- organization_id, branch_id, created_at, updated_at

-- Unique constraint
ALTER TABLE product_lots ADD CONSTRAINT product_lots_lot_number_org_unique
  UNIQUE(lot_number, organization_id);
```

#### FK changes across dependent tables

| Table | Old column | New column | References |
|-------|-----------|------------|------------|
| `stock_movements` | `product_id` | `lot_id` | `product_lots.lot_id` |
| `stock_reservations` | `product_id` | `lot_id` | `product_lots.lot_id` |
| `inventory_alerts` | `product_id` | `product_type_id` | `product_types.product_type_id` |
| `order_details` | `product_id` | `product_type_id` (required) + `lot_id` (nullable) | both tables |
| `product_formulas` | `finished_product_id` | `product_type_id` | `product_types.product_type_id` |
| `product_formulas` | `raw_material_id` | `product_type_id` | `product_types.product_type_id` |
| `customer_pricing` | `product_id` | `product_type_id` | `product_types.product_type_id` |
| `discount_rule_products` | `product_id` | `product_type_id` | `product_types.product_type_id` |
| `purchase_order_details` | `product_id` | `product_type_id` | `product_types.product_type_id` |
| `product_tax_groups` | `product_id` | `product_type_id` | `product_types.product_type_id` |

#### RLS policies
Both new tables require `organization_isolation` RLS policies matching the existing pattern in the codebase.

---

### Backend Architecture

#### New files

**Repositories:**
- `backend/repositories/ProductTypeRepository.js` — CRUD on `product_types`. Extends `BaseRepository`. Methods: `findByOrg`, `findBySku`, `findById`, `create`, `update`, `delete`.
- `backend/repositories/ProductLotRepository.js` — replaces `ProductRepository`. Operates on `product_lots`. Methods: `findByOrg`, `findByType`, `findByLotNumber`, `findExpiringByOrg`, `getStockByWarehouse`.

**Services:**
- `backend/services/ProductTypeService.js` — product type management. Validates SKU uniqueness per org. Methods: `getTypes`, `getTypeById`, `createType`, `updateType`, `deleteType`, `searchTypes`.
- `backend/services/ProductLotService.js` — lot management + FEFO logic. Methods: `getLotsByType`, `createLot`, `updateLot`, `deleteLot`, `fefoAssignLot(productTypeId, warehouseId, quantityNeeded)`, `bulkImport(rows, userId, orgId)`.

**Controllers:**
- `backend/controllers/ProductTypeController.js`
- `backend/controllers/ProductLotController.js`

**Routes:**
- `backend/routes/productTypes.js` → `/api/product-types`
- `backend/routes/productLots.js` → `/api/product-types/:typeId/lots` and `/api/product-lots`

**Validations:**
- `backend/validations/productTypeValidation.js`
- `backend/validations/productLotValidation.js`

#### Modified files

| File | Change |
|------|--------|
| `ProductFormulaService.js` | Use `product_type_id` instead of `product_id` |
| `StockMovementService.js` | `product_id` → `lot_id`; add FEFO dispatch logic |
| `OrderService.js` | `order_details` uses `product_type_id` + optional `lot_id` |
| `container.js` | Register new repos/services; wire dependencies |
| `PricingService.js` | Replace `product_id` lookups in `product_tax_groups` and `customer_pricing` with `product_type_id`; update `calculateOrderPricing` to accept `product_type_id` on line items |
| `DashboardService.js` | Replace `productRepository` usage with `productTypeRepository` and `productLotRepository`; update `product_id` references in movement enrichment |

#### FEFO logic (in `ProductLotService`)

```
fefoAssignLot(productTypeId, warehouseId, quantityNeeded, orgId):
  1. Query product_lots WHERE product_type_id = X AND organization_id = Y
  2. For each lot, compute available_stock by summing stock_movements
     WHERE lot_id = lot AND warehouse_id = warehouseId  ← scoped to target warehouse
     (entry = +qty, exit/production/adjustment = -qty, minus active reservations)
  3. Filter to lots with available_stock > 0 AND expiration_date >= current_date
  4. Sort by expiration_date ASC (earliest first = FEFO)
  5. Return first lot where available_stock >= quantityNeeded
  6. If no single lot has enough: return earliest lot with partial flag
     { lot_id, available_stock, quantity_needed, partial: true }
```

Stock is always scoped to `warehouseId`. A lot may exist in multiple warehouses simultaneously; FEFO is computed per warehouse.

#### OrderService + PricingService interaction

`OrderService` passes line items to `PricingService.calculateOrderPricing`. After migration:
- Line items carry `product_type_id` (required) + `lot_id` (optional)
- `PricingService` uses `product_type_id` to look up `customer_pricing` and `product_tax_groups`
- `lot_id` is not used by pricing logic — it is used only by `StockMovementService` at dispatch time
- FEFO auto-assignment is triggered only for movement types `exit` and `production`. Types `entry` and `adjustment` always require an explicit `lot_id`.
- Interface change: `calculateOrderPricing(items)` where each item has `{ product_type_id, lot_id?, quantity, unit_price }`

#### Removed files
- `backend/repositories/ProductRepository.js` — replaced by `ProductLotRepository`
- `backend/controllers/ProductController.js` — replaced by two controllers
- `backend/routes/products.js` — replaced by two route files
- `backend/services/ProductService.js` — replaced by two services

---

### Frontend Architecture

#### Products page layout

```
Products.tsx
├── header: "Tipos de Producto" + [+ Nuevo Tipo] + [Importar CSV]
├── ProductTypeAccordion
│   ├── ProductTypeRow (collapsed)
│   │   summary: SKU | Nombre | product_type badge | N lotes | Stock total
│   ├── ProductTypeRow (expanded)
│   │   summary: (same)
│   │   └── ProductLotRow ×N
│   │       columns: Lote | Vence | Stock | Precio | Acciones
│   └── ...
├── ProductTypeSidePanel (slide-in from right)
│   form: sku, nombre, tipo, unidad, min/max stock, descripción, alerta
└── ProductLotSidePanel (slide-in from right)
    form: lot_number, vencimiento, precio, país de origen
```

#### New components

| Path | Responsibility |
|------|---------------|
| `components/features/products/ProductTypeAccordion.tsx` | Manages expand/collapse state per type |
| `components/features/products/ProductTypeRow.tsx` | Single type row; fetches lot sub-rows when expanded |
| `components/features/products/ProductLotRow.tsx` | Single lot row with inline actions |
| `components/features/products/ProductTypeSidePanel.tsx` | Create/edit form for product type |
| `components/features/products/ProductLotSidePanel.tsx` | Create/edit form for lot |

#### New hooks

| Hook | Endpoint |
|------|----------|
| `useProductTypes(options)` | `GET /api/product-types` |
| `useProductType(id)` | `GET /api/product-types/:id` |
| `useProductLots(typeId)` | `GET /api/product-types/:id/lots` |
| `useCreateProductType()` | `POST /api/product-types` |
| `useUpdateProductType()` | `PUT /api/product-types/:id` |
| `useDeleteProductType()` | `DELETE /api/product-types/:id` |
| `useCreateProductLot()` | `POST /api/product-types/:typeId/lots` |
| `useUpdateProductLot()` | `PUT /api/product-lots/:id` |
| `useDeleteProductLot()` | `DELETE /api/product-lots/:id` |
| `useProductTypeImport()` | `POST /api/product-types/bulk-import` |

File locations:
- `frontend/src/hooks/useProductTypes.ts`
- `frontend/src/hooks/useProductLots.ts`

#### New services

- `frontend/src/services/api/productTypesService.ts`
- `frontend/src/services/api/productLotsService.ts`

#### Modified components

| Component | Change |
|-----------|--------|
| `product-import-modal.tsx` | CSV columns: `sku` + `lot_number` instead of `batch_number`; two-step upsert |
| Stock movement form | Product selector: type dropdown → optional lot dropdown |
| Order creation form | `product_type_id` required + `lot_id` optional (FEFO label if null) |

#### Removed files
- `frontend/src/hooks/useProducts.ts` — replaced by `useProductTypes` + `useProductLots`
- `frontend/src/services/api/productsService.ts` — replaced by two services

---

### CSV Import (updated format)

New columns in the CSV template:

| Column | Required | Description |
|--------|----------|-------------|
| `sku` | Yes | Unique product type identifier per org |
| `name` | Yes | Product name |
| `product_type` | Yes | `standard`, `raw_material`, or `finished_good` |
| `unit` | Yes | `kg`, `g`, `mg`, `l`, `ml`, `unidad`, `docena` |
| `lot_number` | Yes | Lot/batch identifier |
| `expiration_date` | Yes | `YYYY-MM-DD` |
| `origin_country` | Yes | Country of origin |
| `price` | Yes | Cost price for this lot |
| `description` | No | Product description |
| `initial_stock` | No | Initial stock quantity |
| `warehouse_name` | No | Warehouse name for initial stock |

Import logic:
1. Upsert `product_types` by `(sku, organization_id)` — create if not exists, update if exists
2. Upsert `product_lots` by `(lot_number, organization_id)` — create if not exists, update if exists
3. Create initial stock movement if `initial_stock > 0` and `warehouse_name` resolves

---

### Data Backup & Migration Strategy

#### Step 1: Export real user data
```sql
-- Export these tables (real user data to preserve):
SELECT * FROM organizations;
SELECT * FROM users;
SELECT * FROM user_organizations;
SELECT * FROM branches;
SELECT * FROM warehouse;  -- warehouses belong to orgs, keep them
```

#### Step 2: Truncate transactional data
```sql
TRUNCATE TABLE stock_movements, stock_reservations, order_details, orders,
  product_formulas, inventory_alerts, customer_pricing, discount_rule_products,
  purchase_order_details, applied_discounts, product_tax_groups CASCADE;
DELETE FROM products;  -- will be renamed, truncate before schema change
```

#### Step 3: Apply schema migration SQL
Run the migration that:
1. Creates `product_types`
2. Renames `products` → `product_lots`
3. Updates all FK columns on dependent tables
4. Adds RLS policies

#### Step 4: Regenerate TypeScript types
```bash
supabase gen types typescript --project-id gzqjhtzuongvbtdwvzaz \
  > frontend/src/types/database.ts
```

---

### Error Handling

- **Duplicate SKU on import:** Return 409, message "Ya existe un tipo de producto con ese SKU en tu organización"
- **Lot not found for stock movement:** Return 404
- **FEFO no lot available:** Return 422 with `{ error: 'no_lot_available', product_type_id, quantity_needed, available }`
- **Order dispatch with explicit lot, insufficient stock:** Return 422 with available quantity
- **Delete product type with lots:** Block deletion if lots exist; return 409 with lot count

---

### Testing

**Backend unit tests:**
- `ProductTypeService`: SKU uniqueness, create/update/delete validation
- `ProductLotService`: FEFO assignment (multiple lots, partial stock, expired lots excluded)
- `StockMovementService`: lot_id required, FEFO trigger when lot_id null
- `ProductLotService.bulkImport`: two-step upsert, warehouse resolution

**Frontend:**
- `ProductTypeAccordion`: expand/collapse, lazy load lots on expand
- `product-import-modal`: new CSV column validation (sku required, lot_number required)

---

### Open Questions (resolved)

| Question | Decision |
|----------|----------|
| Data strategy | Option A: clean break, backup users only |
| Order lot assignment | Hybrid: optional `lot_id`, FEFO auto-assign if null |
| Products UI layout | Accordion (C) + side panel for editing |
| Table rename strategy | Rename `products` → `product_lots` (clean break, no data to migrate) |
