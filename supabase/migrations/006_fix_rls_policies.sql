-- Migration: 006_fix_rls_policies.sql
-- Fix broken RLS policies on encrypted_blobs

-- Drop existing broken policies
DROP POLICY IF EXISTS "Users can view own encrypted blobs" ON public.encrypted_blobs;
DROP POLICY IF EXISTS "Users can insert own encrypted blobs" ON public.encrypted_blobs;
DROP POLICY IF EXISTS "Users can update own encrypted blobs" ON public.encrypted_blobs;

-- Recreate with correct policies
CREATE POLICY "Users can view own encrypted blobs" ON public.encrypted_blobs FOR SELECT USING (
    user_id = auth.uid()
);

CREATE POLICY "Users can insert own encrypted blobs" ON public.encrypted_blobs FOR INSERT WITH CHECK (
    user_id = auth.uid()
);

CREATE POLICY "Users can update own encrypted blobs" ON public.encrypted_blobs FOR UPDATE USING (
    user_id = auth.uid()
);
