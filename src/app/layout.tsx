import "~/styles/custom-bootstrap.scss";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import React, { type ReactNode } from "react";
import Container from "react-bootstrap/Container";

config.autoAddCss = false;

type RootLayoutProps = {
  children: ReactNode,
};

const RootLayout = ({
  children,
}: RootLayoutProps) => (
  <html lang="en">
    <body>
      <Container as="main">
        {children}
      </Container>
    </body>
  </html>
);

export default RootLayout;
