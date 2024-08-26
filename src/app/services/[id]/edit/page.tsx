import { faPlug } from "@fortawesome/free-solid-svg-icons/faPlug";
import { faTerminal } from "@fortawesome/free-solid-svg-icons/faTerminal";
import { FormWithState, SubmitButton } from "@omer-x/bs-ui-kit";
import PageTitle from "@omer-x/bs-ui-kit/PageTitle";
import { notFound } from "next/navigation";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { update } from "~/actions/service";
import BackButton from "~/components/BackButton";
import VariableEditor from "~/components/VariableEditor";
import ServiceForm from "~/components/services/ServiceForm";
import db from "~/database";
import getService from "~/operations/getService";

type EditServicePageProps = {
  params: {
    locale: string,
    id: string,
  },
};

const EditServicePage = async ({
  params,
}: EditServicePageProps) => {
  const service = await getService(db, params.id);
  if (!service) notFound();
  const environmentVariables = Object.fromEntries(service.environmentVariables.map(({ key, value }) => [key, value]));

  return (
    <>
      <PageTitle name="Edit Service">
        <BackButton fallback="/services" />
      </PageTitle>
      <FormWithState action={update.bind(null, service.id)}>
        <Row className="row-gap-3">
          <Col md="4" className="d-flex flex-column gap-3">
            <ServiceForm data={service} />
            <div>
              <SubmitButton text="Update" />
            </div>
          </Col>
          <Col md="4">
            <VariableEditor
              title="Ports"
              type="number"
              icon={faPlug}
              name="ports"
            />
          </Col>
          <Col md="4">
            <VariableEditor
              title="Environment Variables"
              icon={faTerminal}
              keyPlaceholder="e.g. CLIENT_KEY"
              name="env"
              defaultValue={environmentVariables}
            />
          </Col>
        </Row>
      </FormWithState>
    </>
  );
};

export default EditServicePage;