# 🧪 Guía de Pruebas de Aceptación de Usuario
## Betali SaaS - Inventario Multi-tenant

### 🎯 **ESTADO ACTUAL**
- ✅ **Backend**: http://localhost:4000 (API completamente funcional)
- ✅ **Frontend**: http://localhost:3002 (Interfaz de usuario)
- ✅ **Base de Datos**: Supabase conectada y configurada
- ✅ **Autenticación**: Sistema multi-tenant funcionando

---

## 🔧 **FASE 1: Registro y Autenticación**

### Test 1.1: Crear Nueva Organización
1. **Abre**: http://localhost:3002
2. **Busca**: El formulario de registro/signup
3. **Completa** los campos:
   - **Email**: `tuempresa@ejemplo.com`
   - **Nombre**: `Tu Nombre`
   - **Contraseña**: `MiPassword123!`
   - **Nombre de Organización**: `Mi Restaurante Test`
4. **Haz clic**: "Crear cuenta" o "Registrarse"

**✅ Resultado esperado**: 
- Deberías ser redirigido al dashboard
- Deberías ver el nombre de tu organización en la interfaz
- Deberías estar autenticado

---

## 📦 **FASE 2: Gestión de Inventario**

### Test 2.1: Crear Almacén
1. **Ve a**: Sección de "Almacenes" o "Warehouses"
2. **Haz clic**: "Nuevo Almacén" o "+"
3. **Completa**:
   - **Nombre**: `Cocina Principal`
   - **Ubicación**: `Planta Baja`
4. **Guarda** el almacén

### Test 2.2: Crear Productos
1. **Ve a**: Sección de "Productos" o "Products"
2. **Haz clic**: "Nuevo Producto"
3. **Crea estos productos**:

   **Producto 1:**
   - **Nombre**: `Arroz Basmati`
   - **Precio**: `25.50`
   - **Lote**: `ARR001`
   - **País de Origen**: `India`
   - **Fecha de Vencimiento**: `2025-12-31`
   - **Descripción**: `Arroz premium para platos especiales`

   **Producto 2:**
   - **Nombre**: `Aceite de Oliva Extra Virgen`
   - **Precio**: `45.00`
   - **Lote**: `AOV001`
   - **País de Origen**: `España`
   - **Fecha de Vencimiento**: `2026-06-30`

### Test 2.3: Movimientos de Stock
1. **Ve a**: "Movimientos de Stock" o "Stock Movements"
2. **Haz clic**: "Nuevo Movimiento"
3. **Realiza una entrada**:
   - **Producto**: `Arroz Basmati`
   - **Almacén**: `Cocina Principal`
   - **Tipo**: `Entrada`
   - **Cantidad**: `50`
   - **Referencia**: `Compra inicial`

---

## 💰 **FASE 3: Sistema de Precios (NUEVOS ENDPOINTS)**

### Test 3.1: Configurar Tasa de Impuestos
1. **Ve a**: "Configuración" > "Impuestos" o "Tax Rates"
2. **Haz clic**: "Nueva Tasa de Impuesto"
3. **Completa**:
   - **Nombre**: `IVA General`
   - **Tasa**: `0.21` (para 21%)
   - **Descripción**: `Impuesto al valor agregado general`
   - **Activo**: ✅

### Test 3.2: Crear Reglas de Descuento
1. **Ve a**: "Configuración" > "Descuentos" o "Discount Rules"
2. **Haz clic**: "Nueva Regla de Descuento"
3. **Crea estos descuentos**:

   **Descuento 1 - Porcentaje:**
   - **Nombre**: `Descuento Cliente VIP`
   - **Tipo**: `Porcentaje`
   - **Valor**: `0.15` (15%)
   - **Código de Cupón**: `VIP15`
   - **Monto Mínimo**: `100.00`
   - **Activo**: ✅

   **Descuento 2 - Monto Fijo:**
   - **Nombre**: `Descuento Primera Compra`
   - **Tipo**: `Monto Fijo`
   - **Valor**: `10.00`
   - **Código de Cupón**: `BIENVENIDO10`
   - **Activo**: ✅

---

## 🛒 **FASE 4: Proceso de Pedidos (si está disponible)**

### Test 4.1: Crear Pedido
1. **Ve a**: "Pedidos" o "Orders"
2. **Crear pedido nuevo**:
   - **Productos**: Agregar `Arroz Basmati` (cantidad: 2)
   - **Aplicar descuento**: `VIP15`
   - **Verificar cálculos**: Subtotal, descuento, impuestos, total

---

## 🔍 **FASE 5: Reportes y Consultas**

### Test 5.1: Verificar Inventario
1. **Ve a**: Dashboard o "Resumen"
2. **Verifica**:
   - ✅ Total de productos creados
   - ✅ Stock actual por almacén
   - ✅ Movimientos recientes

### Test 5.2: Consultar APIs Directamente (Opcional - Para Developers)
```bash
# Listar productos
curl -H "Authorization: Bearer [tu-token]" \
     -H "x-organization-id: [tu-org-id]" \
     http://localhost:4000/api/products

# Listar impuestos
curl -H "Authorization: Bearer [tu-token]" \
     -H "x-organization-id: [tu-org-id]" \
     http://localhost:4000/api/tax-rates

# Listar descuentos
curl -H "Authorization: Bearer [tu-token]" \
     -H "x-organization-id: [tu-org-id]" \
     http://localhost:4000/api/discount-rules
```

---

## 🐛 **QUÉ REPORTAR**

### ✅ **Funciona Correctamente**
- [ ] Registro de organización
- [ ] Autenticación y navegación
- [ ] Creación de almacenes
- [ ] Creación de productos
- [ ] Movimientos de stock
- [ ] Configuración de impuestos
- [ ] Creación de descuentos
- [ ] Cálculos de precios

### ❌ **Problemas Encontrados**
Para cada problema, reporta:
1. **Paso específico** donde ocurrió
2. **Mensaje de error** (si hay)
3. **Comportamiento esperado** vs **comportamiento real**
4. **Screenshot** (si es posible)

### 🎯 **Aspectos Críticos a Probar**
1. **Aislamiento Multi-tenant**: Crea una segunda organización y verifica que no veas datos de la primera
2. **Validaciones**: Intenta crear productos sin nombre, con precios negativos, etc.
3. **Cálculos**: Verifica que los descuentos e impuestos se calculen correctamente
4. **Navegación**: Todas las secciones deberían ser accesibles
5. **Persistencia**: Los datos deberían guardarse correctamente al recargar la página

---

## 📞 **SIGUIENTE PASO**
¡Ejecuta estas pruebas y comparte tu feedback! Esto nos ayudará a:
1. Identificar bugs de UX/UI
2. Verificar integración frontend-backend
3. Confirmar que el API está siendo usada correctamente
4. Preparar el lanzamiento beta

¿Estás listo para comenzar? 🚀