# 🚨 Aplicar Migración de Stock Reservations - AHORA

## ⚡ Pasos Rápidos (5 minutos)

### **Opción 1: Supabase SQL Editor (Recomendado)**

1. **Abre el SQL Editor de Supabase:**
   ```
   https://gzqjhtzuongvbtdwvzaz.supabase.co/project/default/sql
   ```

2. **Crea una nueva query:**
   - Click en "+ New query"

3. **Copia TODO el contenido del archivo:**
   ```
   backend/scripts/migrations/006_create_stock_reservations_table.sql
   ```

4. **Pega en el editor SQL y haz click en "Run"**

5. **Verifica que salió bien:**
   - Deberías ver mensajes de éxito
   - No debe haber errores en rojo

---

### **Opción 2: Usar psql (Si tienes acceso directo)**

```bash
# Necesitas la conexión string de Supabase
# La puedes obtener de: Project Settings > Database > Connection string

psql "postgresql://postgres:[PASSWORD]@db.gzqjhtzuongvbtdwvzaz.supabase.co:5432/postgres" \
  -f backend/scripts/migrations/006_create_stock_reservations_table.sql
```

---

## 📋 Qué crea esta migración:

✅ **Tabla `stock_reservations`** con:
- Campos: reservation_id, organization_id, order_id, product_id, warehouse_id, quantity, status, etc.
- Constraints y validaciones
- Indexes de performance
- RLS policies para multi-tenant

✅ **Función `get_reserved_stock()`**
- Calcula el stock reservado total para un producto

✅ **Función `get_available_stock()`**
- Calcula: stock_físico - stock_reservado
- **Esta es la función crítica para prevenir overselling**

✅ **Triggers automáticos**
- Auto-actualización de timestamps
- Auto-set de released_at cuando cambia el status

---

## 🔍 Cómo verificar que funcionó:

Después de ejecutar la migración, corre este comando:

```bash
node backend/scripts/test-stock-reservations.js
```

Deberías ver:
```
✅ stock_reservations table exists
✅ get_available_stock() works!
✅ get_reserved_stock() works!
🎉 All systems operational!
```

---

## ⚠️ Si hay errores:

### Error: "relation already exists"
✅ **Buenas noticias!** La tabla ya existe. Continúa con los tests.

### Error: "permission denied"
❌ Necesitas usar el Service Role Key en lugar del Anon Key

### Error: "function does not exist"
⚠️  La migración no se ejecutó completamente. Vuelve a correrla.

---

## 📞 Si necesitas ayuda:

1. Copia el error completo que sale
2. Revisa que estás usando el SQL Editor correcto
3. Verifica que copiaste TODO el archivo (220 líneas)

---

**¿Listo para ejecutar?** Una vez que lo hagas, avísame y continuamos con los tests! 🚀
