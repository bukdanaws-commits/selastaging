import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // ─── Cloud Run / Docker Production Build ─────────────────────
  output: "standalone",

  // ─── Allowed Dev Origins (preview) ──────────────────────────
  allowedDevOrigins: [
    ".space-z.ai",
    "space-z.ai",
  ],

  // ─── Image Optimization (GCS + external) ─────────────────────
  images: {
    qualities: [75, 95],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "**.selevent.com",
      },
    ],
  },

  // ─── Experimental: Server Actions ────────────────────────────
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
