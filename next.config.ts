import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'biciregistro.es',
      },
    ],
    unoptimized: false, // Allow Next.js to optimize images
  },
};

export default nextConfig;
