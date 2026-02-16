-- Add role column to profiles table
-- Run this migration to enable admin access control

-- Add role enum type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('user', 'moderator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'user';

-- Create index for faster role lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Set up RLS policies for role-based access
-- Only admins can see other users' roles
CREATE POLICY "Users can view own role" ON profiles
    FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Admins can view all roles" ON profiles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update roles
CREATE POLICY "Only admins can update roles" ON profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Create function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Example: Make first user an admin (uncomment and run manually)
-- UPDATE profiles SET role = 'admin' WHERE id = (SELECT id FROM profiles LIMIT 1);
