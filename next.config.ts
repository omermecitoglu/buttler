import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  allowedDevOrigins: ["*.ngrok-free.app"],
  poweredByHeader: false,
  serverExternalPackages: ["dockerode"],
};

export default nextConfig;
