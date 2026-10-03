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

## Verified on the deployed Worker

Production runs at `https://notechain-web.myfixcredit.workers.dev`.

- Google sign-in, the `/auth/callback` redirect, and Supabase sync work.
- Private Mode loads the Moonshine model from the R2 model host and reports it loaded.
- Cloudflare accepted the bundle, so global-scope startup is under the 1 second limit. The exact time has not been measured.

## Not verified

- `RedisRateLimiter` against a real Redis from Workers. Without `REDIS_URL`, the PRD builder rate limiter rejects every request in production, and other rate limiting falls back to per-isolate memory.
- A full recording and saved transcript on the deployed Worker. The model load is verified. Recording was verified on the local dev server.
- Real-time Mode. It uses the browser's Web Speech API, and a `network` error from it comes from the browser's speech service, not from the Worker.

## Production deploy

From `apps/web`, with `apps/web/.env.local` holding the real `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_MODEL_HOST`:

1. Run `bun run build:packages` from the repo root, then `bun run build:cloudflare`.
2. On the first deploy, pass `CSRF_SECRET` with `bunx wrangler deploy --secrets-file <file>`, where the file holds `CSRF_SECRET=<long random value>`. Later deploys run `bunx wrangler deploy` and keep the secret. Do not pass `--message` with spaces through this command, because Wrangler splits it into extra arguments.
3. Add the Worker origin to the R2 bucket CORS rule.
4. Add `https://<worker-host>/**` to Supabase redirect URLs, as described in the Preview runbook below.

Two things the build depends on:

- `/ort/*` is served by Workers Static Assets without running the Worker, so it misses the proxy's headers. `apps/web/public/_headers` gives it `Cross-Origin-Embedder-Policy: require-corp`. Without that, the cross-origin isolated pages refuse to start ONNX Runtime's worker threads and Private Mode stalls.
- The production CSP allows `'wasm-unsafe-eval'` so the on-device models can compile WebAssembly.

To take production down, run `bunx wrangler delete notechain-web`.

## Preview deploy runbook

A Worker Preview is a separate deployment under the same Worker. It does not touch production. The Worker has no bindings besides static assets, so a Preview shares no data with anything.

Before the first run, from `apps/web`:

1. Log in with `bunx wrangler login` and check the account with `bunx wrangler whoami`.
2. Build with the real public values. `NEXT_PUBLIC_*` values are inlined at build time, so `apps/web/.env.local` must hold `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `NEXT_PUBLIC_MODEL_HOST`. Run `bun run build:packages` from the repo root first.
3. Deploy with `bun run deploy:preview -- --name <preview-name>`. It builds, then runs `wrangler preview`. The name defaults to the current Git branch.
4. Set the server secret. `CSRF_SECRET` is required in production and the Worker runs with `NODE_ENV=production`. Run `bunx wrangler preview secret put CSRF_SECRET --name <preview-name>` and paste a long random value. Every secret put creates a new deployment.

After the first deploy, `wrangler preview` prints a Preview URL. Then:

- Add the Preview origin to the R2 bucket CORS rule, or the model downloads fail.
- Add `https://<preview-host>/**` to Supabase Authentication, URL Configuration, redirect URLs, as an extra entry next to the localhost ones. An exact `/auth/callback` entry does not work. The app sends `redirectTo` as `/auth/callback?redirect=<path>`, an exact entry does not match a URL with a query string, and Supabase then falls back to the Site URL, so login lands on `http://localhost:3000`. Leave the Site URL alone until there is a production URL. Google sign-in also needs the Supabase callback URL in the Google OAuth client, which does not change.
- Treat the Preview URL as public. Anyone with the link can load the app. Add Cloudflare Access in front of it if that matters.

Known behavior on a Preview:

- Without `REDIS_URL`, the PRD builder rate limiter rejects every request in production. Other rate limiting falls back to per-isolate memory, which is not shared across requests served by different isolates.
- `/auth/login` is the login route.

To remove a Preview and its deployments, run `bunx wrangler preview delete --name <preview-name>`.
