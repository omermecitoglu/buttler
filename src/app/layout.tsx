import "~/styles/custom-bootstrap.scss";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import ThemedBody from "@omer-x/bs-ui-kit/ThemedBody";
import Image from "next/image";
import Link from "next/link";
import React, { type ReactNode } from "react";
import CardBody from "react-bootstrap/CardBody";
import Container from "react-bootstrap/Container";
import logo from "~/assets/logo.png";
import Tabs from "~/components/Tabs";
import type { Metadata } from "next";

config.autoAddCss = false;

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
    <ThemedBody>
      <Container as="main" className="py-3">
        <div className="d-flex justify-content-center mb-3">
          <Link href="/">
            <Image
              src={logo}
              alt="logo"
              width={80}
              height={80}
              style={{ marginBottom: -40 }}
            />
          </Link>
        </div>
        <Tabs />
        <div className="rounded-bottom border-start border-end border-bottom shadow p-3">
          <CardBody style={{ minHeight: "calc(100vh - 163px)" }}>
            {children}
          </CardBody>
        </div>
      </Container>
    </ThemedBody>
  </html>
);

export default RootLayout;
