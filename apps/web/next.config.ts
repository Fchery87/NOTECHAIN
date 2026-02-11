import type { NextConfig } from 'next';

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
  env: {
    NEXT_PUBLIC_NEON_DATABASE_URL: process.env.NEXT_PUBLIC_NEON_DATABASE_URL,
    NEON_PRIVATE_KEY: process.env.NEON_PRIVATE_KEY,
  },
  transpilePackages: ['@notechain/ui-components'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Bundle optimization
  webpack: (config, { isServer, nextRuntime }) => {
    // Optimize bundle size
    if (!isServer) {
      // Split chunks for better caching
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for node_modules
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
            },
            // AI features chunk
            ai: {
              test: /[\\/](ai|intelligence)[\\/]/i,
              name: 'ai-features',
              chunks: 'async',
              priority: 20,
            },
            // Editor chunk
            editor: {
              test: /[\\/](tiptap|editor)[\\/]/i,
              name: 'editor',
              chunks: 'async',
              priority: 20,
            },
            // PDF chunk
            pdf: {
              test: /[\\/](pdf|pdf-lib)[\\/]/i,
              name: 'pdf-features',
              chunks: 'async',
              priority: 20,
            },
          },
        },
      };
    }

    return config;
  },
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
