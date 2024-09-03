import { faCirclePlay } from "@fortawesome/free-solid-svg-icons/faCirclePlay";
import { faCircleStop } from "@fortawesome/free-solid-svg-icons/faCircleStop";
import { faScrewdriverWrench } from "@fortawesome/free-solid-svg-icons/faScrewdriverWrench";
import InfoTable from "@omer-x/bs-ui-kit/InfoTable";
import PageTitle from "@omer-x/bs-ui-kit/PageTitle";
import SubmitButton from "@omer-x/bs-ui-kit/form/SubmitButton";
import { notFound } from "next/navigation";
import { build, start, stop } from "~/actions/service";
import BackButton from "~/components/BackButton";
import BuildImageList from "~/components/build-images/BuildImageList";
import ServiceBadge from "~/components/services/ServiceBadge";
import db from "~/database";
import getBuildImages from "~/operations/getBuildImages";
import getService from "~/operations/getService";

type ShowServicePageProps = {
  params: {
    locale: string,
    id: string,
  },
};

const ShowServicePage = async ({
  params,
}: ShowServicePageProps) => {
  const service = await getService(db, params.id);
  if (!service) notFound();
  const buildImages = await getBuildImages(db, service.id, ["id", "status", "createdAt"]);

  return (
    <>
      <PageTitle name={service.name}>
        <BackButton fallback="/services" />
      </PageTitle>
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
      <div className="mt-3 d-flex gap-3">
        <form action={build.bind(null, service.id)}>
          <SubmitButton variant="primary" icon={faScrewdriverWrench} text="Build" />
        </form>
        {service.containerId ? (
          <form action={stop.bind(null, service.id, service.containerId)}>
            <SubmitButton variant="danger" icon={faCircleStop} text="Stop" />
          </form>
        ) : (
          <form action={start.bind(null, service.id)}>
            <SubmitButton variant="success" icon={faCirclePlay} text="Start" />
          </form>
        )}
      </div>
      {buildImages.length > 0 && (
        <>
          <div className="mt-3" />
          <PageTitle name="Build Images" secondary>
            &nbsp;
          </PageTitle>
          <BuildImageList collection={buildImages} currentImageId={service.imageId} />
        </>
      )}
    </>
  );
};

export default ShowServicePage;
