"use client";

import { type IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faServer } from "@fortawesome/free-solid-svg-icons/faServer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { Suspense, use } from "react";
import { Link, usePathname } from "~/i18n/navigation";

type NavItemDefinition = {
  href: "/services" | "/settings",
  label: "nav.services" | "nav.settings",
  icon: IconDefinition,
};

const items: NavItemDefinition[] = [
  { href: "/services", label: "nav.services", icon: faServer },
];

const adminItems: NavItemDefinition[] = [
  { href: "/settings", label: "nav.settings", icon: faGear },
];

export type MainNavProps = {
  /** Read from the session, so it's not known while prerendering */
  isAdmin: Promise<boolean>,
  onNavigate?: () => void,
};

type NavItemProps = NavItemDefinition & {
  pathname: string,
  onNavigate?: () => void,
};

const NavItem = ({ href, label, icon, pathname, onNavigate }: NavItemProps) => {
  const t = useTranslations("BaseLayout");
  const isCurrentPage = pathname === href;
  const isActive = isCurrentPage || pathname.startsWith(`${href}/`);

  return (
    <Link
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
};

type NavItemsProps = MainNavProps & {
  pathname: string,
};

const AdminNavItems = ({ isAdmin, ...props }: NavItemsProps) => {
  if (!use(isAdmin)) return null;
  return adminItems.map(item => <NavItem key={item.href} {...item} {...props} />);
};

const NavItems = ({ isAdmin, ...props }: NavItemsProps) => {
  const t = useTranslations("BaseLayout");

  return (
    <nav aria-label={t("nav.label")} className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
      {items.map(item => <NavItem key={item.href} {...item} {...props} />)}
      <Suspense fallback={null}>
        <AdminNavItems isAdmin={isAdmin} {...props} />
      </Suspense>
    </nav>
  );
};

const CurrentNavItems = (props: MainNavProps) => (
  <NavItems pathname={usePathname()} {...props} />
);

// The pathname of a dynamic route is not known while prerendering
const MainNav = (props: MainNavProps) => (
  <Suspense fallback={<NavItems pathname="" {...props} />}>
    <CurrentNavItems {...props} />
  </Suspense>
);

export default MainNav;
