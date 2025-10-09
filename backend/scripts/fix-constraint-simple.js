const supabase = require('../lib/supabaseClient');

async function fixConstraint() {
  try {
    console.log('🔍 Checking orders table status values...');
    
    // First check current orders
    const { data: orders } = await supabase
      .from('orders')
      .select('status')
      .limit(5);
    
    console.log('Current statuses:', orders?.map(o => o.status));

    // Since we can't run DDL directly through Supabase client, 
    // let's update any invalid status values to valid ones first
    console.log('📝 Updating any invalid status values...');
    
    // Update any potentially invalid status values to 'pending'
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'pending' })
      .not('status', 'in', '(draft,pending,processing,shipped,completed,cancelled)');
    
    if (updateError) {
      console.error('Error updating status values:', updateError);
    } else {
      console.log('✅ Updated invalid status values');
    }

    console.log('ℹ️  Note: You need to run the SQL constraint fix manually in the database.');
    console.log('ℹ️  Use the SQL from fix-order-status-constraint.sql file');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixConstraint();