-- Remove email unique constraint from clients table
-- This script removes the organization-specific email unique constraint

-- Drop specific email constraint first
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
               WHERE table_name = 'clients' 
               AND constraint_type = 'UNIQUE'
               AND constraint_name = 'clients_email_organization_unique') THEN
        
        ALTER TABLE clients DROP CONSTRAINT clients_email_organization_unique;
        RAISE NOTICE 'Dropped clients_email_organization_unique constraint';
        
    ELSE
        RAISE NOTICE 'Constraint clients_email_organization_unique does not exist';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing email constraint: %', SQLERRM;
END $$;

-- Drop any other email-related constraints
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN 
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'clients' 
        AND constraint_type = 'UNIQUE'
        AND constraint_name LIKE '%email%'
    LOOP
        EXECUTE 'ALTER TABLE clients DROP CONSTRAINT ' || constraint_rec.constraint_name;
        RAISE NOTICE 'Dropped additional email constraint: %', constraint_rec.constraint_name;
    END LOOP;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error removing additional email constraints: %', SQLERRM;
END $$;

-- Verification: List remaining unique constraints on clients table
SELECT 
    tc.constraint_name, 
    tc.constraint_type,
    string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc 
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'clients' 
    AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name, tc.constraint_type
ORDER BY tc.constraint_name;

RAISE NOTICE 'Email unique constraint removed - emails can now be duplicated';