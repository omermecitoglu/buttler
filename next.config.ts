import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
  },
  sassOptions: {
    silenceDeprecations: ["mixed-decls", "color-functions", "global-builtin", "import", "legacy-js-api"],
  },
  webpack: config => {
    config.externals.push("dockerode");
    return config;
  },
};

export default nextConfig;
