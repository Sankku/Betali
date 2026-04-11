# PRD: Bulk Product Creation (Manual Grid Entry)

> **Product**: Betali Inventory Management SaaS  
> **Feature**: Bulk Product Creation — Manual Grid  
> **Priority**: P1 (High — UX improvement)  
> **Status**: 🟡 Planned  
> **Author**: Santiago Alaniz  
> **Created**: 2026-04-10

---

## 📋 Executive Summary

Agregar una acción "Crear productos en masa" en la página de Productos que abre un modal con una grilla editable donde el usuario puede tipear múltiples productos a mano, sin necesidad de preparar un CSV. La experiencia visual y el flujo son idénticos al modal de importación CSV existente (`ProductImportModal`), reutilizando directamente el step `preview` y la lógica de validación/submit ya implementados.

**Clave técnica**: El modal de importación CSV ya tiene un grid de edición en línea completamente funcional (step `preview`). Para bulk creation manual, se salta el step `upload` y se inicia directo en el grid con N filas vacías.

---

## 🎯 Problem Statement

### Estado actual
- ✅ Los usuarios pueden crear productos uno a la vez mediante un form
- ✅ Los usuarios pueden importar N productos desde un CSV
- ❌ **No hay forma de crear múltiples productos a mano sin preparar un archivo**

### Pain Points
1. **Fricción para carga inicial**: Un negocio que empieza a cargar su catálogo tiene que elegir entre tipear producto por producto (lento) o preparar un CSV (técnico/engorroso)
2. **Correcciones en lote**: Si el usuario quiere agregar 10 productos nuevos parecidos, el form individual obliga a repetir todos los campos
3. **Curva de adopción**: Nuevos usuarios abandonan en la carga inicial por falta de una opción intermedia entre "uno" y "CSV"

---

## 🎯 Goals & Success Metrics

### Goals
- Reducir el tiempo de carga inicial de catálogo para nuevos usuarios
- Ofrecer una alternativa de entrada manual rápida sin requerir conocimientos de CSV
- Reutilizar al máximo el código existente (cero duplicación de lógica de negocio)

### Success Metrics
- **Adopción**: 30% de nuevas organizaciones usan bulk creation en su primera semana
- **Velocidad**: El usuario puede cargar 10 productos en < 3 minutos
- **Errores**: Tasa de error en submit < 5% gracias a validación inline en tiempo real

---

## 👥 Target Users

1. **Nuevo usuario onboarding**: Quiere cargar su catálogo inicial rápido sin preparar archivos
2. **Operador de inventario**: Recibe una lista verbal/papel de productos y los carga de a varios
3. **Admin de org**: Necesita duplicar o crear variantes de productos existentes en lote

---

## 📋 Functional Requirements

### FR-01: Acción en Products page
- Agregar un botón/acción "Agregar en masa" junto a la acción existente "Importar CSV" en `Products.tsx`
- El botón abre `ProductBulkCreateModal` (nuevo componente)
- Ícono sugerido: `TableIcon` o `PlusSquare` de lucide-react

### FR-02: Modal con grid de entrada manual
- El modal se abre directamente en el step `grid` (equivalente al step `preview` del import CSV)
- El estado inicial tiene **3 filas vacías** (configurable, mínimo 1)
- El usuario puede:
  - Editar cualquier celda (mismo UX de inputs/selects inline del preview existente)
  - Agregar una fila al final (botón "+ Agregar fila")
  - Eliminar una fila (icono trash en cada fila, solo visible si hay > 1 fila)
  - Duplicar una fila (icono copy, copia los valores hacia una nueva fila abajo)

### FR-03: Validación en tiempo real
- Reutilizar `validateRow()` de `product-import-modal.tsx` sin modificarla
- Cada vez que el usuario modifica una celda, la fila se revalida inmediatamente
- El contador de "válidas / con errores" en el header del modal se actualiza en tiempo real
- Mismas reglas de negocio: campos requeridos, unidades válidas, tipos de producto, precio positivo, fecha

### FR-04: Submit
- Botón "Crear productos (N)" habilitado solo cuando hay al menos 1 fila válida
- Las filas con errores se **ignoran en el submit** (no bloquean), igual que en el CSV import
- Reutilizar `useProductTypeImport` mutation y `BulkImportRow` types existentes
- Después del submit, mostrar el step `result` idéntico al del CSV import

### FR-05: Step result
- Reutilizar el step `result` de `ProductImportModal` sin modificaciones (creados / actualizados / fallidos / stock omitido)
- Botón "Cerrar" al finalizar

### FR-06: Fila vacía por defecto
- Una fila vacía debe tener valores por defecto sensatos:
  - `unit`: `'unidad'`
  - `product_type`: `'standard'`
  - `initial_stock`: `''` (vacío, opcional)
  - `warehouse_name`: `''` (org default)
  - Resto: vacío

---

## 🏗️ Technical Design

### Estrategia de implementación: **Refactor + Extend** (no fork)

En lugar de duplicar el componente CSV, se refactoriza `ProductImportModal` para que sea agnóstico al origen de los datos, y se expone el step `preview/grid` como modo standalone.

#### Opción A (recomendada): Shared grid component

```
components/features/products/
  ProductImportModal.tsx         ← existente, sin cambios  
  ProductBulkCreateModal.tsx     ← nuevo, thin wrapper
  _ProductBulkGrid.tsx           ← nuevo, extraer la tabla del step preview
```

`_ProductBulkGrid` extrae la lógica de la tabla del step `preview` de `ProductImportModal`:
- Props: `rows`, `onRowChange`, `onAddRow`, `onDeleteRow`, `onDuplicateRow`, `warehouseNames`
- Pure presentational + handlers
- Importado tanto en `ProductImportModal` (para el preview del CSV) como en `ProductBulkCreateModal`

