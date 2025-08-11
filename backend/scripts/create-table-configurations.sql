-- Create table_configurations table
CREATE TABLE IF NOT EXISTS public.table_configurations (
  id varchar(255) PRIMARY KEY,
  name varchar(255) NOT NULL,
  entity varchar(255) NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_table_configurations_entity ON public.table_configurations(entity);
CREATE INDEX IF NOT EXISTS idx_table_configurations_name ON public.table_configurations(name);
CREATE INDEX IF NOT EXISTS idx_table_configurations_created_at ON public.table_configurations(created_at);

-- Add comments for documentation
COMMENT ON TABLE public.table_configurations IS 'Stores table configuration metadata for the application';
COMMENT ON COLUMN public.table_configurations.id IS 'Unique identifier for the table configuration';
COMMENT ON COLUMN public.table_configurations.name IS 'Human-readable name for the table configuration';
COMMENT ON COLUMN public.table_configurations.entity IS 'Entity/table name this configuration applies to';
COMMENT ON COLUMN public.table_configurations.config IS 'JSON configuration for columns, pagination, search, etc.';