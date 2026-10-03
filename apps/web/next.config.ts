import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

const isCloudflareBuild = process.env.NOTECHAIN_TARGET === 'cloudflare';

const serverStub = './src/server-stub.ts';

const nextConfig: NextConfig = {
  // Stops `next dev` from rewriting the tracked apps/web/AGENTS.md on every start.
  agentRules: false,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000'],
    },
    optimizePackageImports: [
      '@tiptap/react',
      '@tiptap/starter-kit',
      '@supabase/supabase-js',
      'pdf-lib',
    ],
  },
  // Keep transformer packages out of server bundles. Browser modules must avoid
  // importing server-oriented transformer entry points at module boundaries.
  ...(isCloudflareBuild
    ? {
        // Workers cannot load the Node entries or native binaries of these packages.
        // The browser keeps the real modules and the server gets an inert stub.
        turbopack: {
          resolveAlias: {
            '@huggingface/transformers': {
              browser: '@huggingface/transformers',
              default: serverStub,
            },
            '@xenova/transformers': { browser: '@xenova/transformers', default: serverStub },
            'onnxruntime-node': { browser: 'onnxruntime-web', default: serverStub },
            sharp: { browser: serverStub, default: serverStub },
          },
        },
      }
    : { serverExternalPackages: ['@xenova/transformers', '@huggingface/transformers'] }),
  // Keep database credentials server-only. Do not inline any Neon credential
  // into the browser bundle.
  env: {},
  transpilePackages: ['@notechain/ui-components'],
  typescript: {
    ignoreBuildErrors: false,
  },
  outputFileTracingRoot: workspaceRoot,

  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
  },
  // Compression
  compress: true,
  // Production source maps (disable for smaller builds)
  productionBrowserSourceMaps: false,
  // Powered by header
  poweredByHeader: false,
};

// Bundle analyzer (conditional)
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
