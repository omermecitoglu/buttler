import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Buttler",
  description: "makes your life easier",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
      { url: "/favicon-192x192.png", sizes: "192x192", type: "image/png" },
    ],
  },
};

type RootLayoutProps = {
  children: ReactNode,
};

const RootLayout = ({
  children,
}: RootLayoutProps) => (
  <html lang="en">
    <body>
      {children}
    </body>
  </html>
);

export default RootLayout;
