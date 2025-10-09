-- Fix clients table unique constraints for multi-tenant support
-- This script updates the CUIT and email constraints to be organization-specific

-- Step 1: Drop existing global unique constraints on clients table
DO $$ 
BEGIN
    -- Drop global CUIT constraint if it exists
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
               WHERE table_name = 'clients' AND column_name = 'cuit' 
               AND constraint_name LIKE '%cuit%unique%' OR constraint_name LIKE '%clients_cuit%') THEN
        -- Find and drop the constraint name
        EXECUTE (
            SELECT 'ALTER TABLE clients DROP CONSTRAINT ' || constraint_name || ';'
            FROM information_schema.table_constraints 
            WHERE table_name = 'clients' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%cuit%'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped global CUIT unique constraint';
    END IF;
    
    -- Drop global email constraint if it exists (we want to allow duplicate emails)
    IF EXISTS (SELECT 1 FROM information_schema.constraint_column_usage 
               WHERE table_name = 'clients' AND column_name = 'email' 
               AND constraint_name LIKE '%email%unique%' OR constraint_name LIKE '%clients_email%') THEN
        -- Find and drop the constraint name
        EXECUTE (
            SELECT 'ALTER TABLE clients DROP CONSTRAINT ' || constraint_name || ';'
            FROM information_schema.table_constraints 
            WHERE table_name = 'clients' 
            AND constraint_type = 'UNIQUE'
            AND constraint_name LIKE '%email%'
            LIMIT 1
        );
        RAISE NOTICE 'Dropped global email unique constraint (allowing duplicate emails)';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not drop existing constraints: %', SQLERRM;
END $$;

-- Step 2: Add organization-specific unique constraints
-- CUIT should be unique within each organization
ALTER TABLE clients 
ADD CONSTRAINT clients_cuit_organization_unique 
UNIQUE (organization_id, cuit);

-- Email does NOT need to be unique - same person can represent multiple business clients
-- Removed email unique constraint to allow flexibility

-- Step 3: Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_clients_cuit_organization ON clients(organization_id, cuit);
CREATE INDEX IF NOT EXISTS idx_clients_email_organization ON clients(organization_id, email);

-- Step 4: Add comments for documentation
COMMENT ON CONSTRAINT clients_cuit_organization_unique ON clients IS 'CUIT must be unique within each organization (same legal entity)';

-- Step 5: Verification
-- Check existing constraints
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'clients' 
    AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name;

RAISE NOTICE 'Clients table unique constraints updated for multi-tenant support';