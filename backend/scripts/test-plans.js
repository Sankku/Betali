#!/usr/bin/env node
/**
 * test-plans.js — Script de pruebas para suscripciones y quotas
 *
 * Comandos:
 *   node scripts/test-plans.js plans              → listar todos los planes
 *   node scripts/test-plans.js orgs               → listar organizaciones
 *   node scripts/test-plans.js status <org_id>    → estado actual de sub + usage
 *   node scripts/test-plans.js switch <org_id> <plan_name>  → cambiar plan sin pagar
 *   node scripts/test-plans.js cancel <org_id>    → cancelar sub y volver a free
 *   node scripts/test-plans.js add-test-plan       → insertar plan $1 ARS para pruebas
 *   node scripts/test-plans.js remove-test-plan    → eliminar plan de prueba
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const colors = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(color, ...args) {
  console.log(colors[color] + args.join(' ') + colors.reset);
}

function title(text) {
  console.log('\n' + colors.bold + colors.cyan + '─── ' + text + ' ───' + colors.reset);
}

function formatLimit(val) {
  return val === -1 ? '∞ ilimitado' : val?.toLocaleString() ?? '—';
}

function formatStatus(status) {
  const map = {
    active: colors.green + 'active' + colors.reset,
    trialing: colors.yellow + 'trialing' + colors.reset,
    canceled: colors.red + 'canceled' + colors.reset,
    pending_payment: colors.yellow + 'pending_payment' + colors.reset,
    past_due: colors.red + 'past_due' + colors.reset,
    free: colors.gray + 'free' + colors.reset,
  };
  return map[status] || status;
}

// ─── Comandos ─────────────────────────────────────────────────────────────────

async function cmdPlans() {
  title('Planes disponibles');
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .order('price_monthly', { ascending: true });

  if (error) return log('red', 'Error:', error.message);

  for (const p of data) {
    const marker = p.name === 'test_1ars' ? ' ← PLAN DE PRUEBA' : '';
    log('bold', `\n[${p.name}]${marker}`);
    console.log(`  Precio:       $${p.price_monthly} ARS/mes  |  $${p.price_yearly} ARS/año`);
    console.log(`  Usuarios:     ${formatLimit(p.max_users)}`);
    console.log(`  Productos:    ${formatLimit(p.max_products)}`);
    console.log(`  Almacenes:    ${formatLimit(p.max_warehouses)}`);
    console.log(`  Mov/mes:      ${formatLimit(p.max_stock_movements_per_month)}`);
    console.log(`  Órdenes/mes:  ${formatLimit(p.max_orders_per_month)}`);
    console.log(`  Activo:       ${p.is_active ? colors.green + 'sí' + colors.reset : colors.red + 'no' + colors.reset}`);
  }
}

async function cmdOrgs() {
  title('Organizaciones');
  const { data, error } = await supabase
    .from('organizations')
    .select('organization_id, name, subscription_plan, subscription_status')
    .order('name');

  if (error) return log('red', 'Error:', error.message);

  for (const o of data) {
    console.log(
      `  ${colors.bold}${o.name}${colors.reset}  ${colors.gray}(${o.organization_id})${colors.reset}` +
      `  plan=${colors.cyan}${o.subscription_plan}${colors.reset}  status=${formatStatus(o.subscription_status)}`
    );
  }
}

async function cmdStatus(orgId) {
  if (!orgId) return log('red', 'Uso: node scripts/test-plans.js status <org_id>');
  title('Estado de suscripción');

  // Org info
  const { data: org } = await supabase
    .from('organizations')
    .select('name, subscription_plan, subscription_status, trial_ends_at')
    .eq('organization_id', orgId)
    .single();

  if (!org) return log('red', 'Organización no encontrada:', orgId);

  log('bold', `\nOrg: ${org.name}`);
  console.log(`  Plan:    ${colors.cyan}${org.subscription_plan}${colors.reset}`);
  console.log(`  Status:  ${formatStatus(org.subscription_status)}`);

  // Subscription record
  const { data: sub } = await supabase
    .from('subscriptions')
    .select('*, subscription_plans(*)')
    .eq('organization_id', orgId)
    .not('status', 'eq', 'canceled')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sub) {
    console.log(`  Sub ID:  ${colors.gray}${sub.subscription_id}${colors.reset}`);
    console.log(`  Período: ${sub.current_period_start?.split('T')[0]} → ${sub.current_period_end?.split('T')[0]}`);
    console.log(`  Ciclo:   ${sub.billing_cycle}`);
  }

  // Usage
  title('Usage actual vs límites del plan');
  const [
    { count: users },
    { count: products },
    { count: warehouses },
    { count: clients },
    { count: suppliers },
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('warehouse').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('clients').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
    supabase.from('suppliers').select('*', { count: 'exact', head: true }).eq('organization_id', orgId),
  ]);

  const plan = sub?.subscription_plans;
  function usageLine(label, used, max) {
    const unlimited = max === -1;
    const pct = unlimited ? 0 : Math.round((used / max) * 100);
    const bar = unlimited ? colors.gray + '∞' : (pct >= 90 ? colors.red : pct >= 70 ? colors.yellow : colors.green) + `${used}/${max} (${pct}%)`;
    console.log(`  ${label.padEnd(14)} ${bar}${colors.reset}`);
  }

  usageLine('Usuarios', users ?? 0, plan?.max_users ?? '—');
  usageLine('Productos', products ?? 0, plan?.max_products ?? '—');
  usageLine('Almacenes', warehouses ?? 0, plan?.max_warehouses ?? '—');
  usageLine('Clientes', clients ?? 0, plan?.max_clients ?? '—');
  usageLine('Proveedores', suppliers ?? 0, plan?.max_suppliers ?? '—');
}

async function cmdSwitch(orgId, planName) {
  if (!orgId || !planName) return log('red', 'Uso: node scripts/test-plans.js switch <org_id> <plan_name>');

  // Verificar que el plan existe
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('name', planName)
    .single();

  if (planError || !plan) return log('red', `Plan "${planName}" no encontrado. Usá: node scripts/test-plans.js plans`);

  title(`Cambiando plan → ${planName}`);

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Upsert subscription
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('subscription_id')
    .eq('organization_id', orgId)
    .not('status', 'eq', 'canceled')
    .limit(1)
    .maybeSingle();

  if (existingSub) {
    await supabase
      .from('subscriptions')
      .update({
        plan_id: plan.plan_id,
        status: planName === 'free' ? 'active' : 'active',
        billing_cycle: 'monthly',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        updated_at: now.toISOString(),
        activated_by: 'test_script',
      })
      .eq('subscription_id', existingSub.subscription_id);

    log('green', `✓ Subscription actualizada (${existingSub.subscription_id})`);
  } else {
    const { data: newSub } = await supabase
      .from('subscriptions')
      .insert({
        organization_id: orgId,
        plan_id: plan.plan_id,
        status: 'active',
        billing_cycle: 'monthly',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        next_billing_date: periodEnd.toISOString(),
        payment_gateway: planName === 'free' ? null : 'mercadopago',
        activated_by: 'test_script',
      })
      .select('subscription_id')
      .single();

    log('green', `✓ Subscription creada (${newSub.subscription_id})`);
  }

  // Sync organizations table
  await supabase
    .from('organizations')
    .update({
      subscription_plan: planName,
      subscription_status: 'active',
    })
    .eq('organization_id', orgId);

  log('green', `✓ organizations.subscription_plan → "${planName}"`);
  log('cyan', `\n→ Ahora corré: node scripts/test-plans.js status ${orgId}`);
}

async function cmdCancel(orgId) {
  if (!orgId) return log('red', 'Uso: node scripts/test-plans.js cancel <org_id>');

  title('Cancelando suscripción → volviendo a free');

  const { data: freePlan } = await supabase
    .from('subscription_plans')
    .select('plan_id')
    .eq('name', 'free')
    .single();

  // Cancelar sub activa
  await supabase
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('organization_id', orgId)
    .not('status', 'eq', 'canceled');

  // Sync org a free
  await supabase
    .from('organizations')
    .update({
      subscription_plan: 'free',
      subscription_status: 'active',
    })
    .eq('organization_id', orgId);

  log('green', `✓ Suscripción cancelada`);
  log('green', `✓ Org vuelve al plan free`);
}

async function cmdAddTestPlan() {
  title('Creando plan de prueba ($1 ARS)');

  const { data: existing } = await supabase
    .from('subscription_plans')
    .select('plan_id')
    .eq('name', 'test_1ars')
    .maybeSingle();

  if (existing) {
    log('yellow', '⚠ El plan "test_1ars" ya existe. Nada que hacer.');
    return;
  }

  const { error } = await supabase
    .from('subscription_plans')
    .insert({
      name: 'test_1ars',
      display_name: '🧪 Test Plan ($1)',
      description: 'Plan de prueba para testing de pagos reales. NO usar en producción.',
      price_monthly: 1,
      price_yearly: 1,
      currency: 'ARS',
      max_users: 3,
      max_products: 500,
      max_warehouses: 2,
      max_stock_movements_per_month: 1000,
      max_orders_per_month: 200,
      max_clients: 100,
      max_suppliers: 50,
      storage_limit_mb: 1024,
      features: { api_access: false, advanced_analytics: false, custom_reports: false, audit_logs: false, sso: false, priority_support: false },
      is_active: true,
      is_public: false,   // no aparece en la pricing page
      trial_period_days: 0,
    });

  if (error) return log('red', 'Error:', error.message);

  log('green', '✓ Plan "test_1ars" creado con $1 ARS/mes');
  log('cyan', '  is_public=false → no aparece en la pricing page de usuarios');
  log('cyan', '  Para usarlo: node scripts/test-plans.js switch <org_id> test_1ars');
}

async function cmdRemoveTestPlan() {
  title('Eliminando plan de prueba');

  // Primero mover orgs que lo usen a free
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('organization_id')
    .eq('plan_id', (await supabase.from('subscription_plans').select('plan_id').eq('name', 'test_1ars').single()).data?.plan_id);

  if (subs?.length) {
    log('yellow', `⚠ Hay ${subs.length} org(s) en test_1ars. Cancelando primero...`);
    for (const s of subs) await cmdCancel(s.organization_id);
  }

  const { error } = await supabase
    .from('subscription_plans')
    .delete()
    .eq('name', 'test_1ars');

  if (error) return log('red', 'Error:', error.message);
  log('green', '✓ Plan "test_1ars" eliminado');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const [,, cmd, arg1, arg2] = process.argv;

  if (!process.env.SUPABASE_URL) {
    log('red', '✗ SUPABASE_URL no configurado. Asegurate de tener el .env cargado.');
    process.exit(1);
  }

  switch (cmd) {
    case 'plans':          return cmdPlans();
    case 'orgs':           return cmdOrgs();
    case 'status':         return cmdStatus(arg1);
    case 'switch':         return cmdSwitch(arg1, arg2);
    case 'cancel':         return cmdCancel(arg1);
    case 'add-test-plan':  return cmdAddTestPlan();
    case 'remove-test-plan': return cmdRemoveTestPlan();
    default:
      console.log(`
${colors.bold}test-plans.js — Herramienta de pruebas de suscripciones${colors.reset}

${colors.cyan}Comandos:${colors.reset}
  plans                          Listar todos los planes y sus límites
  orgs                           Listar organizaciones con su plan actual
  status  <org_id>               Ver estado de sub + usage actual vs límites
  switch  <org_id> <plan_name>   Cambiar plan directamente en DB (sin pagar)
  cancel  <org_id>               Cancelar sub y volver al plan free
  add-test-plan                  Crear plan de $1 ARS para probar pagos reales
  remove-test-plan               Eliminar el plan de prueba

${colors.yellow}Flujo típico de testing:${colors.reset}
  1. node scripts/test-plans.js orgs
  2. node scripts/test-plans.js add-test-plan
  3. node scripts/test-plans.js switch <org_id> test_1ars   ← pagar $1 con MP real
  4. node scripts/test-plans.js status <org_id>             ← verificar quotas
  5. node scripts/test-plans.js switch <org_id> starter     ← testear plan starter sin pagar
  6. node scripts/test-plans.js switch <org_id> professional
  7. node scripts/test-plans.js cancel <org_id>             ← limpiar al final
`);
  }
}

main().catch(err => {
  console.error(colors.red + '✗ Error fatal:' + colors.reset, err.message);
  process.exit(1);
});
