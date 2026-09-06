/** @type {import('next').NextConfig} */
const FRAME_ANCESTORS = [
  "'self'",
  'https://atherium-admin.vercel.app',
  'https://atherium.cosmonova.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
].join(' ');

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  async redirects() {
    return [
      { source: '/gift', destination: '/shop', permanent: false },
      { source: '/gift/best', destination: '/shop', permanent: false },
      { source: '/gift/:id', destination: '/shop', permanent: false },
      // Do not redirect /seller or /seller/apply — those are real seller routes
      // and redirecting them to /shop/new caused an infinite loop.
    ];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: `frame-ancestors ${FRAME_ANCESTORS}`,
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
