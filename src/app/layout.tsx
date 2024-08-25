import "~/styles/custom-bootstrap.scss";
import "@fortawesome/fontawesome-svg-core/styles.css";
import { config } from "@fortawesome/fontawesome-svg-core";
import React, { type ReactNode } from "react";
import CardBody from "react-bootstrap/CardBody";
import Container from "react-bootstrap/Container";
import Tabs from "~/components/Tabs";

config.autoAddCss = false;

type RootLayoutProps = {
  children: ReactNode,
};

const RootLayout = ({
  children,
}: RootLayoutProps) => (
  <html lang="en">
    <body>
      <Container as="main" className="pt-3">
        <Tabs />
        <div className="rounded-bottom border-start border-end border-bottom shadow p-3">
          <CardBody>
            {children}
          </CardBody>
        </div>
      </Container>
    </body>
  </html>
);

export default RootLayout;
