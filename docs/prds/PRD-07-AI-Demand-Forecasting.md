# PRD-07: AI Demand Forecasting & Smart Reorder Suggestions

> **Estado**: Pendiente de implementación
> **Prioridad**: Media-Alta
> **Fecha de creación**: 2026-03-19
> **Estimación**: 5-8 días de trabajo
> **Tier**: Feature Premium (Plan Pro)

---

## 🎯 Objetivo

Agregar inteligencia predictiva al inventario: en lugar de alertar reactivamente cuando el stock ya es bajo, el sistema **predice cuándo se agotará cada producto** y sugiere cantidades óptimas de reorden, con justificación en lenguaje natural generada por IA.

**Diferenciador competitivo**: la mayoría de SaaS de inventario solo tiene alertas estáticas basadas en umbrales fijos. Este feature usa el historial real de movimientos de cada organización para dar recomendaciones contextuales e inteligentes.

---

## 👥 Usuario objetivo

- **Dueños de negocio / admins**: quieren saber qué comprar antes de quedarse sin stock, sin tener que revisar cada producto manualmente.
- **Encargados de compras**: necesitan una lista priorizada de qué pedir y cuánto.

---

## 🧠 Lógica de IA

### Modelo de datos que se envía a Claude

Por cada organización, se analiza el historial de `stock_movements` de los últimos 60-90 días. Para cada producto activo se calcula:

```
- Nombre del producto
- Stock actual
- Unidad de medida
- Consumo promedio diario (últimos 30d)
- Consumo promedio diario (últimos 7d) — detecta cambios recientes de tendencia
- Días de stock restante estimados = stock_actual / consumo_promedio_diario
- Umbral mínimo configurado (si existe)
- Fecha de última entrada de stock
```

### Prompt structure (simplificado)

```
Sistema: Eres un asistente de inventario. Analiza los siguientes productos y sus patrones
de consumo. Devuelve un JSON con recomendaciones de reorden priorizadas.

Contexto de la organización: {nombre, tipo de negocio si existe}

Productos:
[{ nombre, stock_actual, unidad, consumo_7d, consumo_30d, dias_restantes, ... }]

Responde con:
{
  "recomendaciones": [{
    "producto_id": "...",
    "prioridad": "critica|alta|media",
    "dias_restantes_estimados": N,
    "cantidad_sugerida": N,
    "razon": "texto breve en español explicando el porqué"
  }],
  "resumen": "texto de 1-2 oraciones con el estado general del inventario"
}
```

### Modelo a usar

- **Claude Haiku 4.5** por defecto (costo ~$0.006/llamada, suficiente para análisis de patrones numéricos)
- **Claude Sonnet 4.6** opcional para organizaciones con plan Enterprise o datos más complejos

---

## 🏗️ Arquitectura técnica

### Backend: nuevo servicio `AIInsightsService`

**Archivo**: `backend/services/AIInsightsService.js`

Responsabilidades:
1. `buildProductContext(organizationId)` — consulta DB y arma el payload de productos
2. `generateForecast(organizationId)` — llama a Claude API, parsea respuesta, retorna recomendaciones
3. `getCachedForecast(organizationId)` — devuelve el último forecast guardado (evita llamadas repetidas)
4. `scheduleDailyRefresh()` — job nocturno que pre-genera forecasts para todas las orgs activas en plan Pro

### Diagrama de flujo

```
Usuario abre dashboard
        ↓
GET /api/ai-insights?org_id=X
        ↓
AIInsightsService.getCachedForecast(orgId)
   → cache válido? → retorna forecast guardado (< 24hs)
   → cache expirado? → genera nuevo forecast:
        ↓
buildProductContext(orgId)
   → consulta stock_movements últimos 90d
   → calcula métricas por producto
   → filtra productos sin movimiento
        ↓
Claude API (Haiku)
   → input: contexto de productos
   → output: JSON con recomendaciones
        ↓
Guardar en ai_forecasts (DB)
        ↓
Retornar al frontend
```

### API Endpoints

```
GET  /api/ai-insights                → obtiene forecast actual (usa caché)
POST /api/ai-insights/refresh        → fuerza regeneración del forecast
GET  /api/ai-insights/history        → historial de forecasts anteriores
```

---

## 🗄️ Cambios en Base de Datos

### Tabla nueva: `ai_forecasts`

Almacena el último forecast por organización. No se guardan todos los forecasts históricos inicialmente (solo el más reciente).

```sql
CREATE TABLE ai_forecasts (
  forecast_id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,

  -- Resultado del forecast
  recommendations   JSONB NOT NULL,   -- array de recomendaciones por producto
  summary           TEXT NOT NULL,    -- resumen en lenguaje natural
  products_analyzed INTEGER NOT NULL, -- cuántos productos se analizaron

  -- Metadatos de la llamada
  model_used        VARCHAR(50) NOT NULL,  -- 'claude-haiku-4-5' | 'claude-sonnet-4-6'
  input_tokens      INTEGER,
  output_tokens     INTEGER,
  cost_usd          DECIMAL(8,6),

  -- Control de caché
  generated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until       TIMESTAMPTZ NOT NULL,  -- generated_at + 24h por defecto
  data_window_days  INTEGER NOT NULL DEFAULT 60,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_forecasts_org ON ai_forecasts(organization_id, generated_at DESC);
```

### Sin cambios en tablas existentes

El feature lee `stock_movements`, `products`, `organizations`. No requiere alterar esquema existente.

