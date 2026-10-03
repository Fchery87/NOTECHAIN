-- Migration: 022_vault_key_envelopes.sql
-- Stores each user's master key sealed with their vault passphrase so a new
-- device can unlock the vault with the passphrase instead of a pasted recovery
-- key. The server only ever holds the sealed envelope; it cannot open it.
-- Safe to run more than once.

CREATE TABLE IF NOT EXISTS public.vault_key_envelopes (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    envelope JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT vault_key_envelopes_shape CHECK (
        envelope ? 'version'
        AND envelope ? 'iterations'
        AND envelope ? 'salt'
        AND envelope ? 'nonce'
        AND envelope ? 'wrappedKey'
    )
);

ALTER TABLE public.vault_key_envelopes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own vault envelope" ON public.vault_key_envelopes;
CREATE POLICY "Users can view own vault envelope" ON public.vault_key_envelopes
    FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own vault envelope" ON public.vault_key_envelopes;
CREATE POLICY "Users can insert own vault envelope" ON public.vault_key_envelopes
    FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own vault envelope" ON public.vault_key_envelopes;
CREATE POLICY "Users can update own vault envelope" ON public.vault_key_envelopes
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own vault envelope" ON public.vault_key_envelopes;
CREATE POLICY "Users can delete own vault envelope" ON public.vault_key_envelopes
    FOR DELETE USING (user_id = auth.uid());
