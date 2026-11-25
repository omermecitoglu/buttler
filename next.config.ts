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
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "avatars.githubusercontent.com", pathname: "/u/**" },
    ],
  },
  poweredByHeader: false,
  // Do not add a robots.txt that disallows crawling, crawlers must be able to see this header
  headers: () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
      ],
    },
  ],
  serverExternalPackages: ["dockerode", "@grpc/grpc-js"],
};

export default withNextIntl(nextConfig);
