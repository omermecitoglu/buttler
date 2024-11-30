import SelectTheme from "@omer-x/bs-ui-kit/SelectTheme";
import React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { setGlobalVariable } from "~/actions/global-settings";
import InstantInput from "~/components/InstantInput";
import db from "~/database";

type SettingsPageProps = {
  params: {
    locale: string,
  },
};

const SettingsPage = async ({
  params: _params,
}: SettingsPageProps) => {
  const globalVariables = await db.query.globalVariables.findMany({});
  const megaUserName = globalVariables.find(v => v.key === "mega-username")?.value;
  const megaPassword = globalVariables.find(v => v.key === "mega-password")?.value;
  return (
    <Row className="row-gap-3">
      <Col md="4">
        <SelectTheme label="Theme" name="app-theme" />
      </Col>
      <Col md="4">
        <InstantInput
          title="Mega Username"
          defaultValue={megaUserName}
          action={setGlobalVariable.bind(null, "mega-username")}
        />
      </Col>
      <Col md="4">
        <InstantInput
          title="Mega Password"
          defaultValue={megaPassword}
          action={setGlobalVariable.bind(null, "mega-password")}
        />
      </Col>
    </Row>
  );
};

export default SettingsPage;
