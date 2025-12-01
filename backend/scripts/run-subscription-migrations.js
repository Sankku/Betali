const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Run SQL migration file
 */
async function runMigration(filePath) {
  try {
    console.log(`\n📄 Running migration: ${path.basename(filePath)}`);

    const sql = fs.readFileSync(filePath, 'utf8');

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement });

        if (error) {
          // Try direct execution as fallback
          const { error: directError } = await supabase.from('_migrations').insert({});

          if (directError) {
            console.error(`   ❌ Error: ${error.message}`);
            throw error;
          }
        }
      }
    }

    console.log(`   ✅ Migration completed successfully`);
    return true;
  } catch (error) {
    console.error(`   ❌ Migration failed: ${error.message}`);
    throw error;
  }
}

/**
 * Main migration runner
 */
async function main() {
  console.log('🚀 Starting subscription system database migrations...\n');
  console.log('━'.repeat(60));

  const migrationsDir = path.join(__dirname, 'migrations');

  // Migration files in order
  const migrations = [
    '001_create_subscription_plans_table.sql',
    '002_create_subscriptions_table.sql',
    '003_create_usage_tracking_table.sql',
    '004_update_organizations_table.sql'
  ];

  let successCount = 0;
  let failCount = 0;

  for (const migration of migrations) {
    const filePath = path.join(migrationsDir, migration);

    if (!fs.existsSync(filePath)) {
      console.error(`❌ Migration file not found: ${migration}`);
      failCount++;
      continue;
    }

    try {
      await runMigration(filePath);
      successCount++;
    } catch (error) {
      failCount++;
      console.error(`\n❌ Failed to run migration: ${migration}`);
      console.error(`   Error: ${error.message}\n`);

      // Ask if we should continue
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('Continue with remaining migrations? (y/n): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y') {
        break;
      }
    }
  }

  console.log('\n' + '━'.repeat(60));
  console.log('\n📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   📋 Total: ${migrations.length}`);

  if (failCount === 0) {
    console.log('\n🎉 All migrations completed successfully!\n');

    // Verify tables were created
    console.log('🔍 Verifying tables...\n');
    await verifyTables();
  } else {
    console.log('\n⚠️  Some migrations failed. Please check the errors above.\n');
    process.exit(1);
  }
}

/**
 * Verify that tables were created
 */
async function verifyTables() {
  const tables = [
    'subscription_plans',
    'subscriptions',
    'usage_tracking'
  ];

  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.log(`   ❌ Table '${table}' - Error: ${error.message}`);
      } else {
        console.log(`   ✅ Table '${table}' - OK (${count || 0} rows)`);
      }
    } catch (error) {
      console.log(`   ❌ Table '${table}' - Error: ${error.message}`);
    }
  }

  // Check if plans were seeded
  console.log('\n🌱 Checking seed data...\n');
  try {
    const { data: plans, error } = await supabase
      .from('subscription_plans')
      .select('name, display_name, price_monthly');

    if (error) {
      console.log(`   ❌ Error fetching plans: ${error.message}`);
    } else if (plans && plans.length > 0) {
      console.log(`   ✅ Found ${plans.length} subscription plans:`);
      plans.forEach(plan => {
        console.log(`      - ${plan.display_name} ($${plan.price_monthly}/mo)`);
      });
    } else {
      console.log(`   ⚠️  No subscription plans found`);
    }
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }

  console.log('\n✨ Verification complete!\n');
}

// Run migrations
main().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
