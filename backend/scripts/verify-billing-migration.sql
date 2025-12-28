-- Verification Script for Billing System Migration
-- Run this in Supabase SQL Editor to verify everything was created correctly

-- ============================================================================
-- 1. CHECK TABLES
-- ============================================================================
SELECT
  'Tables Created' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) = 4 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 4 tables'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('subscriptions', 'manual_payments', 'invoices', 'subscription_history');

-- Show table details
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('subscriptions', 'manual_payments', 'invoices', 'subscription_history')
ORDER BY table_name;

-- ============================================================================
-- 2. CHECK FUNCTIONS
-- ============================================================================
SELECT
  'Functions Created' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 2 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected at least 2 functions'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('has_feature_access', 'get_active_subscription');

-- Show function details
SELECT
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('has_feature_access', 'get_active_subscription',
                      'log_subscription_change', 'create_default_subscription',
                      'update_updated_at_column')
ORDER BY routine_name;

-- ============================================================================
-- 3. CHECK TRIGGERS
-- ============================================================================
SELECT
  'Triggers Created' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected at least 4 triggers'
  END as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('subscriptions', 'manual_payments', 'invoices', 'organizations');

-- Show trigger details
SELECT
  trigger_name,
  event_object_table as table_name,
  event_manipulation as trigger_event
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('subscriptions', 'manual_payments', 'invoices', 'organizations')
ORDER BY event_object_table, trigger_name;

-- ============================================================================
-- 4. CHECK INDEXES
-- ============================================================================
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('subscriptions', 'manual_payments', 'invoices', 'subscription_history')
ORDER BY tablename, indexname;

-- ============================================================================
-- 5. CHECK SUBSCRIPTION PLANS
-- ============================================================================
SELECT
  'Subscription Plans' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    ELSE '⚠️ WARNING - Expected at least 4 plans'
  END as status
FROM subscription_plans
WHERE is_active = true;

-- Show plan details
SELECT
  name,
  display_name,
  price_monthly,
  price_yearly,
  max_users,
  max_warehouses,
  is_active,
  is_public
FROM subscription_plans
ORDER BY sort_order;

-- ============================================================================
-- 6. CHECK DEFAULT SUBSCRIPTIONS
-- ============================================================================
SELECT
  'Default Subscriptions' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS - Free subscriptions created'
    ELSE '⚠️ WARNING - No subscriptions found (may be normal if no orgs exist)'
  END as status
FROM subscriptions;

-- Show subscription details
SELECT
  o.name as organization_name,
  sp.name as plan_name,
  s.status,
  s.start_date,
  s.created_at
FROM subscriptions s
JOIN organizations o ON o.organization_id = s.organization_id
JOIN subscription_plans sp ON sp.plan_id = s.plan_id
ORDER BY s.created_at DESC
LIMIT 10;

-- ============================================================================
-- 7. CHECK SUBSCRIPTION HISTORY
-- ============================================================================
SELECT
  'Subscription History Records' as check_type,
  COUNT(*) as count,
  CASE
    WHEN COUNT(*) > 0 THEN '✅ PASS - Audit trail working'
    ELSE '⚠️ INFO - No history yet (normal for fresh migration)'
  END as status
FROM subscription_history;

-- Show recent history
SELECT
  sh.action,
  o.name as organization_name,
  sp.name as new_plan,
  sh.created_at
FROM subscription_history sh
JOIN organizations o ON o.organization_id = sh.organization_id
LEFT JOIN subscription_plans sp ON sp.plan_id = sh.new_plan_id
ORDER BY sh.created_at DESC
LIMIT 10;

-- ============================================================================
-- 8. TEST FEATURE ACCESS FUNCTION
-- ============================================================================
-- Test with first organization (should return false for api_access on free plan)
SELECT
  'Feature Access Function Test' as check_type,
  has_feature_access(
    (SELECT organization_id FROM organizations LIMIT 1),
    'api_access'
  ) as has_api_access,
  CASE
    WHEN has_feature_access(
      (SELECT organization_id FROM organizations LIMIT 1),
      'api_access'
    ) = false THEN '✅ PASS - Function working (free plan has no API access)'
    ELSE '⚠️ WARNING - Check plan assignment'
  END as status;

-- ============================================================================
-- 9. SUMMARY
-- ============================================================================
SELECT
  '========== MIGRATION SUMMARY ==========' as summary;

SELECT
  'Tables' as component,
  (SELECT COUNT(*) FROM information_schema.tables
   WHERE table_schema = 'public'
   AND table_name IN ('subscriptions', 'manual_payments', 'invoices', 'subscription_history')) as created,
  4 as expected,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name IN ('subscriptions', 'manual_payments', 'invoices', 'subscription_history')) = 4
    THEN '✅' ELSE '❌'
  END as status
UNION ALL
SELECT
  'Functions',
  (SELECT COUNT(*) FROM information_schema.routines
   WHERE routine_schema = 'public'
   AND routine_name IN ('has_feature_access', 'get_active_subscription')),
  2,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.routines
          WHERE routine_schema = 'public'
          AND routine_name IN ('has_feature_access', 'get_active_subscription')) >= 2
    THEN '✅' ELSE '❌'
  END
UNION ALL
SELECT
  'Triggers',
  (SELECT COUNT(*) FROM information_schema.triggers
   WHERE trigger_schema = 'public'
   AND event_object_table IN ('subscriptions', 'manual_payments', 'invoices', 'organizations')),
  4,
  CASE
    WHEN (SELECT COUNT(*) FROM information_schema.triggers
          WHERE trigger_schema = 'public'
          AND event_object_table IN ('subscriptions', 'manual_payments', 'invoices', 'organizations')) >= 4
    THEN '✅' ELSE '❌'
  END
UNION ALL
SELECT
  'Subscriptions',
  (SELECT COUNT(*) FROM subscriptions),
  (SELECT COUNT(*) FROM organizations),
  CASE
    WHEN (SELECT COUNT(*) FROM subscriptions) >= (SELECT COUNT(*) FROM organizations)
    THEN '✅' ELSE '⚠️'
  END;

-- ============================================================================
-- 10. NEXT STEPS
-- ============================================================================
SELECT
  '========== NEXT STEPS ==========' as next_steps;

SELECT
  '1. Start backend: cd backend && bun run dev' as step
UNION ALL
SELECT '2. Test API: curl http://localhost:4000/api/subscriptions/plans'
UNION ALL
SELECT '3. Build frontend pricing page'
UNION ALL
SELECT '4. Build admin billing dashboard';
