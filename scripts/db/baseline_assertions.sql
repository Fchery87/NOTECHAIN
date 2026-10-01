-- Behavior checks for a database built from supabase/migrations.
-- Run with psql against a scratch database. Fails loudly on the first problem.
\set ON_ERROR_STOP on
\set ua '11111111-1111-4111-8111-111111111111'
\set ub '22222222-2222-4222-8222-222222222222'
\set blob_a 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
\set blob_b 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'

BEGIN;

CREATE FUNCTION pg_temp.check(ok boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT coalesce(ok, false) THEN RAISE EXCEPTION 'FAIL: %', msg; END IF;
  RAISE NOTICE 'ok: %', msg;
END $$;

-- Everything the app calls exists.
SELECT pg_temp.check(to_regclass('public.' || t) IS NOT NULL, 'relation ' || t)
FROM unnest(ARRAY['profiles','encrypted_blobs','sync_operations','audit_logs','sync_metadata','admin_sessions']) AS t;
SELECT pg_temp.check(EXISTS (SELECT 1 FROM pg_proc WHERE proname = f AND pronamespace = 'public'::regnamespace), 'rpc ' || f)
FROM unnest(ARRAY['insert_sync_operation','update_user_status','update_user_role','revoke_user_session',
                  'revoke_all_user_sessions','get_user_sessions','get_user_growth',
                  'get_user_activity_metrics','get_storage_analytics']) AS f;
SELECT pg_temp.check((SELECT count(*) FROM pg_proc WHERE proname = 'insert_sync_operation'
                      AND pronamespace = 'public'::regnamespace) = 1,
                     'exactly one insert_sync_operation overload (no ambiguity)');

-- Signup creates a profile with a hashed email and the default role.
INSERT INTO auth.users (id, email, aud, role, instance_id)
VALUES (:'ua', 'a@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'),
       (:'ub', 'b@example.test', 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000');
SELECT pg_temp.check((SELECT count(*) FROM public.profiles WHERE id IN (:'ua', :'ub')) = 2, 'signup trigger created both profiles');
SELECT pg_temp.check((SELECT length(email_hash) FROM public.profiles WHERE id = :'ua') = 64, 'email stored only as a sha-256 hash');
SELECT pg_temp.check((SELECT role::text FROM public.profiles WHERE id = :'ua') = 'user', 'new profiles default to role user');

-- User A writes through the RPC.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'ua', 'role', 'authenticated')::text, true);
SELECT public.insert_sync_operation(:'ua', :'blob_a', 'note', 'create', 1, gen_random_uuid(),
       '\x01', '\x02', '\x03', gen_random_uuid(), '\x04') IS NOT NULL AS a_wrote \gset
SELECT count(*) AS a_sees FROM public.encrypted_blobs \gset
-- A cannot write for B.
DO $$ BEGIN
  PERFORM public.insert_sync_operation('22222222-2222-4222-8222-222222222222', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
          'note', 'create', 1, gen_random_uuid(), '\x01', '\x02', '\x03', gen_random_uuid(), '\x04');
  RAISE EXCEPTION 'cross-user write was allowed';
EXCEPTION WHEN others THEN
  IF SQLERRM = 'cross-user write was allowed' THEN RAISE; END IF;
END $$;
RESET ROLE;

-- User B writes, then each sees only their own data.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'ub', 'role', 'authenticated')::text, true);
SELECT public.insert_sync_operation(:'ub', :'blob_b', 'note', 'create', 1, gen_random_uuid(),
       '\x01', '\x02', '\x03', gen_random_uuid(), '\x04') IS NOT NULL AS b_wrote \gset
SELECT count(*) AS b_sees FROM public.encrypted_blobs \gset
SELECT count(*) AS b_sees_a FROM public.encrypted_blobs WHERE blob_uuid = :'blob_a' \gset
SELECT count(*) AS b_sees_profiles FROM public.profiles \gset
RESET ROLE;

-- Anonymous callers cannot reach the sync RPC.
SELECT has_function_privilege('anon', 'public.insert_sync_operation(uuid,uuid,varchar,varchar,int,uuid,bytea,bytea,bytea,uuid,bytea)', 'execute') AS anon_can_exec \gset

SELECT pg_temp.check(:'a_wrote'::boolean AND :'b_wrote'::boolean, 'each user can write their own sync operation');
SELECT pg_temp.check(:a_sees = 1, 'user A sees exactly their own blob');
SELECT pg_temp.check(:b_sees = 1 AND :b_sees_a = 0, 'user B cannot see user A''s blob (RLS)');
SELECT pg_temp.check(:b_sees_profiles = 1, 'user B sees only their own profile (RLS)');
SELECT pg_temp.check(NOT :'anon_can_exec'::boolean, 'anon cannot execute insert_sync_operation');

-- A regular user cannot promote themselves.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', :'ua', 'role', 'authenticated')::text, true);
DO $$ BEGIN
  UPDATE public.profiles SET role = 'admin' WHERE id = '11111111-1111-4111-8111-111111111111';
  RAISE EXCEPTION 'self-promotion was allowed';
EXCEPTION WHEN others THEN
  IF SQLERRM = 'self-promotion was allowed' THEN RAISE; END IF;
END $$;
RESET ROLE;
SELECT pg_temp.check((SELECT role::text FROM public.profiles WHERE id = :'ua') = 'user', 'role unchanged after self-promotion attempt');

ROLLBACK;
\echo ALL ASSERTIONS PASSED
