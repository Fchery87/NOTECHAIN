import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), 'apps/web/.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
  console.log('Testing insert_sync_operation RPC...');

  const payload = {
    p_user_id: 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929',
    p_entity_id: 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929', // Using user ID as dummy entity ID
    p_entity_type: 'note',
    p_operation_type: 'create',
    p_version: 1,
    p_session_id: 'e3b76c7b-1691-4f69-81f1-58e0bfaf8929',
    p_ciphertext: '\\x' + Buffer.from(new Uint8Array(32)).toString('hex'),
    p_nonce: '\\x' + Buffer.from(new Uint8Array(24)).toString('hex'),
    p_auth_tag: '\\x' + Buffer.from(new Uint8Array(16)).toString('hex'),
    p_key_id: '00000000-0000-0000-0000-000000000000',
    p_metadata_hash: '\\x' + Buffer.from(new Uint8Array(32)).toString('hex'),
  };

  try {
    const { data, error } = await supabase.rpc('insert_sync_operation', payload);

    if (error) {
      console.error('RPC Error:', error);
    } else {
      console.log('RPC Success! Data:', data);
    }
  } catch (err) {
    console.error('System Error:', err);
  }
}

testRpc();
