-- ============================================================================
-- Script de Verificación de Tablas de Mercado Pago
-- ============================================================================
-- Ejecutá este script en Supabase SQL Editor para verificar que las
-- migraciones se ejecutaron correctamente
-- ============================================================================

\echo '========================================='
\echo '🔍 VERIFICACIÓN DE TABLAS MERCADO PAGO'
\echo '========================================='

-- 1. Verificar qué tablas existen
\echo ''
\echo '1️⃣  TABLAS EXISTENTES EN PUBLIC SCHEMA:'
\echo '========================================='
SELECT
  table_name,
  CASE
    WHEN table_name IN ('subscription_plans', 'subscriptions', 'webhook_logs')
    THEN '✅ Requerida para MP'
    ELSE '  Otra tabla'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. Verificar estructura de subscription_plans
\echo ''
\echo '2️⃣  ESTRUCTURA DE subscription_plans:'
\echo '========================================='
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'subscription_plans'
ORDER BY ordinal_position;

-- 3. Verificar estructura de subscriptions
\echo ''
\echo '3️⃣  ESTRUCTURA DE subscriptions:'
\echo '========================================='
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE
    WHEN column_name IN ('payment_provider', 'provider_subscription_id', 'provider_customer_id',
                         'payment_gateway', 'gateway_subscription_id', 'gateway_customer_id')
    THEN '🔵 Campo MP'
    ELSE ''
  END as mp_field
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;

-- 4. Verificar campos específicos de Mercado Pago en subscriptions
\echo ''
\echo '4️⃣  CAMPOS DE MERCADO PAGO EN subscriptions:'
\echo '================================================='
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND (
    column_name IN ('payment_provider', 'provider_subscription_id', 'provider_customer_id')
    OR column_name IN ('payment_gateway', 'gateway_subscription_id', 'gateway_customer_id')
  )
ORDER BY column_name;

-- 5. Verificar estructura de webhook_logs
\echo ''
\echo '5️⃣  ESTRUCTURA DE webhook_logs:'
\echo '========================================='
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'webhook_logs'
ORDER BY ordinal_position;

-- 6. Verificar constraints de subscriptions
\echo ''
\echo '6️⃣  CONSTRAINTS DE subscriptions:'
\echo '========================================='
SELECT
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'subscriptions'
ORDER BY constraint_type, constraint_name;

-- 7. Verificar índices
\echo ''
\echo '7️⃣  ÍNDICES RELACIONADOS A MERCADO PAGO:'
\echo '========================================='
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    tablename IN ('subscriptions', 'webhook_logs')
    OR indexname LIKE '%provider%'
    OR indexname LIKE '%gateway%'
    OR indexname LIKE '%webhook%'
  )
ORDER BY tablename, indexname;

-- 8. Verificar funciones relacionadas
\echo ''
\echo '8️⃣  FUNCIONES RELACIONADAS:'
\echo '========================================='
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%payment%'
    OR routine_name LIKE '%webhook%'
    OR routine_name LIKE '%mercado%'
  )
ORDER BY routine_name;

-- 9. Contar datos existentes
\echo ''
\echo '9️⃣  DATOS EXISTENTES:'
\echo '========================================='

-- Contar subscription_plans
DO $$
DECLARE
  plan_count INTEGER;
  subscription_count INTEGER;
  webhook_count INTEGER;
BEGIN
  -- Contar planes
  SELECT COUNT(*) INTO plan_count FROM subscription_plans WHERE TRUE;
  RAISE NOTICE '📊 subscription_plans: % registro(s)', plan_count;

  -- Contar suscripciones
  SELECT COUNT(*) INTO subscription_count FROM subscriptions WHERE TRUE;
  RAISE NOTICE '📊 subscriptions: % registro(s)', subscription_count;

  -- Contar webhooks
  SELECT COUNT(*) INTO webhook_count FROM webhook_logs WHERE TRUE;
  RAISE NOTICE '📊 webhook_logs: % registro(s)', webhook_count;

EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE '❌ Alguna tabla no existe todavía';
END $$;

-- 10. Verificar datos de planes activos
\echo ''
\echo '🔟 PLANES DE SUSCRIPCIÓN ACTIVOS:'
\echo '========================================='
SELECT
  plan_id,
  name,
  price_monthly,
  currency,
  is_active,
  created_at
FROM subscription_plans
WHERE is_active = true
ORDER BY price_monthly;

-- Resumen final
\echo ''
\echo '========================================='
\echo '✅ VERIFICACIÓN COMPLETADA'
\echo '========================================='
\echo ''
\echo 'Si ves errores de "relation does not exist",'
\echo 'significa que necesitás ejecutar las migraciones:'
\echo '  1. backend/scripts/migrations/001_create_subscription_plans_table.sql'
\echo '  2. backend/scripts/migrations/002_create_subscriptions_table.sql'
\echo '  3. backend/migrations/add_mercadopago_fields.sql'
\echo ''
