"use client";

import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons/faArrowsRotate";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { type ReactNode, useTransition } from "react";
import Button from "~/components/ui/button";
import { Link, useRouter } from "~/i18n/navigation";

export type ServicesHeaderProps = {
  /** Rendered on the server, it needs the services */
  exportButton?: ReactNode,
};

const ServicesHeader = ({ exportButton }: ServicesHeaderProps) => {
  const t = useTranslations("DashboardPage");
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-6 border-b border-slate-800/80">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
        <p className="mt-1 text-sm text-slate-400">{t("subtitle")}</p>
      </div>
      <div className="flex items-center gap-2.5">
        <Button
          variant="secondary"
          size="sm"
          disabled={isRefreshing}
          onClick={handleRefresh}
          className="gap-2"
        >
          <FontAwesomeIcon
            icon={faArrowsRotate}
            className={isRefreshing ? "size-3 animate-spin text-slate-400" : "size-3 text-slate-400"}
          />
          <span>{isRefreshing ? t("refreshing") : t("refresh")}</span>
        </Button>
        {exportButton}
        <Link href="/services/new">
          <Button variant="primary" size="sm" className="gap-2">
            <FontAwesomeIcon icon={faPlus} className="size-3" />
            <span>{t("addService")}</span>
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default ServicesHeader;
