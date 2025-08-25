-- Create suppliers table for multi-tenant SaaS
-- Suppliers are organizations or individuals from whom we purchase products

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(organization_id) ON DELETE CASCADE,
  branch_id uuid NULL REFERENCES branches(branch_id) ON DELETE SET NULL,
  user_id uuid NULL REFERENCES users(user_id) ON DELETE SET NULL, -- User who created the supplier
  
  -- Basic Information
  name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(50) NULL,
  address text NULL,
  
  -- Business Information
  cuit varchar(13) NOT NULL, -- Same format as clients (Argentine tax ID)
  business_type varchar(100) NULL, -- Manufacturer, Distributor, Wholesaler, etc.
  contact_person varchar(255) NULL,
  website varchar(255) NULL,
  
  -- Financial Information
  payment_terms varchar(100) NULL, -- Net 30, Net 60, COD, etc.
  tax_category varchar(50) NULL, -- IVA status, etc.
  credit_limit decimal(15,2) NULL,
  
  -- Status
  is_active boolean DEFAULT true,
  is_preferred boolean DEFAULT false, -- Preferred supplier flag
  
  -- Metadata
  notes text NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_branch_id ON suppliers(branch_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_cuit ON suppliers(cuit);
CREATE INDEX IF NOT EXISTS idx_suppliers_email ON suppliers(email);
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_is_active ON suppliers(is_active);

-- Create unique constraints
ALTER TABLE suppliers 
ADD CONSTRAINT unique_supplier_cuit_per_org 
UNIQUE (organization_id, cuit);

ALTER TABLE suppliers 
ADD CONSTRAINT unique_supplier_email_per_org 
UNIQUE (organization_id, email);

-- Add check constraints
ALTER TABLE suppliers 
ADD CONSTRAINT check_cuit_format 
CHECK (cuit ~ '^\d{2}-\d{8}-\d{1}$' OR cuit ~ '^\d{11}$');

ALTER TABLE suppliers 
ADD CONSTRAINT check_email_format 
CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_suppliers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language plpgsql;

CREATE TRIGGER trigger_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_suppliers_updated_at();

-- Insert sample data for testing (optional)
-- This will be inserted for existing organizations
DO $$
DECLARE
  org_id uuid;
BEGIN
  -- Get first organization for sample data
  SELECT organization_id INTO org_id FROM organizations LIMIT 1;
  
  IF org_id IS NOT NULL THEN
    INSERT INTO suppliers (organization_id, name, email, cuit, business_type, contact_person, phone, address, payment_terms, is_preferred) VALUES
    (org_id, 'Agroquímica Del Norte S.A.', 'ventas@agroquimicadelnorte.com.ar', '30-12345678-9', 'Manufacturer', 'Juan Carlos Pérez', '+54 11 4567-8900', 'Av. Corrientes 1234, Buenos Aires', 'Net 30', true),
    (org_id, 'Distribuidora Agropecuaria SRL', 'info@distriagro.com.ar', '30-98765432-1', 'Distributor', 'María Elena González', '+54 341 456-7890', 'Salta 567, Rosario, Santa Fe', 'Net 45', false),
    (org_id, 'Semillas Premium SA', 'contacto@semillaspremium.com.ar', '30-11223344-5', 'Wholesaler', 'Roberto Silva', '+54 223 345-6789', 'Ruta 2 Km 345, Mar del Plata', 'COD', true)
    ON CONFLICT (organization_id, cuit) DO NOTHING;
  END IF;
END $$;

-- Grant permissions (adjust based on your security model)
-- GRANT ALL PRIVILEGES ON suppliers TO authenticated;
-- GRANT USAGE ON SEQUENCE suppliers_supplier_id_seq TO authenticated;