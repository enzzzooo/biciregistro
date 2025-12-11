import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
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
