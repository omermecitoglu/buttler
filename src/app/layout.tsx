import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

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
    <body data-theme="dark">
      <div className="flex h-screen">
        {/* Sidebar placeholder */}
        <aside className="flex w-60 shrink-0 flex-col">
          {/* Logo / branding */}
          <div className="flex h-16 shrink-0 items-center px-4">
            <span className="text-lg font-semibold tracking-tight">Buttler</span>
          </div>
          {/* Nav links placeholder */}
          <nav className="flex flex-1 flex-col gap-1 px-2 py-2">
            {/* nav items will go here */}
          </nav>
          {/* Avatar / user section placeholder */}
          <div className="flex h-16 shrink-0 items-center gap-3 px-4">
            {/* avatar + username will go here */}
          </div>
        </aside>
        {/* Main content area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header placeholder */}
          <header className="flex h-16 shrink-0 items-center justify-between px-6">
            {/* page title / breadcrumb placeholder */}
            <div />
            {/* header actions placeholder */}
            <div />
          </header>
          {/* Page content */}
          <main className="flex-1 overflow-y-auto px-6 py-4">
            {children}
          </main>
        </div>
      </div>
    </body>
  </html>
);

export default RootLayout;
