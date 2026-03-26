# PRD-08: Betali Bot — Integración con Telegram

> **Estado**: Pendiente de implementación
> **Prioridad**: Alta
> **Fecha de creación**: 2026-03-24
> **Estimación**: 8-14 días de trabajo (MVP completo)
> **Tier**: Feature Premium (Plan Starter+)

---

## 🎯 Objetivo

Llevar Betali fuera del dashboard y al canal de comunicación que los dueños y encargados de negocios ya usan todo el día: **mensajería**. El bot de Telegram permite gestionar inventario, recibir alertas y crear órdenes de compra sin abrir la app, directamente desde el teléfono.

**Diferenciador competitivo**: ningún SaaS de inventario para PyMEs en LatAm ofrece un bot de Telegram con flujos operativos reales (no solo notificaciones push). La competencia tiene alertas por email — nosotros tenemos un asistente interactivo en el bolsillo del cliente.

---

## 👥 Usuario objetivo

- **Dueño de negocio / admin**: quiere saber el estado del inventario sin abrir la app, recibir alertas críticas y tomar decisiones rápido desde el celular.
- **Encargado de compras**: necesita crear órdenes de compra en movimiento, sin depender del desktop.
- **Encargado de depósito**: quiere registrar movimientos simples de stock (entrada/salida) sin acceder al sistema completo.

---

## 🧩 Arquitectura general

```
Telegram User
     ↓  (mensaje / comando)
Telegram Bot API (webhook)
     ↓
BetaliBot Service (módulo en backend Express)
     ├── Autenticación: token vinculado a org/usuario
     ├── CommandRouter: /stock, /comprar, /alerta, etc.
     ├── SessionManager: estado conversacional por chat_id
     └── BetaliAPI Client: llama a endpoints internos existentes
           ↓
    Supabase / lógica de negocio existente
```

**Librería**: `grammy` (TypeScript-native, más moderna y tipada que `node-telegram-bot-api`)

**Sin infra adicional**: el bot vive como un módulo dentro del backend Express existente, montado en `/webhook/telegram`. No requiere servidor separado.

---

## 🔗 Vinculación de cuenta (Auth)

### Flujo de vinculación inicial

Un usuario de Betali debe vincular su cuenta de Telegram una sola vez:

1. En la app web: **Configuración → Integraciones → Conectar Telegram**
2. Sistema genera un `link_token` de 30 minutos (UUID único, solo para esta vinculación inicial)
3. Se muestra botón "Abrir en Telegram" con deep link: `https://t.me/betali_bot?start=TOKEN`
4. Usuario hace click → se abre Telegram con el bot → el bot valida el token → vincula `telegram_chat_id` con su `user_id` en Betali
5. Confirmación en ambos lados (Telegram + web)

### Seguridad
- Token de un solo uso, expira en 15 minutos
- Cada `telegram_chat_id` puede estar vinculado a un solo usuario
- Un usuario puede desvincular desde la app web en cualquier momento
- El bot siempre verifica la vinculación antes de responder cualquier comando

### Multi-org
- Si el usuario pertenece a múltiples organizaciones, al iniciar el bot se le pide que elija con cuál trabajar
- Puede cambiar de org con `/org` en cualquier momento

---

## ⚙️ Funcionalidades — MVP (v1)

### 1. Consulta de stock (`/stock`)

El flujo más usado. Responde en segundos.

```
Usuario: /stock
Bot: ¿Qué querés consultar?
     [🔍 Buscar producto] [📋 Ver todos] [⚠️ Solo críticos]

Usuario: [⚠️ Solo críticos]
Bot: 📦 Productos con stock crítico — Organización: Panadería López

     🔴 Harina 000 — 3kg restantes (~2 días)
     🔴 Manteca — 0.5kg restantes (~1 día)
     🟡 Azúcar — 8kg restantes (~5 días)

     [🛒 Crear orden de compra] [🔄 Actualizar]
```

**También soporta búsqueda por texto libre**: `stock harina` → devuelve el producto directamente.

---

### 2. Creación de órdenes de compra (`/comprar`)

Flujo guiado con inline keyboards. No requiere abrir la app.

