import type { NextConfig } from "next";

const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : "*.supabase.co";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  // Production builds use Turbopack. Local dev defaults to webpack + polling (see `npm run dev`)
  // because this repo lives on a separate disk partition and Turbopack's watcher spikes CPU/RAM.
  turbopack: {},
  webpack: (config, { dev }) => {
    if (dev && process.env.WATCHPACK_POLLING === "true") {
      config.watchOptions = {
        poll: 3000,
        aggregateTimeout: 600,
        ignored: [
          "**/node_modules/**",
          "**/.git/**",
          "**/.next/**",
        ],
      };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
  // Required when testing from phone via LAN IP (e.g. 192.168.8.188:3000)
  allowedDevOrigins: ["localhost", "127.0.0.1", "192.168.8.188"],
};

export default nextConfig;
