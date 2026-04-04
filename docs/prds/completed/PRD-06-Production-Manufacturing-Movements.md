# PRD-06: Sistema de Movimientos de Elaboración / Producción

> **Estado**: Pendiente de implementación
> **Prioridad**: Media
> **Fecha de creación**: 2026-03-17
> **Estimación**: 3-5 días de trabajo

---

## 🎯 Objetivo

Permitir que una organización registre **movimientos de tipo "elaboración"** (producción) que consumen automáticamente materias primas del stock y acreditan el producto terminado resultante.

**Ejemplo concreto:**
- El usuario tiene en stock: 5 palos de madera, 5 cabezales de metal
- Registra: "Elaboración de 1 Martillo"
- Resultado automático:
  - Stock de "Palo de madera": 5 → 4 (salida de 1)
  - Stock de "Cabezal de metal": 5 → 4 (salida de 1)
  - Stock de "Martillo": 0 → 1 (entrada de 1)

---

## 👥 Usuario objetivo

Negocios que fabrican o ensamblan productos a partir de componentes o materias primas: panaderías, talleres, pequeñas manufacturas, distribuidoras con armado de kits, etc.

---

## 🗄️ Cambios en Base de Datos

### 1. Tabla nueva: `product_formulas`

Define la receta/fórmula de un producto terminado (Bill of Materials).

```sql
CREATE TABLE product_formulas (
  formula_id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  finished_product_id  UUID NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
  raw_material_id      UUID NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity_required    NUMERIC(10,4) NOT NULL CHECK (quantity_required > 0),
  organization_id      UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(finished_product_id, raw_material_id)
);

-- RLS
ALTER TABLE product_formulas ENABLE ROW LEVEL SECURITY;
```

### 2. Campo nuevo en `products`: `product_type`

```sql
ALTER TABLE products
ADD COLUMN product_type VARCHAR(20) NOT NULL DEFAULT 'standard'
CONSTRAINT products_product_type_check
  CHECK (product_type IN ('standard', 'raw_material', 'finished_good'));
```

- `standard`: producto normal (no participa en elaboración)
- `raw_material`: materia prima — puede ser consumida en elaboraciones
- `finished_good`: producto terminado — tiene fórmula BOM asociada

### 3. Supabase RPC: `create_production_movement`

Función PostgreSQL para garantizar atomicidad de toda la operación.

```sql
CREATE OR REPLACE FUNCTION create_production_movement(
  p_finished_product_id UUID,
  p_quantity_to_produce  NUMERIC,
  p_warehouse_id         UUID,
  p_organization_id      UUID,
  p_user_reference       TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_formula        RECORD;
  v_current_stock  NUMERIC;
  v_movement_date  TIMESTAMPTZ := now();
  v_result         JSONB;
BEGIN
  -- 1. Cargar fórmula
  -- 2. Para cada materia prima: verificar stock suficiente
  -- 3. Insertar movimientos de salida para cada materia prima
  -- 4. Insertar movimiento de entrada para el producto terminado
  -- 5. Retornar resumen
  -- (Si cualquier paso falla, toda la transacción hace rollback automático)
  RETURN v_result;
END;
$$;
```

> **Nota**: La implementación completa de la RPC debe escribirse al momento de desarrollar esta feature. El esquema arriba es ilustrativo.

---

## ⚙️ Backend

### Archivos a crear

#### `repositories/ProductFormulaRepository.js`
- Extiende `BaseRepository`
- Tabla: `product_formulas`
- Método adicional: `findByFinishedProduct(finishedProductId, organizationId)`

#### `services/ProductFormulaService.js`
- `getFormula(finishedProductId, organizationId)` — obtiene fórmula completa con nombres
- `createFormula(data, organizationId)` — crea/reemplaza fórmula
- `deleteFormulaItem(formulaId, organizationId)` — elimina un componente
- `validateFormulaStock(finishedProductId, quantity, warehouseId, organizationId)` — verifica si hay stock suficiente para producir N unidades

#### `controllers/ProductFormulaController.js`
- CRUD estándar de fórmulas

#### `routes/productFormulas.js`
- `GET  /api/product-formulas/:productId` — obtener fórmula de un producto
- `POST /api/product-formulas` — crear ítem de fórmula
- `PUT  /api/product-formulas/:formulaId` — actualizar cantidad
- `DELETE /api/product-formulas/:formulaId` — eliminar componente
- `GET  /api/product-formulas/:productId/validate?quantity=N&warehouseId=X` — validar stock pre-producción

### Archivos a modificar

#### `services/StockMovementService.js`
- Agregar método `createProductionMovement(data, organizationId)`:
  1. Cargar fórmula del producto terminado
  2. Validar que todas las materias primas tienen stock suficiente
  3. Llamar a Supabase RPC `create_production_movement` (garantiza atomicidad)
  4. Retornar resumen de movimientos creados
- Actualizar `validateMovementData()`: agregar `'production'` a `validTypes`

#### `routes/stockMovements.js`
- Agregar: `POST /api/stock-movements/production`

#### `config/container.js`
- Registrar `ProductFormulaRepository`, `ProductFormulaService`, `ProductFormulaController`

---

## 🖥️ Frontend

### Archivos a crear

