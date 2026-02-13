import { WebSocketServer } from './WebSocketServer.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const server = new WebSocketServer({
  port: 3001,
  authValidator: async (token: string) => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      return user?.id ?? null;
    } catch {
      return null;
    }
  },
});

server.start();
console.log('WebSocket server running on port 3001');
