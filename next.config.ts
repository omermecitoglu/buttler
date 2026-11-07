import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  experimental: {
    authInterrupts: true,
  },
  allowedDevOrigins: ["*.ngrok-free.app"],
  poweredByHeader: false,
  serverExternalPackages: ["dockerode"],
};

export default withNextIntl(nextConfig);
