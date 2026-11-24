import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import Authorized from "~/components/auth/Authorized";
import ServiceHeader from "~/components/services/ServiceHeader";
import ServiceHeaderSkeleton from "~/components/services/ServiceHeaderSkeleton";
import ServiceTabs from "~/components/services/ServiceTabs";
import { Link } from "~/i18n/navigation";

export default async function({ children, params }: LayoutProps<"/[locale]/services/[id]">) {
  const t = await getTranslations("ServicePage");

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/services"
        className="inline-flex items-center gap-2 self-start text-xs font-medium text-slate-400 transition-colors hover:text-slate-100"
      >
        <FontAwesomeIcon icon={faArrowLeft} className="size-3" />
        <span>{t("back")}</span>
      </Link>
      <Suspense fallback={<ServiceHeaderSkeleton />}>
        <Authorized>
          <ServiceHeader params={params} />
        </Authorized>
      </Suspense>
      <Suspense fallback={<div className="h-11 border-b border-slate-800" />}>
        {params.then(({ id }) => <ServiceTabs serviceId={id} />)}
      </Suspense>
      {children}
    </div>
  );
}
