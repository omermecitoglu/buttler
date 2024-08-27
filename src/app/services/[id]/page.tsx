import PageTitle from "@omer-x/bs-ui-kit/PageTitle";
import classNames from "classnames";
import { notFound } from "next/navigation";
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
  const buildImages = await getBuildImages(db, ["id"]);

  return (
    <>
      <PageTitle name={service.name}>
        <BackButton fallback="/services" />
      </PageTitle>
      <div className={classNames(buildImages.length > 0 && "mb-3")}>
        Created at
        {" "}
        {new Date(service.createdAt).toLocaleDateString("en-US")}
      </div>
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