```
Usuario: /comprar
Bot: ¿Qué producto querés pedir?
     [Harina 000] [Manteca] [Azúcar] [🔍 Buscar otro]

Usuario: [Harina 000]
Bot: Stock actual: 3kg
     Última compra: 50kg — hace 18 días (Proveedor: La Molinera S.A.)
     ¿Cuántos kg querés pedir?

Usuario: 50
Bot: ✅ Confirmar orden:
     • Producto: Harina 000
     • Cantidad: 50 kg
     • Proveedor sugerido: La Molinera S.A.
     • Precio referencia: $12.500/kg → Total: $625.000

     [✅ Confirmar] [✏️ Cambiar cantidad] [🏪 Cambiar proveedor] [❌ Cancelar]

Usuario: [✅ Confirmar]
Bot: ✅ Orden de compra #OC-2847 creada.
     Ver en app: app.betali.com/ordenes/OC-2847
     ¿Querés crear otra orden? [Sí] [No]
```

---

### 3. Alertas proactivas (outbound)

El bot manda mensajes sin que el usuario lo inicie. Integrado con el sistema de alertas (PRD-05 cuando esté implementado, o stand-alone antes).

**Tipos de alertas:**

| Alerta | Cuándo | Prioridad visual |
|---|---|---|
| Stock crítico | Stock < umbral mínimo | 🔴 |
| Stock bajo | Stock < 20% del umbral | 🟡 |
| Producto agotado | Stock = 0 | 🚨 |
| OC recibida | Proveedor entregó | ✅ |
| OC vencida | OC sin confirmar > X días | ⚠️ |
| Resumen diario | Cada mañana (configurable) | 📊 |

**Ejemplo de alerta crítica:**
```
🚨 STOCK AGOTADO — Panadería López

Manteca se quedó sin stock.

Última compra: hace 23 días (La Sevillana — 10kg)
Consumo promedio: 0.5kg/día

[🛒 Crear OC ahora] [👀 Ver en app] [🔕 Silenciar 24h]
```

**El botón "Crear OC ahora" inicia directamente el flujo de compra**, sin comandos adicionales.

---

### 4. Registro rápido de movimientos (`/movimiento`)

Para el encargado de depósito que necesita registrar entradas/salidas sin acceder al sistema completo.

```
Usuario: /movimiento
Bot: ¿Qué tipo de movimiento?
     [📥 Entrada] [📤 Salida] [🔄 Ajuste]

Usuario: [📤 Salida]
Bot: ¿Qué producto?
     [Harina 000] [Manteca] [🔍 Buscar]

Usuario: [Harina 000]
Bot: Stock actual: 53kg. ¿Cuánto salió?

Usuario: 5
Bot: ✅ Confirmar: Salida de 5kg de Harina 000
     Nuevo stock: 48kg
     [✅ Confirmar] [❌ Cancelar]
```

---

### 5. Resumen diario (`/resumen`)

Enviado automáticamente cada mañana a la hora configurada por el usuario.

```
📊 Resumen de inventario — Lunes 24 de marzo
Organización: Panadería López

Estado general: ⚠️ 3 productos requieren atención

🔴 Críticos (ordenar hoy):
  • Manteca — 0.5kg (~1 día)
  • Levadura — 20g (~0 días)

🟡 Bajos (ordenar esta semana):
  • Azúcar — 8kg (~5 días)
  • Sal — 500g (~3 días)

✅ Sin novedades: 24 productos

[🛒 Crear órdenes de compra] [📋 Ver inventario completo]
```

---

## 🚀 Funcionalidades v2 — Ventaja competitiva real

### 6. Asistente IA conversacional (`/ia` o lenguaje natural)

Usando Claude Haiku, el bot puede responder preguntas en lenguaje completamente libre:

```
Usuario: ¿Qué debería comprar esta semana?
Bot: Basándome en tu consumo de los últimos 30 días:

     🛒 Te recomiendo pedir:
     • Manteca: 15kg (te dura ~10 días, está al 8% del stock)
     • Levadura: 500g (consumo subió 40% esta semana)
     • Azúcar: 20kg (próximo fin de semana hay alta demanda histórica)

     Total estimado: $487.000
     [Crear las 3 órdenes] [Ver detalle]

Usuario: ¿Por qué subió tanto el consumo de levadura?
Bot: En los últimos 7 días registraste 8 movimientos de salida de levadura
     vs. 5 en la semana anterior. El jueves hubo una salida de 200g en un
     solo movimiento — ¿fue una producción especial?
```

**Esto es lo que ningún competidor tiene**: un asistente que entiende el negocio del cliente y responde como un analista, no como un chatbot genérico.

---

### 7. Notificaciones grupales para equipos

El bot puede agregarse a un **grupo de Telegram del equipo** (ej: "Equipo Panadería López"). Las alertas se mandan al grupo y cualquier miembro con permisos puede responder:

