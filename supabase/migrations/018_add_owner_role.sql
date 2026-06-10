-- Migration: 017_add_owner_role.sql
-- Adds the owner role used for the single root NoteChain account.
--
-- IMPORTANT: This is intentionally split from the seed/enforcement migration because
-- PostgreSQL enum values should be committed before they are used by later DML.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'owner';
