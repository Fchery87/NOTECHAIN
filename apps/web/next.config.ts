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
  // Externalize @xenova/transformers to avoid webpack bundling issues
  // This prevents "Cannot convert undefined or null to object" errors
  serverExternalPackages: ['@xenova/transformers'],
  env: {
    NEXT_PUBLIC_NEON_DATABASE_URL: process.env.NEXT_PUBLIC_NEON_DATABASE_URL,
    NEON_PRIVATE_KEY: process.env.NEON_PRIVATE_KEY,
  },
  transpilePackages: ['@notechain/ui-components'],
  typescript: {
    ignoreBuildErrors: false,
  },
  // Turbopack configuration (Next.js 16 default)
  // Note: Turbopack has different optimization options than webpack
  // For now, using default Turbopack optimizations
  turbopack: {
    // Module resolution rules can be added here
    rules: {
      // Add any Turbopack-specific rules here
    },
  },

  // Webpack fallback for custom optimizations
  webpack: (config, { isServer }) => {
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
