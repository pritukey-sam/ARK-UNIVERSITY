import type { NextConfig } from "next";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://ark-university.onrender.com";

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: "500mb",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;