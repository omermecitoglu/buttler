"use client";

import { faChevronRight } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { getBuildCommits } from "~/actions/build";
import type { CommitRange } from "~/core/github/commits";

export type BuildCommitsProps = {
  serviceId: string,
  commit: string,
  /** The commit of the previous build, null for the first build */
  previousCommit: string | null,
};

type State = "idle" | "loading" | "failed" | CommitRange;

const BuildCommits = ({ serviceId, commit, previousCommit }: BuildCommitsProps) => {
  const t = useTranslations("ServicePage.builds.commits");
  const [state, setState] = useState<State>("idle");

  const load = async () => {
    setState("loading");
    const range = await getBuildCommits(serviceId, commit, previousCommit).catch(() => null);
    setState(range ?? "failed");
  };

  const handleToggle = (event: React.ToggleEvent<HTMLDetailsElement>) => {
    if (event.currentTarget.open && (state === "idle" || state === "failed")) void load();
  };

  return (
    <details className="group text-xs" onToggle={handleToggle}>
      <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-slate-400 select-none hover:text-slate-200">
        <FontAwesomeIcon icon={faChevronRight} className="size-2.5 transition-transform group-open:rotate-90" />
        {previousCommit ? t("sincePrevious", { commit: previousCommit.slice(0, 7) }) : t("first")}
      </summary>
      <div className="mt-2 pl-4">
        {(state === "idle" || state === "loading") && <p className="text-slate-500">{t("loading")}</p>}
        {state === "failed" && <p className="text-rose-400">{t("unavailable")}</p>}
        {typeof state === "object" && (state.commits.length === 0 ? (
          <p className="text-slate-500">{t("empty")}</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {state.commits.map(item => (
              <li key={item.hash} className="flex gap-2">
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-sky-400 hover:underline"
                  title={item.hash}
                >
                  {item.shortHash}
                </a>
                <span className="break-words text-slate-300">{item.message}</span>
              </li>
            ))}
            {state.total > state.commits.length && (
              <li className="text-slate-500">{t("more", { count: state.total - state.commits.length })}</li>
            )}
          </ul>
        ))}
      </div>
    </details>
  );
};

export default BuildCommits;
