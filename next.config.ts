import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    authInterrupts: true,
  },
  allowedDevOrigins: ["*.ngrok-free.app"],
  poweredByHeader: false,
  serverExternalPackages: ["dockerode"],
};

export default withNextIntl(nextConfig);
