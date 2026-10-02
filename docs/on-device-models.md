# On-device model hosting

The notes embedding model (`Xenova/all-MiniLM-L6-v2`, quantized, about 23 MB of files) loads in the
browser from exactly one place. It never falls back to a third-party CDN.

- `NEXT_PUBLIC_MODEL_HOST` unset: files load from `/models/` in `apps/web/public/`.
- `NEXT_PUBLIC_MODEL_HOST` set: files load from `<host>/<model id>/<file>`, for example
  `https://models.example.com/Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx`. The host is also
  added to the CSP `connect-src`.

The ONNX runtime loads from the vendored copy in `public/ort/`. Speech transcription already uses
local files in `public/models/moonshine-tiny-ONNX/` and is unchanged.

## Hosting the files on Cloudflare R2

R2's free tier includes 10 GB of storage, 1 million Class A and 10 million Class B operations a month,
and free egress. The model files are about 23 MB. Cloudflare's community reports that R2 needs a payment
method on file, and Cloudflare's pricing page does not state a spending cap, so check your billing
settings. These steps were run against a real bucket with wrangler 4.146.0.

1. Log in and create the bucket.

   ```bash
   bunx wrangler login
   bunx wrangler r2 bucket create notechain-models
   ```

2. Download the files in the expected layout and upload them. Run the loop from inside `models-out`.

   ```bash
   bun scripts/models/fetch-models.ts ./models-out
   cd models-out
   for f in $(find . -type f | sed 's#^\./##'); do
     case "$f" in *.json) ct=application/json ;; *) ct=application/octet-stream ;; esac
     bunx wrangler r2 object put "notechain-models/$f" --file "$f" \
       --content-type "$ct" --cache-control "public, max-age=86400" --remote
   done
   ```

3. Allow your site's origin to read the files. Wrangler's format differs from the dashboard's. List every
   origin that will load models, including `http://localhost:3000` for development.

   ```json
   {
     "rules": [
       { "allowed": { "origins": ["https://your-app.example.com"], "methods": ["GET", "HEAD"] } }
     ]
   }
   ```

   ```bash
   bunx wrangler r2 bucket cors set notechain-models --file cors.json
   ```

4. Make the bucket publicly readable. The model files are public weights, so this exposes nothing private.
   - **Production.** Use a custom domain that is already on Cloudflare, for example `models.example.com`.
     The command is `bunx wrangler r2 bucket domain add notechain-models`. I have not run this one.
   - **Development only.** `bunx wrangler r2 bucket dev-url enable notechain-models` prints a
     `https://pub-<id>.r2.dev` URL. Cloudflare says r2.dev access is rate-limited and for development
     use only.

5. Set `NEXT_PUBLIC_MODEL_HOST` to the public origin in your environment and restart or redeploy. The value
   is inlined at build time. A browser load from a cold cache should request `config.json`,
   `tokenizer.json`, `tokenizer_config.json` and `onnx/model_quantized.onnx` from that host.

A browser only gets the files when its origin is in the CORS rule. A request from any other origin
receives no `Access-Control-Allow-Origin` header and is blocked.

To adopt a different model, add its files to `MODELS` in `scripts/models/fetch-models.ts` and set the
model id in the service config.
