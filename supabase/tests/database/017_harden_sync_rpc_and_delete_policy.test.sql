BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET search_path TO public, extensions;

SELECT plan(6);

-- Fixed test identities keep the assertions deterministic.
SELECT '11111111-1111-4111-8111-111111111111'::uuid AS user_a_id \gset
SELECT '22222222-2222-4222-8222-222222222222'::uuid AS user_b_id \gset
SELECT 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid AS note_a_id \gset
SELECT 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid AS note_b_id \gset
SELECT '33333333-3333-4333-8333-333333333333'::uuid AS session_id \gset
SELECT '44444444-4444-4444-8444-444444444444'::uuid AS key_id \gset

-- Seed auth/profile rows as privileged test setup. Keep conflict-safe so the
-- test can be re-run against a reused local database.
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at
) VALUES
    ('00000000-0000-0000-0000-000000000000', :'user_a_id', 'authenticated', 'authenticated', 'rls-user-a@example.test', '', NOW(), NOW(), NOW()),
    ('00000000-0000-0000-0000-000000000000', :'user_b_id', 'authenticated', 'authenticated', 'rls-user-b@example.test', '', NOW(), NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (id, email_hash, encrypted_profile)
VALUES
    (:'user_a_id', 'rls-user-a-hash', decode('aa', 'hex')),
    (:'user_b_id', 'rls-user-b-hash', decode('bb', 'hex'))
ON CONFLICT (id) DO NOTHING;

-- User A can write their own sync operation through the SECURITY DEFINER RPC.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'user_a_id', true);

SELECT lives_ok(
    format(
        $sql$
        SELECT public.insert_sync_operation(
            %L::uuid,
            %L::uuid,
            'note'::varchar,
            'create'::varchar,
            1::integer,
            %L::uuid,
            decode('abcd', 'hex'),
            decode('000000000000000000000000000000000000000000000000', 'hex'),
            decode('11111111111111111111111111111111', 'hex'),
            %L::uuid,
            decode('2222', 'hex')
        )
        $sql$,
        :'user_a_id', :'note_a_id', :'session_id', :'key_id'
    ),
    'authenticated user can insert their own sync operation'
);

-- User A cannot write a sync operation for User B.
SELECT throws_ok(
    format(
        $sql$
        SELECT public.insert_sync_operation(
            %L::uuid,
            %L::uuid,
            'note'::varchar,
            'create'::varchar,
            1::integer,
            %L::uuid,
            decode('abcd', 'hex'),
            decode('000000000000000000000000000000000000000000000000', 'hex'),
            decode('11111111111111111111111111111111', 'hex'),
            %L::uuid,
            decode('2222', 'hex')
        )
        $sql$,
        :'user_b_id', :'note_b_id', :'session_id', :'key_id'
    ),
    'P0001',
    'not authorized to write sync operations for this user',
    'authenticated user cannot insert sync operation for another user'
);

-- Anonymous callers must not be able to execute the RPC at all.
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub', '', true);

SELECT throws_ok(
    format(
        $sql$
        SELECT public.insert_sync_operation(
            %L::uuid,
            %L::uuid,
            'note'::varchar,
            'create'::varchar,
            1::integer,
            %L::uuid,
            decode('abcd', 'hex'),
            decode('000000000000000000000000000000000000000000000000', 'hex'),
            decode('11111111111111111111111111111111', 'hex'),
            %L::uuid,
            decode('2222', 'hex')
        )
        $sql$,
        :'user_a_id', :'note_a_id', :'session_id', :'key_id'
    ),
    '42501',
    'anon cannot execute sync RPC'
);

RESET ROLE;

-- Seed one blob for User B to test delete RLS.
INSERT INTO public.encrypted_blobs (
    user_id,
    blob_uuid,
    blob_type,
    operation_type,
    version,
    session_id,
    ciphertext,
    nonce,
    auth_tag,
    key_id,
    metadata_hash
) VALUES (
    :'user_b_id',
    :'note_b_id',
    'note',
    'create',
    1,
    :'session_id',
    decode('abcd', 'hex'),
    decode('000000000000000000000000000000000000000000000000', 'hex'),
    decode('11111111111111111111111111111111', 'hex'),
    :'key_id',
    decode('2222', 'hex')
)
ON CONFLICT DO NOTHING;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', :'user_a_id', true);

DELETE FROM public.encrypted_blobs WHERE user_id = :'user_b_id' AND blob_uuid = :'note_b_id';
SELECT is(
    (SELECT COUNT(*)::integer FROM public.encrypted_blobs WHERE user_id = :'user_b_id' AND blob_uuid = :'note_b_id'),
    1,
    'authenticated user cannot delete another user encrypted blob'
);

DELETE FROM public.encrypted_blobs WHERE user_id = :'user_a_id' AND blob_uuid = :'note_a_id';
SELECT is(
    (SELECT COUNT(*)::integer FROM public.encrypted_blobs WHERE user_id = :'user_a_id' AND blob_uuid = :'note_a_id'),
    0,
    'authenticated user can delete their own encrypted blob'
);

SELECT is(
    (SELECT COUNT(*)::integer FROM public.encrypted_blobs WHERE user_id = :'user_b_id' AND blob_uuid = :'note_b_id'),
    1,
    'other user encrypted blob remains after own delete'
);

SELECT * FROM finish();

ROLLBACK;
