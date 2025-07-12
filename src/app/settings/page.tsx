import PageSection from "@omer-x/bs-ui-kit/PageSection";
import SelectTheme from "@omer-x/bs-ui-kit/SelectTheme";
import { ProgressiveForm, SubmitButton } from "@omer-x/bs-ui-kit/form";
import SmartForm from "@omer-x/bs-ui-kit/form/SmartForm";
import React from "react";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { updateConfigs } from "~/actions/configuration";
import { setGlobalVariable } from "~/actions/global-settings";
import InstantInput from "~/components/InstantInput";
import { configSchema, getConfigs } from "~/core/config";
import db from "~/database";

type SettingsPageProps = {
  params: Promise<{ locale: string }>,
};

const SettingsPage = async ({
  params: _params,
}: SettingsPageProps) => {
  const [
    currentConfigs,
    globalVariables,
  ] = await Promise.all([
    getConfigs(),
    db.query.globalVariables.findMany({}),
  ]);
  const megaUserName = globalVariables.find(v => v.key === "mega-username")?.value;
  const megaPassword = globalVariables.find(v => v.key === "mega-password")?.value;
  return (
    <>
      <Row className="row-gap-3 mb-3">
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
      <PageSection title="System" secondary toolbar={(<></>)} >
        <ProgressiveForm action={updateConfigs}>
          <SmartForm
            schema={configSchema}
            defaultValues={currentConfigs}
            properties={{
              sslCertificate: {
                label: "SSL Certificate",
                gridSize: { md: 4 },
                lines: 5,
              },
              sslCertificateKey: {
                label: "SSL Certificate Key",
                gridSize: { md: 4 },
                lines: 5,
              },
              sslClientCertificate: {
                label: "SSL Client Certificate",
                gridSize: { md: 4 },
                lines: 5,
              },
            }}
          />
          <div>
            <SubmitButton text="Save" />
          </div>
        </ProgressiveForm>
      </PageSection>
    </>
  );
};

export default SettingsPage;
