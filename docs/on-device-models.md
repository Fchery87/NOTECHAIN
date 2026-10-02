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

R2's free tier includes 10 GB of storage and no egress fees. These steps were written from
Cloudflare's documentation and have not been run against a real bucket, so check the CORS format
against the current docs.

1. Download the files in the expected layout.

   ```bash
   bun scripts/models/fetch-models.ts ./models-out
   ```

2. Create an R2 bucket and make it publicly readable with a custom domain or the `r2.dev` URL.
3. Add a CORS rule that allows `GET` and `HEAD` from your site's origin.

   ```json
   [
     {
       "AllowedOrigins": ["https://your-app.example.com"],
       "AllowedMethods": ["GET", "HEAD"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 86400
     }
   ]
   ```

4. Upload the contents of `models-out/` to the bucket root so the keys read
   `Xenova/all-MiniLM-L6-v2/onnx/model_quantized.onnx` and so on.
5. Set `NEXT_PUBLIC_MODEL_HOST` to the bucket's public origin in your deployment environment and
   redeploy. The value is inlined at build time.

To adopt a different model, add its files to `MODELS` in `scripts/models/fetch-models.ts` and set the
model id in the service config.
