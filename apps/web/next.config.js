/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000"],
    },
  },
  env: {
    NEXT_PUBLIC_NEON_DATABASE_URL: process.env.NEXT_PUBLIC_NEON_DATABASE_URL,
    NEON_PRIVATE_KEY: process.env.NEON_PRIVATE_KEY,
  },
  // Tailwind v4 compatibility
  transpilePackages: ["@notechain/ui-components"],
};

module.exports = nextConfig;
