import { importServices } from "~/actions/service";
import ImportServicesModal from "~/components/ImportServicesModal";
import { requireUser } from "~/core/auth";

/** An import can add domains, so only the admin can see it. It reads the session, so it needs a `<Suspense>` boundary. */
const ImportServices = async () => {
  const user = await requireUser();
  if (user.role !== "admin") return null;
  return <ImportServicesModal action={importServices} />;
};

export default ImportServices;
