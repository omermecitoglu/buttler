import { connection } from "next/server";
import ExportServicesModal from "~/components/ExportServicesModal";
import { getAllServices } from "~/data/services";

/** System services are created by Buttler itself, so they can't be exported */
const ExportServices = async () => {
  await connection();
  const services = await getAllServices();
  return (
    <ExportServicesModal
      services={services.filter(({ type }) => type !== "system").map(({ id, name }) => ({ id, name }))}
    />
  );
};

export default ExportServices;
