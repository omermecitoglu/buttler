import SelectTheme from "@omer-x/bs-ui-kit/SelectTheme";
import React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";

type SettingsPageProps = {
  params: {
    locale: string,
  },
};

const SettingsPage = ({
  params: _params,
}: SettingsPageProps) => {
  return (
    <Row className="row-gap-3">
      <Col md="4">
        <SelectTheme label="Theme" name="app-theme" />
      </Col>
    </Row>
  );
};

export default SettingsPage;
