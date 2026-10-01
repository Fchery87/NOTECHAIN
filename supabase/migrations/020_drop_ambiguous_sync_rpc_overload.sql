-- Migration: 020_drop_ambiguous_sync_rpc_overload.sql
-- Purpose:
-- Remove the legacy BIGINT overload of public.insert_sync_operation.
--
-- Why:
-- Older migrations created insert_sync_operation with p_version BIGINT, while
-- later migrations recreated it with p_version INTEGER to match the current
-- encrypted_blobs.version column. If both overloads exist in a deployed
-- database, PostgREST cannot choose between them for JSON numeric RPC input and
-- returns PGRST203:
--
--   Could not choose the best candidate function between ... p_version => bigint ... p_version => integer
--
-- The client calls this RPC by named JSON parameters, so function overloads that
-- differ only by numeric type are unsafe. Keep the hardened INTEGER function
-- from migration 017 and drop the stale BIGINT signature.

DROP FUNCTION IF EXISTS public.insert_sync_operation(
    UUID,
    UUID,
    VARCHAR,
    VARCHAR,
    BIGINT,
    UUID,
    BYTEA,
    BYTEA,
    BYTEA,
    UUID,
    BYTEA
);
