# Cloudflare Workers build

The web app can be built for Cloudflare Workers with OpenNext. This is a preview path. It has been built and served locally, and it has not been deployed.

## Build and preview

```bash
bun run build:packages                       # workspace packages must have dist/ first
cd apps/web
bun run build:cloudflare                     # writes .open-next/
bun run preview:cloudflare                   # serves the Worker locally with wrangler
```

`build:cloudflare` sets `NOTECHAIN_TARGET=cloudflare`. Without it, `next build` and `next dev` behave as before.

## What the Cloudflare target changes

- `@huggingface/transformers`, `@xenova/transformers`, `onnxruntime-node` and `sharp` resolve to `src/server-stub.ts` on the server. The browser keeps the real modules, so on-device models still load in the page. Workers cannot load their Node entries or native `.node` binaries.
- `wrangler.jsonc` turns on `nodejs_compat` and serves `.open-next/assets` as static assets.

## Measured on a local build

- Worker script is 15.0 MB uncompressed and 3.58 MiB gzip. Cloudflare's limits page lists 64 MiB uncompressed on both Workers Free and Paid, with no compressed size limit.
- Largest static asset is the ONNX Runtime wasm at 20.6 MiB, under the 25 MiB per-file limit.
- `proxy.ts` runs on Workers. Responses carry the nonce-based CSP, and protected routes redirect to `/auth/login`.

## Not verified

- Supabase auth, sync and OAuth through the Worker.
- `RedisRateLimiter` against a real Redis from Workers.
- A real recording with the on-device speech model through this build.
- Worker startup time. Cloudflare limits global-scope startup to 1 second, and this bundle has not been deployed to measure it.
- Any deployment.

## Deploying

Set the same environment variables as the Node deployment (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `CSRF_SECRET`, `NEXT_PUBLIC_MODEL_HOST`). Add the Worker's origin to the R2 bucket CORS rule. Then run `bunx wrangler deploy` from `apps/web`.
