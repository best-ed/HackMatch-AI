import type { NextConfig } from "next";
import { securityHeadersForNextConfig } from "./lib/security-headers";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return securityHeadersForNextConfig();
  }
};

export default nextConfig;
