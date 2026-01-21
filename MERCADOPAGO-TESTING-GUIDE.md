# 🧪 Guía de Testing - Mercado Pago Integration

## 📋 Pre-requisitos Completados ✅

- ✅ Tablas de base de datos creadas
- ✅ Backend configurado con endpoints
- ✅ Frontend con componentes de pago
- ✅ Migración de Mercado Pago aplicada

## 🔐 Paso 1: Configurar Credenciales

### Backend (.env)

```bash
# En backend/.env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxxxxx-xxxxxx-xxxxxx

# Ya existentes (verificá que estén):
SUPABASE_URL=tu_supabase_url
SUPABASE_SERVICE_KEY=tu_service_key
PORT=4000
NODE_ENV=development
```

### Frontend (.env)

```bash
# En frontend/.env
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-bfcb63e5-4a9d-4015-8617-d5a334555e85

# Ya existentes (verificá que estén):
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=tu_supabase_url
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

### ¿Dónde obtener el Access Token?

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Seleccionar o crear una aplicación
3. Ir a **Credenciales** → **Credenciales de prueba**
4. Copiar el **Access Token** (empieza con `APP_USR-` o `TEST-`)

## 🚀 Paso 2: Reiniciar Servicios

```bash
# Terminal 1 - Backend
cd backend
node server.js

# Terminal 2 - Frontend (en otra terminal)
cd frontend
npm run dev
# o
bun run dev
```

## 🧪 Paso 3: Testing Manual del Flujo

### Test 1: Crear Suscripción Pendiente

1. **Abrir el frontend**: http://localhost:3000
2. **Login** con tu usuario
3. **Ir a Pricing**: http://localhost:3000/dashboard/pricing
4. **Click en "Actualizar Plan"** en cualquier plan pago

**Resultado esperado:**
- ✅ Se crea una suscripción en estado `trialing`
- ✅ Aparece el botón "Pagar Ahora"
- ✅ En backend logs: `Created pending subscription`

**Si falla:**
```bash
# Ver logs del backend para el error específico
tail -f /tmp/backend*.log | grep -i error
```

### Test 2: Abrir Modal de Pago

1. **Click en "Pagar Ahora"**

**Resultado esperado:**
- ✅ Se abre un modal con el form de Mercado Pago Bricks
- ✅ Se muestra el resumen del pago (plan, monto, moneda)
- ✅ En la consola del navegador: `Mercado Pago SDK loaded`

**Si el modal no se abre:**
- Abrí DevTools (F12) → Console
- Buscá errores relacionados con Mercado Pago
- Verificá que `VITE_MERCADOPAGO_PUBLIC_KEY` esté configurado

### Test 3: Ingresar Datos de Prueba

Usá estas **tarjetas de prueba de Mercado Pago**:

#### ✅ Tarjeta Aprobada
```
Número: 5031 7557 3453 0604
CVV: 123
Fecha: 11/25
Nombre: APRO
```

#### ❌ Tarjeta Rechazada (para probar manejo de errores)
```
Número: 5031 4332 1540 6351
CVV: 123
Fecha: 11/25
Nombre: OTRE
```

**Más tarjetas de prueba:**
https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/additional-content/test-cards

### Test 4: Completar Pago

1. **Rellenar el formulario** con datos de prueba
2. **Click en "Pagar"**

**Resultado esperado:**
- ✅ Se procesa el pago
- ✅ Redirección a `/payment/success` o `/payment/pending`
- ✅ Backend logs: `Payment processed` o `Webhook received`

## 🔍 Paso 4: Verificación en Base de Datos

Ejecutá este query en Supabase SQL Editor:

```sql
-- Ver suscripciones creadas
SELECT
  subscription_id,
  organization_id,
  plan_id,
  status,
  amount,
  currency,
  payment_gateway,
  provider_subscription_id,
  created_at
FROM subscriptions
ORDER BY created_at DESC
LIMIT 5;

-- Ver webhooks recibidos (si configuraste el webhook)
SELECT
  webhook_log_id,
  provider,
  event_type,
  processed,
  created_at
FROM webhook_logs
ORDER BY created_at DESC
LIMIT 10;
```

## 🪝 Paso 5: Configurar Webhook (Opcional pero Recomendado)

El webhook es necesario para activar automáticamente la suscripción cuando el pago se confirma.

### Opción A: Testing Local con ngrok

```bash
# Instalar ngrok (si no lo tenés)
brew install ngrok
# o descargarlo de: https://ngrok.com/

