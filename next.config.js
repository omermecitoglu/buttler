/** @type {import("next").NextConfig} */

const nextConfig = {
  output: "standalone",
  experimental: {
    instrumentationHook: true,
  },
  webpack: config => {
    config.externals.push("dockerode");
    return config;
  },
};

export default nextConfig;
