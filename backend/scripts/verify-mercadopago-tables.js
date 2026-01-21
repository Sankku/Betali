/**
 * Script to verify Mercado Pago tables and columns were created correctly
 * Run with: node scripts/verify-mercadopago-tables.js
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function verifyTables() {
  console.log('🔍 Verificando tablas de Mercado Pago...\n');

  try {
    // 1. Verificar que las tablas existen
    console.log('1️⃣ Verificando existencia de tablas:');
    console.log('   =====================================\n');

    const tables = ['subscription_plans', 'subscriptions', 'webhook_logs'];

    for (const tableName of tables) {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0);

      if (error && error.code === '42P01') {
        console.log(`   ❌ ${tableName}: NO EXISTE`);
      } else if (error) {
        console.log(`   ⚠️  ${tableName}: Error - ${error.message}`);
      } else {
        console.log(`   ✅ ${tableName}: Existe`);
      }
    }

    // 2. Verificar columnas de Mercado Pago en subscriptions
    console.log('\n2️⃣ Verificando columnas de Mercado Pago en subscriptions:');
    console.log('   =====================================================\n');

    const { data: subscriptionColumns, error: colError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'subscriptions'
          AND column_name IN ('payment_provider', 'provider_subscription_id', 'provider_customer_id', 'payment_gateway', 'gateway_subscription_id', 'gateway_customer_id')
          ORDER BY column_name;
        `
      })
      .catch(() => null);

    // Si rpc no funciona, intentar con query directa
    if (!subscriptionColumns) {
      console.log('   Verificando manualmente...');

      const mpColumns = [
        'payment_provider',
        'provider_subscription_id',
        'provider_customer_id',
        'payment_gateway',
        'gateway_subscription_id',
        'gateway_customer_id'
      ];

      // Intentar un INSERT vacío para ver qué columnas existen
      const { data: testData, error: testError } = await supabase
        .from('subscriptions')
        .select('*')
        .limit(1);

      if (testError && testError.code === '42P01') {
        console.log('   ❌ Tabla subscriptions no existe todavía');
      } else if (!testError && testData !== null) {
        console.log('   ✅ Tabla subscriptions existe');
        console.log('   ℹ️  Para ver columnas, ejecuta la query SQL en Supabase Dashboard');
      }
    } else {
      console.log('   Columnas encontradas:', subscriptionColumns);
    }

    // 3. Verificar webhook_logs
    console.log('\n3️⃣ Verificando estructura de webhook_logs:');
    console.log('   ==========================================\n');

    const { data: webhookTest, error: webhookError } = await supabase
      .from('webhook_logs')
      .select('*')
      .limit(1);

    if (webhookError && webhookError.code === '42P01') {
      console.log('   ❌ Tabla webhook_logs no existe todavía');
    } else if (webhookError) {
      console.log('   ⚠️  Error:', webhookError.message);
    } else {
      console.log('   ✅ Tabla webhook_logs existe y es accesible');
    }

    // 4. Verificar subscription_plans
    console.log('\n4️⃣ Verificando subscription_plans:');
    console.log('   ==================================\n');

    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('plan_id, name, price_monthly, currency, is_active')
      .limit(5);

    if (plansError && plansError.code === '42P01') {
      console.log('   ❌ Tabla subscription_plans no existe todavía');
    } else if (plansError) {
      console.log('   ⚠️  Error:', plansError.message);
    } else if (plans && plans.length > 0) {
      console.log(`   ✅ Tabla existe con ${plans.length} plan(es):`);
      plans.forEach(plan => {
        console.log(`      - ${plan.name}: $${plan.price_monthly} ${plan.currency} (Active: ${plan.is_active})`);
      });
    } else {
      console.log('   ✅ Tabla existe pero está vacía');
    }

    // 5. Resumen final
    console.log('\n📊 RESUMEN:');
    console.log('   =========\n');
    console.log('   Para verificar en detalle las columnas, ejecuta esta query en');
    console.log('   Supabase SQL Editor:\n');
    console.log('   ```sql');
    console.log('   -- Ver estructura de subscriptions');
    console.log('   SELECT column_name, data_type, is_nullable, column_default');
    console.log('   FROM information_schema.columns');
    console.log('   WHERE table_name = \'subscriptions\'');
    console.log('   ORDER BY ordinal_position;');
    console.log('');
    console.log('   -- Ver todas las tablas del schema public');
    console.log('   SELECT table_name');
    console.log('   FROM information_schema.tables');
    console.log('   WHERE table_schema = \'public\'');
    console.log('   ORDER BY table_name;');
    console.log('   ```\n');

  } catch (error) {
    console.error('❌ Error durante la verificación:', error.message);
    console.error('\nDetalles:', error);
  }
}

// Ejecutar
verifyTables()
  .then(() => {
    console.log('\n✅ Verificación completada\n');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
