"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";

export type MoveToDomainProps = {
  hostname: string,
  /** The setup link of the domain */
  url: string,
};

/** The rest of the setup is done at the domain */
const MoveToDomain = ({ hostname, url }: MoveToDomainProps) => {
  const t = useTranslations("InstallPage.domain");

  useEffect(() => {
    window.location.assign(url);
  }, [url]);

  return (
    <p className="text-sm text-slate-400">
      {t("moving")}
      {" "}
      <a href={url} className="font-medium break-all text-slate-200 underline hover:text-white">{hostname}</a>
    </p>
  );
};

export default MoveToDomain;
