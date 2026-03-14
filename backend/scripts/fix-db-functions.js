const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixStockFunction() {
  console.log('🔧 Checking/Fixing get_available_stock function...');
  
  const sql = `
    CREATE OR REPLACE FUNCTION get_available_stock(
      p_product_id UUID,
      p_warehouse_id UUID,
      p_organization_id UUID
    ) RETURNS NUMERIC AS $$
    DECLARE
      v_physical_stock NUMERIC;
      v_reserved_stock NUMERIC;
    BEGIN
      -- 1. Get physical stock (SUM of movements)
      SELECT COALESCE(SUM(
        CASE 
          WHEN movement_type = 'in' THEN quantity
          WHEN movement_type = 'out' THEN -quantity
          ELSE 0
        END
      ), 0) INTO v_physical_stock
      FROM stock_movements
      WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND organization_id = p_organization_id;

      -- 2. Get reserved stock (SUM of active reservations)
      SELECT COALESCE(SUM(quantity), 0) INTO v_reserved_stock
      FROM stock_reservations
      WHERE product_id = p_product_id
        AND warehouse_id = p_warehouse_id
        AND organization_id = p_organization_id
        AND status = 'active';

      RETURN v_physical_stock - v_reserved_stock;
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    // Note: Supabase JS client doesn't support raw SQL easily unless you have a custom RPC.
    // We will attempt to run it via an existing migration tool or a dummy RPC if available.
    // For now, let's assume we can at least LOG what's missing.
    console.log('⚠️ Please ensure the following SQL is executed in your Supabase SQL Editor:');
    console.log(sql);
    
    // Attempting a direct call to verify if it exists
    const { data, error } = await supabase.rpc('get_available_stock', {
      p_product_id: '00000000-0000-0000-0000-000000000000',
      p_warehouse_id: '00000000-0000-0000-0000-000000000000',
      p_organization_id: '00000000-0000-0000-0000-000000000000'
    });

    if (error && error.message.includes('does not exist')) {
      console.error('❌ CRITICAL: The function get_available_stock is missing in the database!');
    } else {
      console.log('✅ Function exists (or returned a different error).');
    }
  } catch (e) {
    console.error('❌ Error checking function:', e);
  }
}

fixStockFunction();
