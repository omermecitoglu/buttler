import { faCirclePlay } from "@fortawesome/free-solid-svg-icons/faCirclePlay";
import { faCircleStop } from "@fortawesome/free-solid-svg-icons/faCircleStop";
import { faDatabase } from "@fortawesome/free-solid-svg-icons/faDatabase";
import { faFloppyDisk } from "@fortawesome/free-solid-svg-icons/faFloppyDisk";
import { faNetworkWired } from "@fortawesome/free-solid-svg-icons/faNetworkWired";
import { faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons/faScrewdriverWrench";
import InfoTable from "@omer-x/bs-ui-kit/InfoTable";
import LinkButton from "@omer-x/bs-ui-kit/LinkButton";
import PageSection from "@omer-x/bs-ui-kit/PageSection";
import SubmitButton from "@omer-x/bs-ui-kit/form/SubmitButton";
import Link from "next/link";
import { notFound } from "next/navigation";
import Col from "react-bootstrap/Col";
import Row from "react-bootstrap/Row";
import { backup } from "~/actions/database";
import { build, start, stop } from "~/actions/service";
import BackButton from "~/components/BackButton";
import ContainerLogs from "~/components/ContainerLogs";
import BuildImageList from "~/components/build-images/BuildImageList";
import ServiceBadge from "~/components/services/ServiceBadge";
import db from "~/database";
import getBuildImages from "~/operations/getBuildImages";
import getService from "~/operations/getService";

type ShowServicePageProps = {
  params: Promise<{ locale: string, id: string }>,
};

const ShowServicePage = async ({
  params,
}: ShowServicePageProps) => {
  const { id: serviceId } = await params;
  const service = await getService(db, serviceId);
  if (!service) notFound();
  const buildImages = await getBuildImages(db, service.id, ["id", "status", "errorCode", "createdAt"]);
  const readyImages = buildImages.filter(image => image.status === "ready");

  return (
    <>
      <PageSection
        title={service.name}
        toolbar={<BackButton fallback="/services" />}
      >
        <Row className="row-gap-3">
          <Col {...(service.kind !== "database" ? { md: 8, lg: 9 } : {})}>
            <InfoTable
              source={service}
              primaryKey="id"
              schema={{
                repo: {
                  header: "Git Repo",
                  long: true,
                },
                status: {
                  header: "Status",
                  wrapper: status => <ServiceBadge status={status} />,
                },
                imageId: {
                  header: "Current Image",
                  long: true,
                },
                containerId: {
                  header: "Current Container",
                  wrapper: containerId => (
                    <>{containerId && <ContainerLogs containerId={containerId} />}</>
                  ),
                  long: true,
                },
                ports: {
                  header: "Ports",
                  wrapper: record => Object.keys(record).length,
                },
                environmentVariables: {
                  header: "Env. Variables",
                  wrapper: record => Object.keys(record).length,
                },
                createdAt: {
                  header: "Created at",
                  wrapper: date => (
                    <span>
                      {new Date(date).toLocaleDateString("tr-TR")}
                      {" • "}
                      {new Date(date).toLocaleTimeString("tr-TR")}
                    </span>
                  ),
                },
              }}
            />
          </Col>
          {service.kind !== "database" && (
            <Col md="4" lg="3">
              <div className="d-grid gap-3">
                <LinkButton
                  as={Link}
                  icon={faDatabase}
                  href={`/services/${serviceId}/databases`}
                  text="Databases"
                  variant="secondary"
                  size="sm"
                  stretched
                />
                <LinkButton
                  as={Link}
                  icon={faNetworkWired}
                  href={`/services/${serviceId}/networks`}
                  text="Networks"
                  variant="secondary"
                  size="sm"
                  stretched
                />
              </div>
            </Col>
          )}
        </Row>
        <div className="d-flex gap-3 bg-primary-subtle p-3 mt-3 mx-n3 border-top border-bottom border-primary-subtle">
          {service.kind === "git" && (
            <form action={build.bind(null, service.id)}>
              <SubmitButton variant="primary" icon={faScrewdriverWrench} text="Build" />
            </form>
          )}
          {service.containerId && (
            <form action={stop.bind(null, service.id, service.containerId)}>
              <SubmitButton variant="danger" icon={faCircleStop} text="Stop" />
            </form>
          )}
          {!service.containerId && (service.kind === "database" || readyImages.length > 0) && (
            <form action={start.bind(null, service.id)}>
              <SubmitButton variant="success" icon={faCirclePlay} text="Start" />
            </form>
          )}
          {service.kind === "database" && service.containerId && (
            <form action={backup.bind(null, service.id)}>
              <SubmitButton variant="success" icon={faFloppyDisk} text="Backup" />
            </form>
          )}
        </div>
      </PageSection>
      {buildImages.length > 0 && (
        <>
          <div className="mt-3" />
          <PageSection title="Build Images" secondary>
            <BuildImageList collection={buildImages} currentImageId={service.imageId} />
          </PageSection>
        </>
      )}
    </>
  );
};

export default ShowServicePage;
