"use client";

import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "~/i18n/navigation";

const tabs = [
  { pathname: "/services/[id]", label: "info", segment: "" },
  { pathname: "/services/[id]/builds", label: "builds", segment: "/builds" },
  { pathname: "/services/[id]/logs", label: "logs", segment: "/logs" },
] as const;

export type ServiceTabsProps = {
  serviceId: string,
};

const ServiceTabs = ({ serviceId }: ServiceTabsProps) => {
  const t = useTranslations("ServicePage.tabs");
  const currentPathname: string = usePathname();

  return (
    <nav aria-label={t("label")} className="flex gap-1 border-b border-slate-800">
      {tabs.map(({ pathname, label, segment }) => {
        // The pathname is either the template or the actual path
        const isActive = currentPathname === pathname || currentPathname === `/services/${serviceId}${segment}`;

        return (
          <Link
            key={pathname}
            href={{ pathname, params: { id: serviceId } }}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px flex h-11 items-center border-b-2 px-4 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-slate-500",
              isActive
                ? "border-slate-100 text-white"
                : "border-transparent text-slate-400 hover:text-slate-100",
            )}
          >
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
};

export default ServiceTabs;
