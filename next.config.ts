import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Allow images from external sources (for placeholder/fallback images)
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
  },
};

export default nextConfig;
