import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { addLinkAction, removeLinkAction } from "~/actions/link";
import { saveSharedVariablesAction, updateLinkInheritanceAction } from "~/actions/shared-variable";
import AddLinkForm from "~/components/services/AddLinkForm";
import LinkInheritanceForm from "~/components/services/LinkInheritanceForm";
import RemoveLinkForm from "~/components/services/RemoveLinkForm";
import SharedVariablesForm from "~/components/services/SharedVariablesForm";
import Card from "~/components/ui/card";
import { getServiceHost } from "~/core/shared-variables";
import {
  getInheritedVariablesOfService,
  getLinksOfService,
  getServicesWithLiveStatus,
  getSharedVariableNamesOfLink,
  getSharedVariablesOfService,
  getSingleService,
} from "~/data/services";
import { Link, notFound } from "~/i18n/navigation";
import { getLinkedServiceId } from "~/operations/getServiceLinks";
import { getContainerState } from "~/utils/containerState";

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
    sharedVariables,
    inheritedVariables,
    t,
  ] = await Promise.all([
    getSingleService(id),
    getServicesWithLiveStatus(),
    getLinksOfService(id),
    getSharedVariablesOfService(id),
    getInheritedVariablesOfService(id),
    getTranslations("ServicePage.links"),
  ]);
  if (!service) notFound();

  if (service.type === "system") {
    return <Card className="p-6 text-sm text-slate-500">{t("systemService")}</Card>;
  }

  const containerState = getContainerState(services.find(({ id: serviceId }) => serviceId === id)?.runtime.status ?? "stopped");
  const linkedServices = (await Promise.all(links.map(async link => {
    const linkedService = services.find(({ id: serviceId }) => serviceId === getLinkedServiceId(link, id));
    if (!linkedService) return [];
    const [
      offered,
      names,
    ] = await Promise.all([
      getSharedVariablesOfService(linkedService.id),
      getSharedVariableNamesOfLink(link.id),
    ]);
    return [{
      linkId: link.id,
      service: linkedService,
      inherits: link.serviceAId === id ? link.serviceAInherits : link.serviceBInherits,
      inheritedByOther: link.serviceAId === id ? link.serviceBInherits : link.serviceAInherits,
      offered,
      names,
    }];
  }))).flat();
  const candidates = services.filter(candidate => {
    return candidate.id !== id &&
      candidate.type !== "system" &&
      !linkedServices.some(linked => linked.service.id === candidate.id);
  });

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
        </div>
        {candidates.length > 0 ? (
          <AddLinkForm
            action={addLinkAction.bind(null, id)}
            services={candidates.map(candidate => ({ id: candidate.id, name: candidate.name }))}
          />
        ) : (
          <p className="text-sm text-slate-500">{t("noCandidates")}</p>
        )}
        {linkedServices.length === 0 ? (
          <p className="text-sm text-slate-500">{t("empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-800/80">
            {linkedServices.map(({ linkId, service: linkedService, inherits, offered, names }) => (
              <li key={linkId} className="space-y-3 py-3">
                <div className="flex min-h-8 items-center gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <Link
                      href={{ pathname: "/services/[id]", params: { id: linkedService.id } }}
                      className="text-sm font-medium text-slate-200 underline-offset-2 hover:text-white hover:underline"
                    >
                      {linkedService.name}
                    </Link>
                    {linkedService.type === "system" ? (
                      <p className="text-xs text-slate-500">{t("systemLink")}</p>
                    ) : (
                      <p className="text-xs break-all text-slate-500">
                        {t("hostDescription")}
                        {" "}
                        <code className="font-mono text-slate-400">{getServiceHost(linkedService.id)}</code>
                      </p>
                    )}
                  </div>
                  {linkedService.type !== "system" && (
                    <div className="ml-auto shrink-0">
                      <RemoveLinkForm action={removeLinkAction.bind(null, id, linkId)} name={linkedService.name} />
                    </div>
                  )}
                </div>
                {linkedService.type !== "system" && (
                  <LinkInheritanceForm
                    action={updateLinkInheritanceAction.bind(null, id, linkId)}
                    sourceName={linkedService.name}
                    variables={offered.map(({ id: variableId, key }) => ({ id: variableId, key }))}
                    inherits={inherits}
                    names={names.map(({ sharedVariableId, name }) => ({ sharedVariableId, name }))}
                    containerState={containerState}
                    takenNames={inheritedVariables.filter(variable => variable.linkId !== linkId).map(({ name }) => name)}
                  />
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card className="flex flex-col gap-6 p-6">
        <div>
          <h2 className="text-base font-semibold text-slate-100">{t("shared.title")}</h2>
          <p className="mt-1 text-xs text-slate-400">{t("shared.description")}</p>
        </div>
        <SharedVariablesForm
          action={saveSharedVariablesAction.bind(null, id)}
          variables={sharedVariables.map(({ id: variableId, key, template }) => ({ id: variableId, key, template }))}
          source={{ host: getServiceHost(id), variables: service.environmentVariables }}
          canRecreate={linkedServices.some(({ service: linkedService, inheritedByOther }) => {
            return inheritedByOther && getContainerState(linkedService.runtime.status) === "running";
          })}
        />
      </Card>
    </div>
  );
};

export default ServiceLinks;
