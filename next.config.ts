import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */

  // Additional security headers (augmenting middleware)
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
