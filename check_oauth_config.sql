-- OAuth Configuration Verification
-- Run this in Supabase SQL Editor to verify OAuth is properly configured

-- Check if auth providers are enabled
SELECT 
    provider,
    enabled,
    CASE 
        WHEN (config->>'client_id') IS NOT NULL AND (config->>'client_id') != '' 
        THEN 'Configured' 
        ELSE 'Missing Client ID' 
    END as client_id_status,
    CASE 
        WHEN (config->>'secret') IS NOT NULL AND (config->>'secret') != '' 
        THEN 'Configured' 
        ELSE 'Missing Secret' 
    END as secret_status
FROM auth.providers
WHERE provider IN ('google', 'github');

-- Check redirect URLs configuration
SELECT 
    site_url,
    additional_redirect_urls
FROM auth.config;

-- Check if callback route will work
SELECT 
    'https://kryeeloydyfnqkesvdnp.supabase.co/auth/v1/callback' as expected_callback_url,
    'Make sure this URL is added to your OAuth app (Google/GitHub)' as reminder;