```
[En grupo "Equipo Panadería López"]

🔴 ALERTA — Stock crítico: Harina 000 quedan 3kg

[Beatriz García]: Lo veo, mañana llamo al proveedor
[Bot]: ¿Querés que cree la OC para que Beatriz la confirme?
[Beatriz García]: Sí, 50kg
[Bot]: ✅ OC #2849 creada — pendiente de confirmación por admin
```

Esto convierte el bot en una **herramienta de coordinación de equipo**, no solo de consulta individual. Diferenciador enorme.

---

### 8. Reportes bajo demanda (`/reporte`)

Generación y envío de reportes como archivos directamente en Telegram:

```
Usuario: /reporte
Bot: ¿Qué reporte querés?
     [📊 Movimientos de hoy] [📅 Semana actual]
     [📆 Mes actual] [🔧 Personalizado]

Usuario: [📊 Movimientos de hoy]
Bot: [Enviando archivo...]
     📎 movimientos_20260324.pdf (12 KB)

     Resumen: 47 movimientos, 3 entradas, 44 salidas.
     Producto más movido: Harina 000 (8 movimientos)
```

Sin salir de Telegram. El PDF llega como archivo descargable.

---

### 9. Confirmación de recepciones de compra

Cuando llega una OC, el proveedor o el encargado puede confirmar la recepción directamente por Telegram:

```
Bot: 📦 OC #2847 enviada a La Molinera S.A. hace 3 días.
     ¿Llegó el pedido?

[✅ Llegó completo] [⚠️ Llegó parcial] [❌ No llegó]

Usuario: [⚠️ Llegó parcial]
Bot: ¿Cuántos kg de Harina 000 llegaron?

Usuario: 40
Bot: ✅ Recepción parcial registrada: 40kg de 50kg pedidos.
     Stock actualizado: 43kg.
     ¿Reclamás los 10kg faltantes? [Sí — notificar proveedor] [No]
```

---

### 10. Mini-dashboard en mensaje fijo (pinned message)

El bot puede mantener un **mensaje pinneado actualizado** en el chat grupal con el estado del inventario en tiempo real. Cada hora (o al registrar un movimiento) el bot edita ese mensaje:

```
📌 ESTADO DEL INVENTARIO — actualizado 09:15

🔴 Críticos: 2 productos
🟡 Bajos: 4 productos
✅ OK: 28 productos

Próxima OC pendiente: La Molinera S.A. — llegada estimada: mañana
Último movimiento: Beatriz — Salida 5kg Azúcar (hace 23 min)

[🔄 Actualizar ahora] [📋 Ver detalle]
```

Esto da al dueño visibilidad del negocio **sin abrir nada**.

---

## 🔒 Permisos y tiers

### Plan Starter
- Alertas básicas (stock crítico, agotado)
- Consulta de stock (`/stock`)
- Resumen diario básico
- 1 usuario de Telegram vinculado por org

### Plan Professional
- Todo lo de Starter
- Creación de OC desde Telegram (`/comprar`)
- Registro de movimientos (`/movimiento`)
- Notificaciones grupales (hasta 5 usuarios vinculados)
- Reportes bajo demanda (`/reporte`)

### Plan Enterprise
- Todo lo de Professional
- Asistente IA conversacional (`/ia`)
- Usuarios Telegram ilimitados
- Mini-dashboard pinneado grupal
- Confirmación de recepciones por Telegram
- Notificaciones personalizadas por rol

---

## 🗄️ Cambios en Base de Datos

### Tabla nueva: `telegram_connections`

```sql
CREATE TABLE telegram_connections (
  connection_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  organization_id  UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Telegram identity
  telegram_chat_id  BIGINT NOT NULL UNIQUE,
  telegram_username VARCHAR(100),
  telegram_name     VARCHAR(200),

  -- Vinculación
  link_token        VARCHAR(100),          -- token temporal para vincular (válido 30 min)
  link_token_expires TIMESTAMPTZ,
  linked_at         TIMESTAMPTZ,

  -- Preferencias
  daily_digest_enabled  BOOLEAN DEFAULT true,
  daily_digest_time     TIME DEFAULT '08:00',
  alerts_enabled        BOOLEAN DEFAULT true,
  alert_min_severity    VARCHAR(20) DEFAULT 'warning', -- 'info' | 'warning' | 'critical'
  quiet_hours_start     TIME,
  quiet_hours_end       TIME,

  -- Estado
  is_active         BOOLEAN DEFAULT true,
  last_interaction  TIMESTAMPTZ,

  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_telegram_connections_user ON telegram_connections(user_id);
CREATE INDEX idx_telegram_connections_chat ON telegram_connections(telegram_chat_id);
CREATE INDEX idx_telegram_connections_org ON telegram_connections(organization_id);
```

