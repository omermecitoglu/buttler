"use client";

import { faServer } from "@fortawesome/free-solid-svg-icons/faServer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "~/i18n/navigation";

const items = [
  { href: "/services", label: "nav.services", icon: faServer },
] as const;

export type MainNavProps = {
  onNavigate?: () => void,
};

const MainNav = ({ onNavigate }: MainNavProps) => {
  const t = useTranslations("BaseLayout");
  const pathname = usePathname();

  return (
    <nav aria-label={t("nav.label")} className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {items.map(({ href, label, icon }) => {
        const isCurrentPage = pathname === href;
        const isActive = isCurrentPage || pathname.startsWith(`${href}/`);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={isCurrentPage ? "page" : isActive || undefined}
            className={cn(
              "flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-slate-500",
              isActive
                ? "bg-slate-800 text-white"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-100",
            )}
          >
            <FontAwesomeIcon icon={icon} className="size-4" />
            <span>{t(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
};

export default MainNav;
