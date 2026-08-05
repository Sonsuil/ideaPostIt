import type { NextConfig } from "next";

const allowedIps = Array.from({ length: 256 }, (_, i) => `175.116.180.${i}`);

const nextConfig: NextConfig = {
  // Allow external IP access in development for the entire subnet
  allowedDevOrigins: allowedIps,
};

export default nextConfig;
