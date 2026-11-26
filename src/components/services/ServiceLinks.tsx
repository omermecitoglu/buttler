import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { addLinkAction, removeLinkAction } from "~/actions/link";
import AddLinkForm from "~/components/services/AddLinkForm";
import RemoveLinkForm from "~/components/services/RemoveLinkForm";
import Card from "~/components/ui/card";
import { getAllServices, getLinksOfService, getSingleService } from "~/data/services";
import { Link, notFound } from "~/i18n/navigation";
import { getLinkedServiceId } from "~/operations/getServiceLinks";

export type ServiceLinksProps = {
  params: Promise<{ id: string }>,
};

const ServiceLinks = async ({ params }: ServiceLinksProps) => {
  await connection();
  const { id } = await params;
  const [
    service,
    services,
    links,
    t,
  ] = await Promise.all([
    getSingleService(id),
    getAllServices(),
    getLinksOfService(id),
    getTranslations("ServicePage.links"),
  ]);
  if (!service) notFound();

  if (service.type === "system") {
    return <Card className="p-6 text-sm text-slate-500">{t("systemService")}</Card>;
  }

  const linkedServices = links.flatMap(link => {
    const linkedService = services.find(({ id: serviceId }) => serviceId === getLinkedServiceId(link, id));
    return linkedService ? [{ linkId: link.id, service: linkedService }] : [];
  });
  const candidates = services.filter(candidate => {
    return candidate.id !== id && candidate.type !== "system" && !linkedServices.some(linked => linked.service.id === candidate.id);
  });

  return (
    <Card className="flex flex-col gap-6 p-6">
      <div>
        <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
        <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
      </div>
      {candidates.length > 0 ? (
        <AddLinkForm action={addLinkAction.bind(null, id)} services={candidates.map(candidate => ({ id: candidate.id, name: candidate.name }))} />
      ) : (
        <p className="text-sm text-slate-500">{t("noCandidates")}</p>
      )}
      {linkedServices.length === 0 ? (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-slate-800/80">
          {linkedServices.map(({ linkId, service: linkedService }) => (
            <li key={linkId} className="flex min-h-8 items-center gap-3 py-2">
              <div className="min-w-0 space-y-0.5">
                <Link
                  href={{ pathname: "/services/[id]", params: { id: linkedService.id } }}
                  className="text-sm font-medium text-slate-200 underline-offset-2 hover:text-white hover:underline"
                >
                  {linkedService.name}
                </Link>
                <p className="text-xs break-all text-slate-500">
                  {t("hostDescription")}
                  {" "}
                  <code className="font-mono text-slate-400">{`buttler-service-${linkedService.id}`}</code>
                </p>
              </div>
              <div className="ml-auto shrink-0">
                <RemoveLinkForm action={removeLinkAction.bind(null, id, linkId)} name={linkedService.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default ServiceLinks;
