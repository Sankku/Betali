# Aplicar Migration 008: Order Status Triggers

## 📋 Resumen

Esta migración agrega triggers automáticos para manejar las reservas de stock cuando cambia el estado de las órdenes.

## 🎯 Qué hace

El trigger `trg_order_status_change` maneja automáticamente:

1. **pending → processing**: Crea reservas de stock automáticamente
2. **processing → shipped**: Deduce el stock físico y marca las reservas como fulfilled
3. **processing → cancelled**: Libera las reservas de stock
4. **shipped → cancelled**: Restaura el stock físico

## 🚀 Cómo Aplicar

### Opción 1: Supabase Dashboard (Recomendado)

1. Ve a tu Supabase Dashboard: https://gzqjhtzuongvbtdwvzaz.supabase.co

2. En el menú lateral, haz clic en **SQL Editor**

3. Haz clic en **New Query**

4. Copia y pega TODO el contenido del archivo:
   ```
   backend/scripts/migrations/008_add_order_status_triggers.sql
   ```

5. Haz clic en **Run** (o presiona Ctrl+Enter)

6. Verifica que se ejecutó correctamente (deberías ver "Success" sin errores)

### Opción 2: psql (Si tienes acceso directo)

```bash
# Obtén tu connection string de Supabase Dashboard > Project Settings > Database
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres" \
  < backend/scripts/migrations/008_add_order_status_triggers.sql
```

## ✅ Verificación

Después de aplicar la migración, verifica que funciona:

```bash
# Corre los tests de integración
cd backend
bun test tests/integration/stock-reservation.test.js
```

Deberías ver:
- ✅ Test 1: PASSED
- ✅ Test 2: PASSED (antes fallaba!)
- ✅ Test 3: PASSED (antes fallaba!)
- ✅ Test 4: PASSED
- ✅ Test 5: PASSED

## 🔍 Qué se Crea

### Funciones:
- `get_order_organization_id(p_order_id UUID)` - Obtiene el organization_id de una orden
- `handle_order_status_change()` - Trigger function que maneja los cambios de estado

### Triggers:
- `trg_order_status_change` - Se ejecuta en la tabla `orders` cuando cambia el `status`

## 📝 Notas

- El trigger solo se ejecuta cuando el estado realmente cambia (`OLD.status IS DISTINCT FROM NEW.status`)
- Usa `ON CONFLICT DO NOTHING` para evitar duplicados en reservas
- Todas las operaciones están transaccionadas automáticamente por PostgreSQL
- El trigger respeta el multi-tenancy usando organization_id

## 🐛 Troubleshooting

Si los tests siguen fallando después de aplicar la migración:

1. Verifica que la migración se aplicó correctamente:
   ```sql
   -- En el SQL Editor de Supabase
   SELECT tgname, tgtype
   FROM pg_trigger
   WHERE tgrelid = 'orders'::regclass;
   ```

   Deberías ver `trg_order_status_change` en los resultados.

2. Verifica que las funciones existen:
   ```sql
   SELECT proname
   FROM pg_proc
   WHERE proname IN ('get_order_organization_id', 'handle_order_status_change');
   ```

3. Revisa los logs de Supabase si hay errores en tiempo de ejecución.
