import { faPlug } from "@fortawesome/free-solid-svg-icons/faPlug";
import { faTerminal } from "@fortawesome/free-solid-svg-icons/faTerminal";
import PageSection from "@omer-x/bs-ui-kit/PageSection";
import ProgressiveForm from "@omer-x/bs-ui-kit/form/ProgressiveForm";
import SubmitButton from "@omer-x/bs-ui-kit/form/SubmitButton";
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

  return (
    <PageSection title="Edit Service" toolbar={<BackButton fallback="/services" />}>
      <ProgressiveForm action={update.bind(null, service.id)}>
        <Row className="row-gap-3">
          <Col md="6" className="d-flex flex-column gap-3">
            <ServiceForm data={service} />
            <VariableEditor
              title="Ports"
              type="number"
              icon={faPlug}
              keyPlaceholder="external"
              valuePlaceholder="internal"
              name="ports"
              defaultValue={service.ports}
            />
            <div>
              <SubmitButton text="Update" />
            </div>
          </Col>
          <Col md="6">
            <VariableEditor
              title="Environment Variables"
              icon={faTerminal}
              keyPlaceholder="e.g. CLIENT_KEY"
              name="env"
              defaultValue={service.environmentVariables}
            />
          </Col>
        </Row>
      </ProgressiveForm>
    </PageSection>
  );
};

export default EditServicePage;
