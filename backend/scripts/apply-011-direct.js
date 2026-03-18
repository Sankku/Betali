/**
 * Apply migration 011 using direct pg connection derived from SUPABASE_URL.
 * Supabase DB host: db.{project-ref}.supabase.co:5432
 * Password: the service role key won't work here; needs DB password.
 * Falls back to printing the SQL if connection fails.
 */
require('dotenv').config();
const { Client } = require('pg');

const sql = `
CREATE OR REPLACE FUNCTION generate_purchase_order_number(org_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  next_number INTEGER;
  po_number   VARCHAR(50);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(org_id::TEXT)::BIGINT);

  SELECT COALESCE(
    MAX(CAST(SUBSTRING(purchase_order_number FROM '[0-9]+$') AS INTEGER)), 0
  ) + 1
  INTO next_number
  FROM purchase_orders
  WHERE organization_id = org_id
    AND purchase_order_number ~ '^PO-[0-9]+$';

  po_number := 'PO-' || LPAD(next_number::TEXT, 6, '0');
  RETURN po_number;
END;
$$ LANGUAGE plpgsql;
`;

async function apply() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const match = supabaseUrl && supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (!match) {
    printSql();
    return;
  }

  const projectRef = match[1];
  const dbPassword = process.env.SUPABASE_DB_PASSWORD || process.env.DB_PASSWORD;

  if (!dbPassword) {
    console.log('No SUPABASE_DB_PASSWORD found in env.\n');
    printSql();
    return;
  }

  const client = new Client({
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPassword,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(sql);
    console.log('✅ Migration 011 applied — generate_purchase_order_number fixed!');
  } catch (err) {
    console.error('Connection/query failed:', err.message);
    printSql();
  } finally {
    await client.end().catch(() => {});
  }
}

function printSql() {
  console.log('\nPaste this SQL in your Supabase SQL Editor (https://supabase.com/dashboard):\n');
  console.log('='.repeat(72));
  console.log(sql);
  console.log('='.repeat(72));
}

apply();
