import PageTitle from "@omer-x/bs-ui-kit/PageTitle";
import { notFound } from "next/navigation";
import BackButton from "~/components/BackButton";
import db from "~/database";
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

  return (
    <>
      <PageTitle name={service.name}>
        <BackButton fallback="/services" />
      </PageTitle>
      Created at
      {" "}
      {new Date(service.createdAt).toLocaleDateString("en-US")}
    </>
  );
};

export default ShowServicePage;
