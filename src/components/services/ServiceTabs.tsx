"use client";

import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { Suspense, use } from "react";
import { Link, usePathname } from "~/i18n/navigation";

const tabs = [
  { pathname: "/services/[id]", label: "info", segment: "" },
  { pathname: "/services/[id]/builds", label: "builds", segment: "/builds" },
  { pathname: "/services/[id]/logs", label: "logs", segment: "/logs" },
  { pathname: "/services/[id]/links", label: "links", segment: "/links" },
] as const;

const adminTabs = [
  { pathname: "/services/[id]/settings", label: "settings", segment: "/settings" },
] as const;

export type ServiceTabsProps = {
  serviceId: string,
  /** Read from the session, so it's not known while prerendering */
  isAdmin: Promise<boolean>,
};

type ServiceTabProps = (typeof tabs | typeof adminTabs)[number] & {
  serviceId: string,
};

const ServiceTab = ({ pathname, label, segment, serviceId }: ServiceTabProps) => {
  const t = useTranslations("ServicePage.tabs");
  const currentPathname: string = usePathname();
  // The pathname is either the template or the actual path
  const isActive = currentPathname === pathname || currentPathname === `/services/${serviceId}${segment}`;

  return (
    <Link
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
};

const AdminTabs = ({ serviceId, isAdmin }: ServiceTabsProps) => {
  if (!use(isAdmin)) return null;
  return adminTabs.map(tab => <ServiceTab key={tab.pathname} {...tab} serviceId={serviceId} />);
};

const ServiceTabs = ({ serviceId, isAdmin }: ServiceTabsProps) => {
  const t = useTranslations("ServicePage.tabs");

  return (
    <nav aria-label={t("label")} className="flex gap-1 border-b border-slate-800">
      {tabs.map(tab => <ServiceTab key={tab.pathname} {...tab} serviceId={serviceId} />)}
      <Suspense fallback={null}>
        <AdminTabs serviceId={serviceId} isAdmin={isAdmin} />
      </Suspense>
    </nav>
  );
};

export default ServiceTabs;
