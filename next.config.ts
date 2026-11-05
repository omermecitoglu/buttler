import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  allowedDevOrigins: ["*.ngrok-free.app"],
  poweredByHeader: false,
  webpack: config => {
    config.externals.push("dockerode");
    return config;
  },
};

export default nextConfig;
