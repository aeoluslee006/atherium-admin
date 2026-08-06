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
      { source: '/seller', destination: '/shop/new', permanent: false },
      { source: '/seller/apply', destination: '/shop/new', permanent: false },
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
