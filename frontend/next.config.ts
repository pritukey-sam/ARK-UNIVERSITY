import type { NextConfig } from "next";

// Local backend URL (Render URL commented for local testing)
// const backendUrl = process.env.NEXT_PUBLIC_API_URL || "https://ark-university.onrender.com";
const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

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