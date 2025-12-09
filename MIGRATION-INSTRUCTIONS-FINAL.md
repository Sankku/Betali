# 🚨 INSTRUCCIONES FINALES - Aplicar Migración

## ✅ Confirmación: La tabla NO está creada aún

Los tests confirman que:
- ❌ Tabla `stock_reservations` NO existe
- ❌ Función `get_available_stock()` NO existe
- ❌ Función `get_reserved_stock()` NO existe

**Código de error**: `42P01` = "relation does not exist"

---

## 📋 PASO A PASO - Sigue esto EXACTAMENTE:

### **Paso 1: Abre el SQL Editor de Supabase**

Clic aquí 👉 https://supabase.com/dashboard/project/gzqjhtzuongvbtdwvzaz/sql/new

### **Paso 2: Abre el archivo de migración**

En VS Code o tu editor, abre este archivo:
```
/Users/santiagoalaniz/Dev/Personal/SaasRestaurant/backend/scripts/migrations/006_create_stock_reservations_table.sql
```

### **Paso 3: Copia TODO el contenido**

El archivo tiene **220 líneas**. Asegúrate de copiar DESDE la línea 1 HASTA la línea 220.

Debe empezar con:
```sql
-- ============================================================================
-- Migration 006: Stock Reservations System
```

Y terminar con:
```sql
-- ============================================================================
```

### **Paso 4: Pega en el SQL Editor de Supabase**

En la página que abriste en Paso 1:
1. Borra cualquier contenido que esté ahí
2. Pega TODO el contenido del archivo
3. Verifica que se vea completo

### **Paso 5: Ejecuta la migración**

1. Clic en el botón **"Run"** (esquina inferior derecha)
2. Espera a que termine (5-10 segundos)

### **Paso 6: Verifica el resultado**

Deberías ver mensajes como:
```
✅ CREATE TABLE
✅ CREATE INDEX
✅ CREATE FUNCTION
✅ CREATE TRIGGER
✅ ALTER TABLE
```

Si ves errores en ROJO, cópialos y compártelos conmigo.

### **Paso 7: Verifica que funcionó**

Corre este comando en tu terminal:
```bash
cd /Users/santiagoalaniz/Dev/Personal/SaasRestaurant/backend
node scripts/verify-table.js
```

Deberías ver:
```
✅ Table accessible!
✅ Function exists!
```

---

## ⚠️ Problemas Comunes

### "Ya ejecuté la migración pero sigue sin funcionar"

**Posibles causas**:

1. **No copiaste todo el archivo**
   - Verifica que copiaste las 220 líneas completas

2. **Ejecutaste en el schema equivocado**
   - Asegúrate de estar en el proyecto correcto (gzqjhtzuongvbtdwvzaz)

3. **Permisos RLS**
   - La migración incluye las políticas RLS, pero verifica que tu Service Key tenga permisos

4. **Cache del cliente Supabase**
   - Cierra y vuelve a abrir tu terminal
   - Reinicia el servidor backend si está corriendo

---

## 🔍 Verificación Manual (Opcional)

Si quieres verificar manualmente en Supabase:

1. Ve a: https://supabase.com/dashboard/project/gzqjhtzuongvbtdwvzaz/editor
2. En el panel izquierdo, busca la tabla `stock_reservations`
3. Debería aparecer en la lista de tablas

Para las funciones:
1. Ve a: https://supabase.com/dashboard/project/gzqjhtzuongvbtdwvzaz/database/functions
2. Deberías ver:
   - `get_available_stock`
   - `get_reserved_stock`
   - `update_stock_reservations_updated_at`
   - `auto_set_released_at`

---

## 📞 Si Necesitas Ayuda

Si después de seguir estos pasos sigues teniendo problemas:

1. **Copia el error COMPLETO** que sale en Supabase SQL Editor
2. **Toma un screenshot** de la pantalla del SQL Editor
3. **Comparte conmigo** y te ayudo a solucionarlo

---

## ✅ Una vez que funcione...

Cuando corras `node scripts/verify-table.js` y veas:
```
✅ Table accessible!
✅ Function exists!
```

**Avísame** y continuamos con:
- ✅ Tests de integración completos
- ✅ Verificación del endpoint de stock disponible
- ✅ Testing del flujo completo de órdenes
- ✅ Implementación de validación en frontend

---

**¿Listo para intentarlo de nuevo?** Sigue los pasos arriba y compárteme qué sale 🚀
