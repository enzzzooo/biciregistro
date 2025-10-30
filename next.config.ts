import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'biciregistro.es',
      },
    ],
  },
};

export default nextConfig;
