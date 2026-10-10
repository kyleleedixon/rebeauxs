import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The dashboard is a private, server-rendered view. Nothing is exported statically.
  poweredByHeader: false,
};

export default nextConfig;
