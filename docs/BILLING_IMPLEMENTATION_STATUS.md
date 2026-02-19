# Estado de Implementación del Sistema de Billing

## Resumen Ejecutivo

El sistema de suscripciones y pagos con MercadoPago está **funcionalmente completo** para un MVP. A continuación se detalla lo implementado y lo que falta para producción.

---

## ✅ Completado

### 1. Flujo de Suscripción

| Feature | Estado | Archivo Principal |
|---------|--------|-------------------|
| Selección de plan desde Pricing | ✅ | `Pricing.tsx` |
| Creación de suscripción en estado `pending_payment` | ✅ | `SubscriptionService.js` |
| Modal de pago con MercadoPago Bricks | ✅ | `MercadoPagoBricks.tsx` |
| Procesamiento de pago | ✅ | `MercadoPagoController.js` |
| Activación de suscripción post-pago | ✅ | `MercadoPagoService.js` |
| Páginas de éxito/fallo de pago | ✅ | `PaymentSuccess.tsx`, `PaymentFailure.tsx` |

### 2. Cambio de Plan

| Feature | Estado | Descripción |
|---------|--------|-------------|
| Upgrade inmediato (plan free → paid) | ✅ | Crea suscripción pending_payment |
| Cambio programado (paid → paid) | ✅ | Se aplica al final del período actual |
| Downgrade a free | ✅ | Se aplica al final del período |
| Cancelación de cambio programado | ✅ | Usuario puede cancelar antes de que aplique |

### 3. Webhooks de MercadoPago

| Feature | Estado | Endpoint |
|---------|--------|----------|
| Recepción de notificaciones | ✅ | `POST /api/webhooks/mercadopago` |
| Procesamiento de pagos aprobados | ✅ | Activa suscripción automáticamente |
| Procesamiento de pagos rechazados | ✅ | Cancela suscripción |
| Logging de webhooks | ✅ | Tabla `webhook_logs` |

### 4. Emails Transaccionales

| Email | Trigger | Servicio |
|-------|---------|----------|
| Pago exitoso | Post-pago aprobado | `EmailService.js` |
| Pago fallido | Post-pago rechazado | `EmailService.js` |
| Trial por expirar | 3 días antes | `SubscriptionCronService.js` |
| Suscripción por expirar | 7 días antes | `SubscriptionCronService.js` |
| Suscripción cancelada | Al expirar/cancelar | `SubscriptionCronService.js` |

### 5. Cron Jobs

| Tarea | Frecuencia Recomendada | Endpoint |
|-------|------------------------|----------|
| Trials expirando (reminder) | Diario | `/api/cron/subscriptions/trial-expiring` |
| Trials expirados (downgrade) | Diario | `/api/cron/subscriptions/trial-expired` |
| Suscripciones expirando | Diario | `/api/cron/subscriptions/subscriptions-expiring` |
| Suscripciones expiradas | Diario | `/api/cron/subscriptions/subscriptions-expired` |
| Cambios de plan programados | Diario | `/api/cron/subscriptions/plan-changes` |
| **Ejecutar todos** | Diario | `/api/cron/subscriptions/process` |

### 6. Base de Datos

| Tabla | Propósito |
|-------|-----------|
| `subscription_plans` | Definición de planes (free, starter, professional, enterprise) |
| `subscriptions` | Suscripciones activas por organización |
| `subscription_history` | Historial de cambios |
| `manual_payments` | Registro de todos los pagos |
| `webhook_logs` | Logs de webhooks de MercadoPago |

---

## ⚠️ Pendiente para Producción

### Alta Prioridad

| Tarea | Descripción | Esfuerzo |
|-------|-------------|----------|
| **Credenciales de producción MP** | Obtener Access Token y Public Key de producción | 30 min |
| **Configurar webhook en MP** | Registrar URL de webhook en panel de MercadoPago | 15 min |
| **Configurar Resend** | Crear cuenta, verificar dominio, obtener API key | 1-2 hrs |
| **Variables de entorno** | Configurar todas las env vars en el servidor | 30 min |
| **Configurar cron job** | Scheduler externo o crontab del sistema | 30 min |

### Media Prioridad

| Tarea | Descripción | Esfuerzo |
|-------|-------------|----------|
| **Verificación de webhook** | Validar firma de MercadoPago (x-signature) | 2 hrs |
| **Retry de webhooks fallidos** | Cola para reintentar webhooks que fallaron | 4 hrs |
| **Facturación/Recibos** | Generar PDFs de recibos de pago | 8 hrs |
| **Portal de billing para usuario** | Ver historial de pagos, descargar recibos | 4 hrs |

### Baja Prioridad (Post-MVP)