---

## 🎨 Frontend: componente `AIInsightsWidget`

### Ubicación sugerida

Widget en el dashboard principal, debajo de las stats actuales. Colapsable para no saturar.

### Estados visuales

1. **Loading**: skeleton mientras carga
2. **Empty**: "No hay suficiente historial de movimientos para generar predicciones" (menos de 7 días de datos)
3. **Healthy**: "Tu inventario está en buen estado. Próximo reorden sugerido en X días."
4. **Warnings**: lista de productos con prioridad `alta` o `critica` con cantidad sugerida y botón de acción
5. **Error**: "No se pudo generar el análisis. Intenta más tarde."

### Componente principal (estructura)

```
AIInsightsWidget
├── Header: "AI Insights" + badge "Pro" + timestamp "Actualizado hace X horas"
├── Summary: texto del resumen general
├── RecommendationsList
│   └── RecommendationItem (por cada producto)
│       ├── Badge de prioridad (roja/amarilla/verde)
│       ├── Nombre del producto + stock actual
│       ├── "~X días restantes"
│       ├── Cantidad sugerida de reorden
│       ├── Razón (texto IA, colapsable)
│       └── Botón "Crear orden de compra" (pre-filled)
└── Footer: "Regenerar análisis" (máx 1 vez por hora)
```

---

## 🔒 Permisos y tiers

### Plan Basic (gratuito)
- Sin acceso a AI Insights
- Solo alertas reactivas estáticas (PRD-05)

### Plan Pro (pago)
- AI Insights disponible
- Forecast diario automático
- Historial de últimos 7 forecasts

### Permisos por rol (dentro de la org)
| Acción | Owner | Admin | Manager | Employee |
|---|---|---|---|---|
| Ver AI Insights | ✅ | ✅ | ✅ | ❌ |
| Forzar regeneración | ✅ | ✅ | ❌ | ❌ |
| Ver historial | ✅ | ✅ | ✅ | ❌ |

---

## 💰 Modelo de costos

### Costo por organización (estimado)

| Configuración | Costo/mes |
|---|---|
| Haiku, 1 llamada/día, 20 productos | ~$0.18 |
| Haiku, 1 llamada/día, 100 productos | ~$0.40 |
| Sonnet, 1 llamada/día, 20 productos | ~$0.72 |

### Estrategia de absorción
- El costo de IA se absorbe en el margen del plan Pro
- Con pricing Pro de $20-30/mes, el costo de IA es <2% del revenue por org
- No se cobra por uso: es parte del plan flat

### Optimizaciones de costo
1. **Caché de 24h**: no se llama a la API si el forecast tiene menos de 24 horas
2. **Filtrado inteligente**: solo se envían productos con movimiento en los últimos 30 días (excluye productos muertos)
3. **Límite de productos**: máximo 50 productos por llamada en plan Pro (100 en Enterprise)
4. **Rate limiting**: máximo 1 regeneración manual por hora por organización

---

## 📋 Tareas de implementación

### Backend (3-4 días)
- [ ] Crear tabla `ai_forecasts` en Supabase
- [ ] Instalar `@anthropic-ai/sdk` en backend
- [ ] Crear `AIInsightsService.js` con métodos de contexto y forecast
- [ ] Crear `AIInsightsController.js`
- [ ] Agregar rutas en `routes/aiInsights.js`
- [ ] Aplicar middleware de autenticación y verificación de plan Pro
- [ ] Job nocturno para pre-generar forecasts (cron diario)
- [ ] Tests unitarios del service (mockeando la API de Anthropic)

### Frontend (2-3 días)
- [ ] Crear `AIInsightsWidget` en `components/modules/dashboard/`
- [ ] Hook `useAIInsights(orgId)` con React Query (staleTime = 1h)
- [ ] Integrar en dashboard principal
- [ ] UI de "plan bloqueado" para usuarios Basic con CTA de upgrade
- [ ] Botón "Crear orden de compra" que pre-llena el formulario existente

### Infraestructura (0.5 días)
- [ ] Variable de entorno `ANTHROPIC_API_KEY` en producción
- [ ] Logging de costos por organización para monitoreo

---

## 🧪 Criterios de aceptación

- [ ] El forecast se genera correctamente para una org con historial de 30+ días
- [ ] Las recomendaciones tienen prioridad, cantidad sugerida y razón en español
- [ ] El caché de 24h funciona (no se llama a la API en llamadas sucesivas)
- [ ] Usuarios en plan Basic ven el widget bloqueado con CTA de upgrade
- [ ] Empleados no pueden ver AI Insights
- [ ] La regeneración manual respeta el rate limit de 1/hora
- [ ] Si la API de Anthropic falla, se muestra el último forecast válido (graceful degradation)
- [ ] El costo de cada llamada queda registrado en `ai_forecasts.cost_usd`

---

## 🔮 Expansiones futuras (fuera de scope v1)

- **AI Purchase Order auto-draft**: generar borrador de OC directamente desde la recomendación
- **Chat con el inventario**: consultas en lenguaje natural ("¿qué me conviene comprar esta semana?")
- **Análisis de estacionalidad**: detectar patrones mensuales/anuales con más historial
- **Integración con proveedores**: enviar OC sugerida directamente al proveedor por email

---

**Owner**: Santiago
**Dependencias**: PRD-05 (Alerts) — pueden coexistir, son complementarios
**Bloqueadores**: Necesita `ANTHROPIC_API_KEY` configurada en prod