#### Opción B (más simple, aceptable): Componente independiente con funciones compartidas

Crear `ProductBulkCreateModal.tsx` que importa directamente `validateRow`, `VALID_UNITS`, `VALID_PRODUCT_TYPES`, y `fieldNamesToSpanish` desde `product-import-modal.tsx` (o moverlos a un módulo compartido `_productValidation.ts`).

> **Decisión**: Elegir en implementación según cuánto quiere refactorizarse el import modal. Si no se toca, usar Opción B.

#### Shared utilities a extraer (si se hace Opción A o B con módulo compartido)

```typescript
// frontend/src/components/features/products/_productValidation.ts
export const REQUIRED_HEADERS = [...]
export const VALID_UNITS = [...]
export const VALID_PRODUCT_TYPES = [...]
export const MAX_ROWS = 500
export function validateRow(...): ParsedRow
export function translateField(field: string): string
```

### Estado del modal

```typescript
interface BulkCreateState {
  rows: ParsedRow[];         // siempre comienza con 3 filas vacías
  step: 'grid' | 'result';
  importResult: BulkImportResult | null;
}
```

### Fila vacía factory

```typescript
function emptyRow(rowNum: number): ParsedRow {
  return validateRow(
    { unit: 'unidad', product_type: 'standard' } as Record<string, string>,
    rowNum,
    warehouseNames
  );
}
```

### Handlers adicionales vs CSV import

```typescript
// Agregar fila
const handleAddRow = () => {
  setParsedRows(prev => [...prev, emptyRow(prev.length + 1)]);
};

// Eliminar fila
const handleDeleteRow = (index: number) => {
  setParsedRows(prev => prev.filter((_, i) => i !== index).map((r, i) => ({ ...r, rowNum: i + 1 })));
};

// Duplicar fila
const handleDuplicateRow = (index: number) => {
  setParsedRows(prev => {
    const clone = { ...prev[index], rowNum: prev.length + 1 };
    return [...prev, clone];
  });
};
```

---

## 🎨 UX Design Notes

### Diferencias visuales vs CSV import modal

| Elemento | CSV Import | Bulk Create Manual |
|---|---|---|
| Header del modal | "Importar productos desde CSV" | "Crear productos en masa" |
| Ícono header | `FileText` | `TableIcon` / `Rows` |
| Step inicial | Upload (drag & drop) | Grid con 3 filas vacías |
| Botón volver | Vuelve al upload | No aplica (cerrar) |
| Columna `#` | Fijo (nro de fila del CSV) | Fijo (order de entrada) |
| Acciones por fila | Solo editar | Editar + Eliminar + Duplicar |
| Footer | "Importar filas válidas (N)" | "Crear productos (N)" |

### Hint text en grid vacío

Cuando todas las filas están vacías (sin datos ingresados), mostrar un texto subtle en la primera fila tipo placeholder "Completá los datos del producto" para orientar al usuario.

### Keyboard UX (nice to have, no blocker)
- `Tab` navega entre celdas de izquierda a derecha
- Al llegar al final de la última fila con `Tab`, agrega automáticamente una nueva fila

---

## 🔗 Integration Points

| Sistema | Interacción |
|---|---|
| `useProductTypeImport` hook | Submit — idéntico al CSV import |
| `BulkImportRow` type | Tipo de dato enviado al backend |
| `useWarehouses` hook | Carga la lista de depósitos para el select |
| Products page (`Products.tsx`) | Punto de entrada — nuevo botón de acción |
| `productTypesService` | Sin cambios — reutilización directa |

---

## 🚫 Out of Scope

- Autocompletado de productos existentes (para versión futura)
- Importar desde clipboard/paste (para versión futura)
- Guardado de draft / sesión persistente
- Ordenar/reordenar filas con drag & drop
- Filtrar o buscar dentro del grid

---

## 📊 Implementation Plan

### Fase 1: Extractar utilidades compartidas
- Mover `validateRow`, `VALID_UNITS`, `VALID_PRODUCT_TYPES`, `translateField` a `_productValidation.ts`
- Actualizar `ProductImportModal` para importar desde ahí (sin cambios de comportamiento)

### Fase 2: Crear `ProductBulkCreateModal`
- Implementar el modal con state management propio
- Reutilizar la tabla del step `preview` (copy con adaptaciones mínimas o extracción a `_ProductBulkGrid`)
- Handlers de agregar/eliminar/duplicar filas
- Header y footer adaptados

### Fase 3: Integrar en Products page
- Agregar botón "Agregar en masa" en `Products.tsx`
- Conectar state de apertura del modal

### Fase 4: QA
- Crear al menos 1 producto válido, verificar que aparece en la lista
- Verificar validación inline (errores en rojo, OK en verde)
- Verificar que filas inválidas se ignoran y válidas se crean
- Verificar step result con contadores correctos
- Verificar que no rompe el flujo de CSV import existente

---

## ✅ Acceptance Criteria

- [ ] Existe un botón "Agregar en masa" en Products page junto al de "Importar CSV"
- [ ] El modal abre con 3 filas vacías editables
- [ ] El usuario puede agregar filas con el botón "+ Agregar fila"
- [ ] El usuario puede eliminar una fila (no la última)
- [ ] El usuario puede duplicar una fila
- [ ] La validación se muestra en tiempo real al editar cualquier celda
- [ ] El botón "Crear" muestra el count de filas válidas y se deshabilita si son 0
- [ ] El submit envía solo las filas válidas
- [ ] El step result muestra creados / fallidos / stock omitido correctamente
- [ ] El flujo de CSV import existente no se modifica ni rompe
- [ ] TypeScript compila sin errores (`npx tsc --noEmit`)
