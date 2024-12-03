/** @type {import("next").NextConfig} */

const nextConfig = {
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
