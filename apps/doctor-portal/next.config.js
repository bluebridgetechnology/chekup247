/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@chekup247/design-tokens'],
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 31536000,
  },
  async rewrites() {
    return [
      {
        source: '/oidc/callback',
        destination: '/callback',
      },
    ];
  },
};

module.exports = nextConfig;

