import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { NextConfig } from 'next';

const workspaceRoot = join(dirname(fileURLToPath(import.meta.url)), '../..');

const nextConfig: NextConfig = {
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
  serverExternalPackages: ['@xenova/transformers', '@huggingface/transformers'],
  env: {
    NEXT_PUBLIC_NEON_DATABASE_URL: process.env.NEXT_PUBLIC_NEON_DATABASE_URL,
    NEON_PRIVATE_KEY: process.env.NEON_PRIVATE_KEY,
  },
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
