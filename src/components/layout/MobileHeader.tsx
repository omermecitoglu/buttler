"use client";

import { Dialog } from "@base-ui/react/dialog";
import { faBars } from "@fortawesome/free-solid-svg-icons/faBars";
import { faXmark } from "@fortawesome/free-solid-svg-icons/faXmark";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import LogoutButton from "~/components/LogoutButton";
import Brand from "~/components/layout/Brand";
import MainNav from "~/components/layout/MainNav";

const iconButtonClass = cn(
  "flex size-10 items-center justify-center rounded-lg text-slate-400 transition-colors",
  "hover:bg-slate-800/60 hover:text-slate-100",
  "focus-visible:outline-2 focus-visible:outline-slate-500",
);

const MobileHeader = () => {
  const t = useTranslations("BaseLayout");
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  // The drawer is hidden on wide screens, an open one would keep the page locked
  useEffect(() => {
    const wideScreen = window.matchMedia("(width >= 64rem)");
    const handleChange = () => {
      if (wideScreen.matches) setOpen(false);
    };
    wideScreen.addEventListener("change", handleChange);
    return () => wideScreen.removeEventListener("change", handleChange);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between pr-2 pl-4 lg:hidden",
        "border-b border-slate-800 bg-slate-950/90 backdrop-blur-md",
      )}
    >
      <Brand />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger aria-label={t("openMenu")} className={iconButtonClass}>
          <FontAwesomeIcon icon={faBars} className="size-4" />
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Backdrop
            className={cn(
              "fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-200 lg:hidden",
              "data-ending-style:opacity-0 data-starting-style:opacity-0",
            )}
          />
          <Dialog.Popup
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col lg:hidden",
              "border-l border-slate-800 bg-slate-900 text-slate-100",
              "transition-transform duration-200 ease-out motion-reduce:transition-none",
              "data-ending-style:translate-x-full data-starting-style:translate-x-full",
            )}
          >
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 pr-2 pl-6">
              <Dialog.Title className="text-sm font-semibold">{t("menu")}</Dialog.Title>
              <Dialog.Close aria-label={t("closeMenu")} className={iconButtonClass}>
                <FontAwesomeIcon icon={faXmark} className="size-4" />
              </Dialog.Close>
            </div>
            <MainNav onNavigate={close} />
            <div className="border-t border-slate-800 p-3">
              <LogoutButton />
            </div>
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  );
};

export default MobileHeader;
