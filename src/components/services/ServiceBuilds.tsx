import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { connection } from "next/server";
import { getFormatter, getTranslations } from "next-intl/server";
import BuildCommits from "~/components/services/BuildCommits";
import Card from "~/components/ui/card";
import type { ServiceBuild } from "~/core/docker/builds";
import { getBuildsOfService, getServiceWithLiveStatus } from "~/data/services";
import { notFound } from "~/i18n/navigation";

const statusClasses: Record<ServiceBuild["status"], string> = {
  ready: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
  building: "border-sky-500/20 bg-sky-500/10 text-sky-400",
  failed: "border-rose-500/20 bg-rose-500/10 text-rose-400",
};

export type ServiceBuildsProps = {
  params: Promise<{ id: string }>,
};

const ServiceBuilds = async ({ params }: ServiceBuildsProps) => {
  await connection();
  const { id } = await params;
  const [
    service,
    t,
    format,
  ] = await Promise.all([
    getServiceWithLiveStatus(id),
    getTranslations("ServicePage.builds"),
    getFormatter(),
  ]);
  if (!service) notFound();

  const builds = service.type === "github" ? await getBuildsOfService(id) : [];

  if (!builds || builds.length === 0) {
    return (
      <Card className="p-6 text-sm text-slate-500">
        {service.type !== "github" ? t("notBuilt") : builds ? t("empty") : t("unavailable")}
      </Card>
    );
  }

  /** The commits of the builds are compared with the commit of the previous ready build */
  const previousCommits = builds.map((_, index) => (
    builds.slice(index + 1).find(build => build.status === "ready" && build.commit)?.commit ?? null
  ));

  return (
    <Card className="p-0">
      <ul className="divide-y divide-slate-800/80">
        {builds.map((build, index) => (
          <li key={build.id} className="flex flex-col gap-2 px-6 py-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-medium", statusClasses[build.status])}>
                {t(`status.${build.status}`)}
              </span>
              <span className="font-mono text-slate-200" title={build.commit ?? undefined}>
                {build.commit?.slice(0, 7) ?? t("unknownCommit")}
              </span>
              {build.branch && <span className="font-mono text-slate-500">{build.branch}</span>}
              {build.id === service.runtime.imageId && (
                <span className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-300">
                  {t("deployed")}
                </span>
              )}
              <span className="ml-auto flex gap-3 text-xs text-slate-500">
                {build.status === "ready" && (
                  <span>
                    {format.number(build.size / 1e6, { style: "unit", unit: "megabyte", maximumFractionDigits: 1 })}
                  </span>
                )}
                {build.builtAt && (
                  <span>{format.dateTime(new Date(build.builtAt), { dateStyle: "medium", timeStyle: "short" })}</span>
                )}
              </span>
            </div>
            {build.commit && (
              <BuildCommits serviceId={id} commit={build.commit} previousCommit={previousCommits[index]} />
            )}
            {build.status === "ready" && build.tags.length > 0 && (
              <p className="font-mono text-xs break-all text-slate-500">{build.tags.join(", ")}</p>
            )}
            {build.status === "failed" && (
              <p className="font-mono text-xs break-words whitespace-pre-wrap text-rose-400">{build.error}</p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
};

export default ServiceBuilds;
