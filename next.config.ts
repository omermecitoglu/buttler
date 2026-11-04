import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  sassOptions: {
    silenceDeprecations: ["mixed-decls", "color-functions", "global-builtin", "import", "legacy-js-api"],
  },
  allowedDevOrigins: ["*.ngrok-free.app"],
  poweredByHeader: false,
  webpack: config => {
    config.externals.push("dockerode");
    return config;
  },
};

export default nextConfig;
