# Running the WebSocket Server

The WebSocket server enables real-time collaboration features. It runs on port 3001.

## Prerequisites

You need your Supabase **Service Role Key**:

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Select your project
3. Go to **Settings → API**
4. Copy the **Service Role Key** (under "Project API keys")

## Running the Server

### Terminal 1 - WebSocket Server (port 3001)

```bash
cd packages/sync-engine
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key NEXT_PUBLIC_SUPABASE_URL=https://kryeeloydyfnqkesvdnp.supabase.co bun run start:ws
```

### Terminal 2 - Next.js App (port 3000)

```bash
cd apps/web
bun dev
```

## Quick Start (both commands together)

If you have bash available, you can run both in one terminal with backgrounding:

```bash
# Start WebSocket server in background
cd packages/sync-engine && SUPABASE_SERVICE_ROLE_KEY=your-key NEXT_PUBLIC_SUPABASE_URL=https://kryeeloydyfnqkesvdnp.supabase.co bun run start:ws &

# Start Next.js
cd apps/web && bun dev
```

## Environment Variables

The WebSocket server requires:

| Variable                    | Value                                      |
| --------------------------- | ------------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`  | `https://kryeeloydyfnqkesvdnp.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key             |

## Troubleshooting

**Port 3001 already in use:**

```bash
lsof -i :3001  # Find process
kill -9 <PID>  # Kill it
```

**Connection refused:** Make sure the WebSocket server is running before starting the Next.js app.
