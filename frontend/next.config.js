const createNextIntlPlugin = require('next-intl/plugin');
const withNextIntl = createNextIntlPlugin('./src/i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: { ignoreBuildErrors: true },
  async rewrites() {
    const backend = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3000';
    return [
      { source: '/api/:path*', destination: `${backend}/api/:path*` },
    ];
  },
};

module.exports = withNextIntl(nextConfig);