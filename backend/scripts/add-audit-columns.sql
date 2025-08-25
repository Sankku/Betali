-- Add audit columns to users table
-- Execute this in your Supabase dashboard SQL editor

-- Add updated_by column (references the user who made the update)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(user_id);

-- Add deactivated_by column (references the user who deactivated this user)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deactivated_by uuid REFERENCES users(user_id);

-- Add deactivated_at column (timestamp when the user was deactivated)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deactivated_at timestamp with time zone;

-- Create indexes for better performance on audit queries
CREATE INDEX IF NOT EXISTS idx_users_updated_by ON users(updated_by);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_by ON users(deactivated_by);
CREATE INDEX IF NOT EXISTS idx_users_deactivated_at ON users(deactivated_at);

-- Add comments for documentation
COMMENT ON COLUMN users.updated_by IS 'User ID of who last updated this user';
COMMENT ON COLUMN users.deactivated_by IS 'User ID of who deactivated this user';
COMMENT ON COLUMN users.deactivated_at IS 'Timestamp when the user was deactivated';