### Tabla nueva: `telegram_sessions`

Estado conversacional (flujos multi-paso como crear OC):

```sql
CREATE TABLE telegram_sessions (
  chat_id          BIGINT PRIMARY KEY,
  current_flow     VARCHAR(50),           -- 'create_order' | 'register_movement' | null
  flow_step        VARCHAR(50),           -- paso actual dentro del flujo
  flow_data        JSONB DEFAULT '{}',    -- datos acumulados del flujo
  expires_at       TIMESTAMPTZ NOT NULL,  -- sesión expira tras 10 min de inactividad
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
```

### Sin cambios en tablas existentes

El bot consume endpoints existentes de `products`, `stock_movements`, `orders`. No requiere modificar esquema de negocio.

---

## 🏗️ Implementación técnica

### Estructura de archivos

```
backend/
└── telegram/
    ├── bot.js                  ← inicialización grammy + registro de webhook
    ├── middleware/
    │   ├── auth.js             ← verifica vinculación por chat_id
    │   └── session.js          ← carga/guarda estado conversacional
    ├── commands/
    │   ├── stock.js            ← /stock
    │   ├── comprar.js          ← /comprar + flujo multi-paso
    │   ├── movimiento.js       ← /movimiento
    │   ├── reporte.js          ← /reporte
    │   ├── resumen.js          ← /resumen (también llamado por cron)
    │   └── start.js            ← /start con deep link de vinculación
    ├── notifications/
    │   ├── alertSender.js      ← envía alertas proactivas
    │   └── digestSender.js     ← envía resumen diario (llamado por cron)
    └── ai/
        └── assistant.js        ← integración Claude Haiku para consultas IA
```

### Webhook endpoint

```
POST /webhook/telegram/:secret_token
```

El `secret_token` es un hash del `BOT_TOKEN` — Telegram lo envía en el header para validar que la petición es legítima.

### Variables de entorno necesarias

```
TELEGRAM_BOT_TOKEN=         # obtenido de @BotFather
TELEGRAM_WEBHOOK_SECRET=    # generado al registrar el webhook
TELEGRAM_BOT_USERNAME=      # @betali_bot (para deep links)
```

---

## 📋 Tareas de implementación

### Fase 1 — Infraestructura + Auth (2 días)
- [ ] Instalar `grammy` en backend
- [ ] Crear tabla `telegram_connections` y `telegram_sessions`
- [ ] Endpoint de vinculación en web app (genera link_token)
- [ ] Flujo `/start TOKEN` en el bot (valida token, vincula cuenta)
- [ ] Middleware de auth por chat_id
- [ ] Registro del webhook en Telegram API

### Fase 2 — Comandos core (3 días)
- [ ] `/stock` con búsqueda y filtro por criticidad
- [ ] `/resumen` manual + cron de resumen diario
- [ ] Alertas proactivas básicas (stock crítico + agotado)
- [ ] `/comprar` con flujo completo de creación de OC
- [ ] Botones de acción directa en alertas (Crear OC desde alerta)

### Fase 3 — Funcionalidades avanzadas (4 días)
- [ ] `/movimiento` para registro de entradas/salidas
- [ ] `/reporte` con generación de PDF
- [ ] Notificaciones grupales (soporte para group chats)
- [ ] Confirmación de recepciones de OC
- [ ] Configuración de preferencias por usuario (`/config`)
- [ ] `/conteo` — conteo físico con pausa/retomar, resumen de diferencias y ajuste de stock
- [ ] Tabla `stock_counts` para auditoría de conteos (quién, cuándo, qué diferencias)

### Fase 4 — IA conversacional (2 días)
- [ ] Integración Claude Haiku para `/ia` y lenguaje natural
- [ ] Contexto de la org inyectado en cada consulta
- [ ] Rate limiting de consultas IA por plan

### Frontend — Configuración en app web (2 días)
- [ ] Página "Integraciones → Telegram" con botón de vinculación
- [ ] Lista de usuarios vinculados (admin puede revocar)
- [ ] Configuración de alertas (qué tipos, horario silencio)
- [ ] Historial de alertas enviadas por Telegram

---

## 🧪 Criterios de aceptación

- [ ] Un usuario puede vincular su cuenta en < 3 clicks desde la app web
- [ ] `/stock` responde en < 2 segundos con datos en tiempo real
- [ ] Una OC se puede crear completamente desde Telegram sin abrir la app
- [ ] Las alertas llegan en < 30 segundos desde que se registra el movimiento crítico
- [ ] El bot maneja correctamente mensajes inesperados (texto libre sin contexto)
- [ ] Si el backend está caído, el bot responde con mensaje de error amigable
- [ ] La sesión conversacional expira correctamente tras 10 minutos de inactividad
- [ ] Un usuario desvinculado no recibe ningún mensaje

