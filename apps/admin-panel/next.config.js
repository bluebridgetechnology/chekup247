/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  transpilePackages: ['@chekup247/design-tokens'],
};

module.exports = nextConfig;

