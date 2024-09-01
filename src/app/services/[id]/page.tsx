import { faCirclePlay } from "@fortawesome/free-solid-svg-icons/faCirclePlay";
import { faCircleStop } from "@fortawesome/free-solid-svg-icons/faCircleStop";
import LongColumn from "@omer-x/bs-ui-kit/LongColumn";
import PageTitle from "@omer-x/bs-ui-kit/PageTitle";
import SubmitButton from "@omer-x/bs-ui-kit/form/SubmitButton";
import { notFound } from "next/navigation";
import Table from "react-bootstrap/Table";
import { start, stop } from "~/actions/service";
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
  const buildImages = await getBuildImages(db, service.id, ["id", "status"]);

  return (
    <>
      <PageTitle name={service.name}>
        <BackButton fallback="/services" />
      </PageTitle>
      <Table>
        <tbody className="text-nowrap">
          <tr>
            <th className="with-colon pt-0">
              Git Repo
            </th>
            <LongColumn className="pt-0">
              {service.repo}
            </LongColumn>
          </tr>
          <tr>
            <th className="with-colon">
              Status
            </th>
            <td>
              <ServiceBadge status={service.status} />
            </td>
          </tr>
          <tr>
            <th className="with-colon">
              Current Image
            </th>
            <td>
              {service.imageId}
            </td>
          </tr>
          <tr>
            <th className="with-colon">
              Current Container
            </th>
            <td>
              {service.containerId}
            </td>
          </tr>
          <tr>
            <th className="with-colon">
              Ports
            </th>
            <td>
              {Object.keys(service.ports).length}
            </td>
          </tr>
          <tr>
            <th className="with-colon">
              Env. Variables
            </th>
            <td>
              {Object.keys(service.environmentVariables).length}
            </td>
          </tr>
          <tr>
            <th className="with-colon border-bottom-0 pb-0">
              Created at
            </th>
            <td className="border-bottom-0 pb-0">
              {new Date(service.createdAt).toLocaleDateString("tr-TR")}
            </td>
          </tr>
        </tbody>
      </Table>
      {service.containerId ? (
        <form className="my-3" action={stop.bind(null, service.id, service.containerId)}>
          <SubmitButton variant="danger" icon={faCircleStop} text="Stop" />
        </form>
      ) : (
        <form className="my-3" action={start.bind(null, service.id)}>
          <SubmitButton variant="success" icon={faCirclePlay} text="Start" />
        </form>
      )}
      {buildImages.length > 0 && (
        <>
          <PageTitle name="Build Images" secondary>
            &nbsp;
          </PageTitle>
          <BuildImageList collection={buildImages} />
        </>
      )}
    </>
  );
};

export default ShowServicePage;
