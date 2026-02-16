import { WebSocketServer } from './WebSocketServer.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const isDevelopment = process.env.NODE_ENV !== 'production' || !supabaseServiceKey;

if (!supabaseUrl) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL must be set');
  process.exit(1);
}

const supabase = supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

const server = new WebSocketServer({
  port: 3001,
  authValidator: async (token: string) => {
    if (isDevelopment && !supabase) {
      console.warn('[Dev Mode] Skipping auth - no service key');
      return token || 'dev-user';
    }
    try {
      const {
        data: { user },
      } = await supabase!.auth.getUser(token);
      return user?.id ?? null;
    } catch {
      return null;
    }
  },
});

server.start();
console.log(
  `WebSocket server running on port 3001 (${isDevelopment ? 'development' : 'production'} mode)`
);