#### `types/productFormula.ts`
```typescript
export interface ProductFormula {
  formula_id: string;
  finished_product_id: string;
  raw_material_id: string;
  quantity_required: number;
  organization_id: string;
  raw_material?: { product_id: string; name: string; unit?: string };
}

export interface ProductionMovementRequest {
  finished_product_id: string;
  quantity_to_produce: number;
  warehouse_id: string;
  reference?: string;
}

export interface ProductionPreview {
  finished_product: { product_id: string; name: string };
  quantity_to_produce: number;
  materials_to_consume: Array<{
    product_id: string;
    name: string;
    quantity_required: number;
    current_stock: number;
    sufficient: boolean;
  }>;
  can_produce: boolean;
}
```

#### `services/api/productFormulaService.ts`
- `getFormula(productId)` → `GET /api/product-formulas/:productId`
- `addFormulaItem(data)` → `POST /api/product-formulas`
- `updateFormulaItem(formulaId, data)` → `PUT /api/product-formulas/:formulaId`
- `deleteFormulaItem(formulaId)` → `DELETE /api/product-formulas/:formulaId`
- `validateProduction(productId, quantity, warehouseId)` → `GET /api/product-formulas/:productId/validate`
- `createProductionMovement(data)` → `POST /api/stock-movements/production`

#### `hooks/useProductFormula.ts`
- `useProductFormula(productId)` — query para obtener fórmula
- `useProductionPreview(productId, quantity, warehouseId)` — query para validar stock antes de confirmar
- `useSaveFormulaItem()` — mutation para crear/actualizar
- `useDeleteFormulaItem()` — mutation para eliminar
- `useCreateProductionMovement()` — mutation principal

#### `components/features/products/ProductFormulaEditor.tsx`
Componente embebido en el formulario de producto (solo visible cuando `product_type = 'finished_good'`):
- Lista de materias primas de la fórmula
- Agregar componente: selector de producto (filtrado por `product_type = 'raw_material'`) + cantidad
- Editar/eliminar componentes existentes

#### `components/features/stockMovements/ProductionMovementForm.tsx`
Formulario especial que aparece cuando se selecciona tipo "Elaboración":
1. Selector de producto terminado (filtrado por `product_type = 'finished_good'`)
2. Input de cantidad a producir
3. Selector de depósito
4. Preview automático (en tiempo real) mostrando:
   - Qué materias primas se van a consumir y en qué cantidad
   - Estado de stock actual vs. stock requerido (verde/rojo)
   - Mensaje de error si no hay stock suficiente
5. Botón de confirmar (deshabilitado si `can_produce = false`)

### Archivos a modificar

#### `pages/Dashboard/Products.tsx`
- Agregar campo `product_type` al formulario de creación/edición de producto
- Renderizar `<ProductFormulaEditor>` condicionalmente cuando `product_type = 'finished_good'`

#### `pages/Dashboard/StockMovements.tsx`
- Agregar `'production'` (Elaboración) al selector de tipo de movimiento
- Renderizar `<ProductionMovementForm>` cuando el tipo seleccionado es `'production'`

---

## ✅ Criterios de Aceptación

### Must Have

- [ ] Un producto puede marcarse como `raw_material` o `finished_good`
- [ ] Un producto `finished_good` puede tener una fórmula BOM con N materias primas y sus cantidades
- [ ] El movimiento de elaboración debita las materias primas y acredita el producto terminado en una sola operación atómica
- [ ] Si no hay stock suficiente de alguna materia prima, la operación falla con un mensaje claro indicando cuál/cuáles
- [ ] El usuario ve un preview de lo que se va a consumir antes de confirmar
- [ ] Todos los movimientos generados quedan registrados en `stock_movements` con `movement_type = 'production'` y el mismo `reference` para poder auditarlos juntos

### Should Have

- [ ] El campo `reference` del movimiento de elaboración agrupa todos los sub-movimientos (ej: `PROD-{timestamp}`)
- [ ] La validación de stock considera el depósito seleccionado
- [ ] Se puede producir más de 1 unidad en una sola elaboración (multiplicando las cantidades de la fórmula)

### Nice to Have

- [ ] Historial de producciones realizadas (filtrar movimientos por `movement_type = 'production'`)
- [ ] Alerta cuando la fórmula de un producto tiene materias primas sin stock

---

## 🚧 Riesgos y Decisiones Técnicas

| Riesgo | Mitigación |
|---|---|
| Inconsistencia de stock si falla a mitad de la transacción | Usar Supabase RPC (stored procedure PostgreSQL) para atomicidad completa |
| Producto marcado como `finished_good` sin fórmula definida | Validar en el backend antes de permitir un movimiento de elaboración |
| Ciclos en fórmulas (A requiere B, B requiere A) | Validar en el backend al guardar una fórmula que no existan ciclos |
| Nombres de `movement_type` en BD vs validación actual | Actualizar el CHECK constraint en `stock_movements` y el array `validTypes` en el service |

---

## 📋 Orden de Implementación Sugerido

1. **Migración de BD**: crear tabla `product_formulas`, agregar `product_type` a `products`, actualizar constraint de `movement_type`
2. **Supabase RPC**: escribir y testear la stored procedure
3. **Backend**: `ProductFormulaRepository` → `ProductFormulaService` → routes
4. **Backend**: modificar `StockMovementService` con `createProductionMovement`
5. **Frontend tipos y servicios**: `productFormula.ts` + `productFormulaService.ts`
6. **Frontend hooks**: `useProductFormula.ts`
7. **Frontend componentes**: `ProductFormulaEditor` → `ProductionMovementForm`
8. **Integrar en páginas existentes**: Products y StockMovements
9. **Testing**: verificar atomicidad, stock insuficiente, preview en tiempo real
