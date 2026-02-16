/**
 * Make User Admin Script
 * 
 * Run this script to promote a user to admin:
 * 
 * Option 1: Using Supabase Dashboard SQL Editor
 * 1. Go to your Supabase project dashboard
 * 2. Navigate to SQL Editor
 * 3. Run the SQL query below with the user's email
 * 
 * Option 2: Using Supabase CLI
 * supabase sql < make_user_admin.sql
 * 
 * Option 3: Programmatic (Node.js/Supabase client)
 * See the commented code below
 */

-- SQL QUERY (Run in Supabase SQL Editor):
-- Replace 'user@example.com' with the actual user email

UPDATE profiles
SET role = 'admin'
WHERE id IN (
    SELECT id 
    FROM auth.users 
    WHERE email = 'user@example.com'
);

-- To verify the user is now admin:
SELECT 
    au.email,
    p.role,
    p.full_name
FROM auth.users au
JOIN profiles p ON au.id = p.id
WHERE p.role = 'admin';

/*
// NODE.JS SCRIPT (save as makeAdmin.js and run with node):

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function makeUserAdmin(email) {
    // Get user by email
    const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
    
    if (userError) {
        console.error('Error fetching users:', userError);
        return;
    }
    
    const user = users.find(u => u.email === email);
    
    if (!user) {
        console.error('User not found:', email);
        return;
    }
    
    // Update role to admin
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', user.id);
    
    if (updateError) {
        console.error('Error updating role:', updateError);
        return;
    }
    
    console.log(`✅ Successfully made ${email} an admin!`);
}

// Usage: node makeAdmin.js user@example.com
const email = process.argv[2];
if (!email) {
    console.log('Usage: node makeAdmin.js user@example.com');
    process.exit(1);
}

makeUserAdmin(email);
*/

/**
 * QUICK SETUP STEPS:
 * 
 * 1. Apply the database migration:
 *    supabase migration up
 *    OR run the SQL in migrations/20240214000000_add_user_roles.sql
 * 
 * 2. Make yourself an admin using one of the methods above
 * 
 * 3. Refresh your browser - you should now see "Admin Dashboard" in the user menu
 * 
 * 4. Navigate to /admin to access the admin panel
 */
