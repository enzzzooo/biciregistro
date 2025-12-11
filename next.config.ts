import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from our proxy API route and external sources
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'biciregistro.es',
      },
      {
        protocol: 'https',
        hostname: 'www.biciregistro.es',
      },
    ],
    // Allow local proxy API route with query parameters
    localPatterns: [
      {
        pathname: '/api/proxy-image',
        search: '**',
      },
    ],
  },
};

export default nextConfig;
