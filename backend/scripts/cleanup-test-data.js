const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanup() {
  const orgSlug = 'betali-test-org';
  console.log('🧹 Cleaning up E2E test data...');

  try {
    const { data: org } = await supabase.from('organizations').select('organization_id').eq('slug', orgSlug).maybeSingle();
    
    if (org) {
      const orgId = org.organization_id;
      
      // Order of deletion matters due to FKs
      await supabase.from('stock_movements').delete().eq('organization_id', orgId);
      await supabase.from('stock_reservations').delete().eq('organization_id', orgId);
      await supabase.from('order_details').delete().eq('organization_id', orgId);
      await supabase.from('orders').delete().eq('organization_id', orgId);
      await supabase.from('products').delete().eq('organization_id', orgId);
      await supabase.from('clients').delete().eq('organization_id', orgId);
      await supabase.from('warehouse').delete().eq('organization_id', orgId);
      
      console.log('✅ Cleaned all data for organization:', orgSlug);
    } else {
      console.log('ℹ️ No test organization found to clean.');
    }
  } catch (e) {
    console.error('❌ Cleanup failed:', e);
  }
}

cleanup();