# Exponer puerto 4000
ngrok http 4000
```

Esto te dará una URL pública como: `https://abc123.ngrok.io`

### Configurar en Mercado Pago

1. Ir a: https://www.mercadopago.com.ar/developers/panel/app
2. Tu aplicación → **Webhooks**
3. Click en **Configurar notificaciones**
4. URL: `https://abc123.ngrok.io/api/webhooks/mercadopago`
5. Eventos: Seleccionar **Pagos** (payment)
6. Guardar

### Probar Webhook

```bash
# Ver logs en tiempo real
tail -f /tmp/backend*.log | grep -i webhook
```

Cuando realices un pago, deberías ver:
```
Webhook received: payment
Processing payment: [payment_id]
Subscription activated: [subscription_id]
```

## 📊 Debugging y Troubleshooting

### Ver todos los logs del backend
```bash
tail -f /tmp/backend*.log
```

### Ver solo errores
```bash
tail -f /tmp/backend*.log | grep -i error
```

### Ver logs de Mercado Pago
```bash
tail -f /tmp/backend*.log | grep -i mercado
```

### Limpiar consola logs de debug
Una vez que todo funcione, podés comentar los `console.log` en:
- `backend/repositories/BaseRepository.js` (líneas 76, 84, 88, 104)

## ✅ Checklist de Funcionalidad

- [ ] Usuario puede ver planes en `/dashboard/pricing`
- [ ] Click en "Actualizar Plan" crea suscripción pendiente
- [ ] Aparece botón "Pagar Ahora"
- [ ] Click en "Pagar Ahora" abre modal de pago
- [ ] Modal muestra el formulario de Mercado Pago Bricks
- [ ] Formulario acepta datos de tarjeta de prueba
- [ ] Pago se procesa correctamente
- [ ] Usuario es redirigido a página de éxito
- [ ] Suscripción aparece en base de datos
- [ ] Webhook activa la suscripción (si configurado)

## 🎯 Flujo Completo End-to-End

```
Usuario → Selecciona Plan → Crea Suscripción Pendiente
    ↓
Modal de Pago → Ingresa Datos → Click Pagar
    ↓
Mercado Pago Procesa → Responde con resultado
    ↓
Frontend → Redirección según resultado
    ↓
Webhook (async) → Backend recibe notificación
    ↓
Backend → Activa suscripción en DB
    ↓
Usuario → Ve suscripción activa en Dashboard
```

## 🚨 Errores Comunes

### Error: "Cannot read property 'error' of undefined"
**Solución**: Ya lo arreglamos. Reiniciá el backend.

### Error: "Mercado Pago SDK not loaded"
**Solución**: Verificá que `VITE_MERCADOPAGO_PUBLIC_KEY` esté en `frontend/.env` y reiniciá frontend.

### Error: "Invalid credentials"
**Solución**: Verificá que el Access Token sea correcto y esté en `backend/.env`.

### Error: "Table subscriptions does not exist"
**Solución**: Ejecutá las migraciones SQL que están en `backend/scripts/migrations/`.

### Modal no se abre
**Solución**: Abrí DevTools Console y buscá errores. Verificá que la Public Key sea correcta.

## 📚 Recursos

- **Mercado Pago Docs**: https://www.mercadopago.com.ar/developers/es/docs
- **Checkout Bricks**: https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks
- **Test Cards**: https://www.mercadopago.com.ar/developers/es/docs/checkout-bricks/additional-content/test-cards
- **Webhooks**: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks

## 🎉 ¿Todo Funcionando?

Una vez que el flujo completo funcione:
1. Probá con diferentes planes
2. Probá con tarjetas rechazadas para ver manejo de errores
3. Verificá que los webhooks actualicen la suscripción
4. Probá el flujo con diferentes usuarios/organizaciones

## 🚀 Próximos Pasos

- [ ] Configurar webhook en producción
- [ ] Mover a credenciales de producción
- [ ] Implementar cancelación de suscripciones
- [ ] Agregar historial de pagos
- [ ] Implementar renovación automática
- [ ] Agregar notificaciones por email
