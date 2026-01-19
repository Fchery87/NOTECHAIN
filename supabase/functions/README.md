# Supabase Edge Functions

This directory contains Supabase Edge Functions for server-side logic.

## Functions

Currently empty - functions will be added for:

- Webhooks (e.g., Stripe, calendar integrations)
- Push notification delivery
- Cross-device sync coordination
- Email notifications

## Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy function-name
```

## Local Development

```bash
# Start local Supabase (includes Edge Function emulator)
bun run supabase:start

# Test functions locally
curl -H "Authorization: Bearer $ANON_KEY" http://localhost:54321/functions/v1/function-name
```

## Structure

```
functions/
├── function-name/
│   ├── index.ts          # Function entry point
│   └── README.md         # Function documentation
```

## Environment Variables

See `.env.example` in the root for required environment variables.
