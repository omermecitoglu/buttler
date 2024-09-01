import { faCirclePlay } from "@fortawesome/free-solid-svg-icons/faCirclePlay";
import { faCircleStop } from "@fortawesome/free-solid-svg-icons/faCircleStop";
import PageTitle from "@omer-x/bs-ui-kit/PageTitle";
import SubmitButton from "@omer-x/bs-ui-kit/form/SubmitButton";
import { notFound } from "next/navigation";
import { start, stop } from "~/actions/service";
import BackButton from "~/components/BackButton";
import BuildImageList from "~/components/build-images/BuildImageList";
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
      <div>
        Created at
        {" "}
        {new Date(service.createdAt).toLocaleDateString("en-US")}
      </div>
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
