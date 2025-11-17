// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ocnwgqubliyaysbnfgyv.supabase.co", // your Supabase project host
      },
    ],
    domains: ["ocnwgqubliyaysbnfgyv.supabase.co"],
  },
};

export default nextConfig;