---

## 💰 Modelo de costos

| Componente | Costo |
|---|---|
| Telegram Bot API | **$0 — completamente gratis** |
| Mensajes outbound | **$0** |
| Claude Haiku (consultas IA, v2) | ~$0.01-0.05/consulta |
| Infra adicional | $0 — corre en el backend existente |

El costo operativo es prácticamente nulo hasta escala alta. Las consultas IA son opcionales y solo en plan Enterprise.

---

### 11. Conteo físico y auditoría de stock (`/conteo`)

Permite hacer un inventario físico completo caminando por el depósito con el teléfono, sin necesidad de PC. El bot guía producto por producto y al final muestra las diferencias para que el usuario decida si ajusta.

**Flujo completo:**

```
Usuario: /conteo
Bot: Iniciando conteo de inventario.
     ¿Contás todo el stock o filtrás por categoría?
     [Todo] [Por categoría] [Solo los críticos]

Usuario: [Por categoría] → [Harinas]

Bot: Conteo en curso — Harinas (4 productos)
     Podés pausar en cualquier momento con /pausar

     📦 1/4 — Harina 000
     Stock en sistema: 48kg
     ¿Cuánto contás físicamente? (respondé con el número)

Usuario: 41

Bot: ⚠️ Diferencia detectada: -7kg
     Nota opcional: [Agregar] [Saltar]

     📦 2/4 — Harina leudante
     Stock en sistema: 22kg
     ¿Cuánto contás?

Usuario: 22

Bot: ✅ Coincide.

     [sigue con los 2 productos restantes...]

Bot: ✅ Conteo finalizado — Harinas

     RESUMEN:
     ✅ Sin diferencias: 2 productos (Harina leudante, Salvado grueso)
     ⚠️ Con diferencias: 2 productos
        • Harina 000: sistema 48kg → físico 41kg (−7kg)
        • Semolín: sistema 5kg → físico 3.5kg (−1.5kg)

     Diferencia total: −8.5kg
     ¿Qué hacemos con los ajustes?
     [Aplicar todos] [Revisar uno por uno] [Descartar]

Usuario: [Aplicar todos]
Bot: ✅ Ajustes aplicados. Stock actualizado.
     Ver reporte completo: app.betali.com/conteos/CT-0142
```

**Características clave:**
- El conteo se puede **pausar y retomar** (`/pausar` / `/retomar`) — si el encargado interrumpe el conteo de 2 horas, no pierde el progreso
- Soporte para **múltiples usuarios en paralelo** en distintas secciones del depósito
- El conteo genera un **registro de auditoría** en la app con quién lo hizo, cuándo, y qué diferencias se encontraron
- Las diferencias se pueden anotar con motivo (merma, robo, error de registro) antes de aplicar el ajuste

**Por qué esto es diferenciador**: los SaaS de inventario exigen entrar al sistema, ir a un módulo específico, crear un "inventario físico", imprimir una planilla o usar una interfaz web. Que esto se haga caminando por el depósito con el teléfono, producto por producto, y con posibilidad de pausar y retomar, es una UX que los competidores no tienen.

---

## 🔮 Expansiones futuras (fuera de scope v1-v2)

- **Integración con proveedores**: el bot manda la OC directamente al proveedor por Telegram si también tiene cuenta vinculada
- **Bot multi-negocio para contadores/distribuidores**: un usuario que gestiona múltiples organizaciones desde un solo bot
- **Comandos de voz**: registrar movimientos por audio (Telegram soporta mensajes de voz → transcripción → parseo)
- **Integración con catálogo de proveedores**: el bot busca el mejor precio entre tus proveedores habituales antes de crear la OC

---

## 🏁 Definición de éxito (90 días post-lanzamiento)

- **>40%** de los clientes Pro/Starter tienen Telegram vinculado
- **>60%** de las OCs de clientes con bot vinculado se crean desde Telegram
- **Reducción del churn**: clientes con bot activo churnan 30% menos (stickiness)
- **NPS**: clientes con bot califican la app 15 puntos más alto en promedio

---

**Owner**: Santiago
**Dependencias**: PRD-01 (Purchase Orders) para el flujo `/comprar` — pueden coexistir, el bot puede crear órdenes básicas antes de que PRD-01 esté completo
**Bloqueadores**: `TELEGRAM_BOT_TOKEN` — crear bot en @BotFather (5 minutos)