| Tarea | Descripción |
|-------|-------------|
| Pagos recurrentes automáticos | Cobro automático con tarjeta guardada |
| Cupones/Descuentos | Sistema de códigos promocionales |
| Múltiples métodos de pago | Guardar varios métodos por usuario |
| Prorratas | Cálculo proporcional en cambios de plan |
| Reembolsos | Proceso automatizado de devoluciones |

---

## 📁 Archivos Clave

### Backend

```
backend/
├── controllers/
│   └── MercadoPagoController.js    # Handlers HTTP para pagos
├── services/
│   ├── MercadoPagoService.js       # Lógica de MercadoPago
│   ├── SubscriptionService.js      # Lógica de suscripciones
│   ├── EmailService.js             # Envío de emails con Resend
│   └── SubscriptionCronService.js  # Tareas programadas
├── repositories/
│   ├── SubscriptionRepository.js   # Acceso a datos de suscripciones
│   └── SubscriptionPlanRepository.js
├── routes/
│   ├── mercadopago.js              # Rutas de pagos y webhooks
│   ├── subscriptions.js            # Rutas de suscripciones
│   └── cron.js                     # Rutas de cron jobs
└── scripts/
    └── run-subscription-cron.js    # Script para crontab
```

### Frontend

```
frontend/src/
├── pages/Dashboard/
│   ├── Pricing.tsx                 # Página de selección de planes
│   ├── PaymentSuccess.tsx          # Confirmación de pago exitoso
│   ├── PaymentFailure.tsx          # Página de pago fallido
│   └── SubscriptionManagement.tsx  # Gestión de suscripción
├── components/features/billing/
│   ├── MercadoPagoBricks.tsx       # Componente de pago MP
│   └── PricingCard.tsx             # Tarjeta de plan
└── services/api/
    ├── mercadoPagoService.ts       # API client para pagos
    └── subscriptionService.ts      # API client para suscripciones
```

---

## 🔧 Variables de Entorno Requeridas

### Backend (.env)

```bash
# MercadoPago (PRODUCCIÓN)
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx

# URLs
FRONTEND_URL=https://tu-app.com
BACKEND_URL=https://api.tu-app.com

# Email (Resend)
RESEND_API_KEY=re_xxx
EMAIL_FROM=Betali <noreply@tu-dominio.com>

# Cron
CRON_SECRET=tu-secreto-seguro-32-chars

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=xxx
```

### Frontend (.env)

```bash
VITE_MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
VITE_API_URL=https://api.tu-app.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxx
```

---

## 🚀 Checklist de Deploy

### Pre-Deploy

- [ ] Obtener credenciales de producción de MercadoPago
- [ ] Crear cuenta en Resend y verificar dominio
- [ ] Configurar todas las variables de entorno
- [ ] Probar flujo completo en sandbox

### Deploy

- [ ] Desplegar backend con nuevas env vars
- [ ] Desplegar frontend con nueva PUBLIC_KEY
- [ ] Configurar webhook en MercadoPago apuntando a producción
- [ ] Configurar cron job (scheduler o crontab)

### Post-Deploy

- [ ] Hacer un pago de prueba real (puede ser $1 ARS)
- [ ] Verificar que llega el webhook
- [ ] Verificar que llega el email
- [ ] Verificar que la suscripción se activa
- [ ] Monitorear logs las primeras 24-48 horas

---

## 📊 Flujo de Estados de Suscripción

```
                    ┌─────────────────┐
                    │   (No existe)   │
                    └────────┬────────┘
                             │ Usuario selecciona plan
                             ▼
                    ┌─────────────────┐
                    │ pending_payment │◄────────────────┐
                    └────────┬────────┘                 │
                             │ Pago aprobado            │ Pago rechazado
                             ▼                          │ (puede reintentar)
              ┌──────────────┴──────────────┐           │
              │                             │           │
              ▼                             ▼           │
     ┌─────────────┐              ┌─────────────┐      │
     │  trialing   │              │   active    │      │
     └──────┬──────┘              └──────┬──────┘      │
            │ Trial expira               │             │
            │ (sin pago)                 │ Período     │
            ▼                            │ expira      │
     ┌─────────────┐                     │             │
     │   active    │◄────────────────────┘             │
     │ (plan free) │                                   │
     └─────────────┘                                   │
                                                       │
     ┌─────────────┐                                   │
     │  canceled   │◄──────────────────────────────────┘
     └─────────────┘
```

---

## 📞 Soporte

- **MercadoPago**: [Documentación](https://www.mercadopago.com.ar/developers/es/docs) | [Soporte](https://www.mercadopago.com.ar/ayuda)
- **Resend**: [Documentación](https://resend.com/docs) | [Soporte](https://resend.com/support)
- **Supabase**: [Documentación](https://supabase.com/docs)

---

*Última actualización: Enero 2026*
