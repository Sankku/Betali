const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixOrderStatusConstraint() {
  try {
    console.log('🔍 Checking current order status constraint...');
    
    // First, check what values might be causing issues
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .select('status')
      .limit(10);
    
    if (orderError) {
      console.error('Error fetching orders:', orderError);
    } else {
      console.log('Current order statuses in database:', orderData?.map(o => o.status));
    }

    // Drop the existing constraint
    console.log('🗑️ Dropping existing orders_status_check constraint...');
    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql: 'ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;'
    });
    
    if (dropError) {
      console.error('Error dropping constraint:', dropError);
    } else {
      console.log('✅ Constraint dropped successfully');
    }

    // Add the new constraint
    console.log('➕ Adding new orders_status_check constraint...');
    const { error: addError } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE orders 
            ADD CONSTRAINT orders_status_check 
            CHECK (status IN ('draft', 'pending', 'processing', 'shipped', 'completed', 'cancelled'));`
    });
    
    if (addError) {
      console.error('Error adding constraint:', addError);
    } else {
      console.log('✅ New constraint added successfully');
    }

    // Verify the constraint
    console.log('🔍 Verifying new constraint...');
    const { data: constraintData, error: constraintError } = await supabase.rpc('exec_sql', {
      sql: `SELECT conname, pg_get_constraintdef(c.oid) as definition
            FROM pg_constraint c 
            WHERE conrelid = 'orders'::regclass AND contype = 'c' AND conname = 'orders_status_check';`
    });
    
    if (constraintError) {
      console.error('Error verifying constraint:', constraintError);
    } else {
      console.log('✅ Constraint verified:', constraintData);
    }

  } catch (error) {
    console.error('❌ Error fixing order status constraint:', error);
  }
}

fixOrderStatusConstraint().then(() => {
  console.log('🎉 Order status constraint fix completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});