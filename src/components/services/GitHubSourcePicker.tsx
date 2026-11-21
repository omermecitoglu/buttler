"use client";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faArrowUpRightFromSquare } from "@fortawesome/free-solid-svg-icons/faArrowUpRightFromSquare";
import { faArrowsRotate } from "@fortawesome/free-solid-svg-icons/faArrowsRotate";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons/faCircleExclamation";
import { faCodeBranch } from "@fortawesome/free-solid-svg-icons/faCodeBranch";
import { faSpinner } from "@fortawesome/free-solid-svg-icons/faSpinner";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Label from "~/components/ui/label";

export type GitHubRepoItem = {
  id: number,
  name: string,
  fullName: string,
  defaultBranch: string,
  private: boolean,
  owner: string,
};

export type GitHubSourcePickerProps = {
  selectedRepo?: string,
  selectedBranch?: string,
  onSelectRepo?: (repoFullName: string, defaultBranch: string) => void,
  onSelectBranch?: (branch: string) => void,
  disabled?: boolean,
  className?: string,
};

const selectClassName = cn(
  "h-10 w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 text-sm text-slate-100 shadow-xs",
  "hover:border-slate-600",
  "focus:border-slate-400 focus:outline-hidden focus-visible:outline-slate-400",
  "disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600",
);

const GitHubSourcePicker = ({
  selectedRepo: controlledRepo,
  selectedBranch: controlledBranch,
  onSelectRepo,
  onSelectBranch,
  disabled = false,
  className,
}: GitHubSourcePickerProps) => {
  const t = useTranslations("NewServicePage.githubSource");

  const [repositories, setRepositories] = useState<GitHubRepoItem[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [currentRepo, setCurrentRepo] = useState<string>(controlledRepo ?? "");
  const [currentBranch, setCurrentBranch] = useState<string>(controlledBranch ?? "");
  const [isLoadingRepos, setIsLoadingRepos] = useState<boolean>(true);
  const [isLoadingBranches, setIsLoadingBranches] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [installationUrl, setInstallationUrl] = useState<string | null>(null);
  const [manageUrl, setManageUrl] = useState<string | null>(null);

  const loadRepositories = useCallback(async () => {
    setIsLoadingRepos(true);
    setErrorMessage(null);
    try {
      const response = await fetch("/api/sources/github/repos");
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load repositories.");
      }
      const data = await response.json();
      setIsConnected(data.isConnected ?? true);
      setInstallationUrl(data.installationUrl ?? null);
      setManageUrl(data.manageUrl ?? null);
      setRepositories(data.repositories || []);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to load repositories.");
    } finally {
      setIsLoadingRepos(false);
    }
  }, []);

  // Fetch repositories on mount
  useEffect(() => {
    void loadRepositories();
  }, [loadRepositories]);

  // Refetch repositories when returning to window focus if disconnected
  useEffect(() => {
    const handleFocus = () => {
      if (!isConnected) {
        void loadRepositories();
      }
    };
    window.addEventListener("focus", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [isConnected, loadRepositories]);

  // Update currentRepo when controlled prop changes
  useEffect(() => {
    if (controlledRepo !== undefined) {
      setCurrentRepo(controlledRepo);
    }
  }, [controlledRepo]);

  // Update currentBranch when controlled prop changes
  useEffect(() => {
    if (controlledBranch !== undefined) {
      setCurrentBranch(controlledBranch);
    }
  }, [controlledBranch]);

  // Fetch branches whenever currentRepo changes
  useEffect(() => {
    if (!currentRepo) {
      setBranches([]);
      setCurrentBranch("");
      return;
    }

    let isCancelled = false;
    async function loadBranches() {
      setIsLoadingBranches(true);
      try {
        const response = await fetch(`/api/sources/github/branches?repo=${encodeURIComponent(currentRepo)}`);
        if (!response.ok) {
          throw new Error("Failed to load branches.");
        }
        const data = await response.json();
        if (!isCancelled) {
          const branchList: string[] = data.branches || [];
          setBranches(branchList);

          // Find default branch from repo if not already set
          const repoMeta = repositories.find(r => r.fullName === currentRepo);
          const defaultBranch = repoMeta?.defaultBranch || branchList[0] || "main";

          if (!currentBranch || !branchList.includes(currentBranch)) {
            setCurrentBranch(defaultBranch);
            onSelectBranch?.(defaultBranch);
          }
        }
      } catch {
        if (!isCancelled) {
          setBranches([]);
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingBranches(false);
        }
      }
    }

    loadBranches();
    return () => {
      isCancelled = true;
    };
  }, [currentRepo, repositories]);

  const handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRepo = e.target.value;
    setCurrentRepo(nextRepo);
    const repoMeta = repositories.find(r => r.fullName === nextRepo);
    const defaultBranch = repoMeta?.defaultBranch || "main";
    onSelectRepo?.(nextRepo, defaultBranch);
  };

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextBranch = e.target.value;
    setCurrentBranch(nextBranch);
    onSelectBranch?.(nextBranch);
  };

  return (
    <div className={cn("space-y-4", className)}>
      <input type="hidden" name="repository" value={currentRepo} />
      <input type="hidden" name="branch" value={currentBranch} />
      {/* Repository Selection */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="github-repo-select" className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faGithub} className="text-slate-400" />
            {t("repoLabel")}
          </Label>
          {isLoadingRepos && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
              {t("loadingRepos")}
            </span>
          )}
        </div>
        {errorMessage ? (
          <div className="flex items-center justify-between rounded-md border border-rose-800/60 bg-rose-950/40 px-3 py-2 text-xs text-rose-300">
            <span>{errorMessage}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={loadRepositories}
              className="text-xs text-rose-300 hover:text-rose-100"
            >
              <FontAwesomeIcon icon={faArrowsRotate} className="size-3" />
            </Button>
          </div>
        ) : !isConnected ? (
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/20 p-4 space-y-3">
            <div className="flex items-start gap-3">
              <FontAwesomeIcon icon={faCircleExclamation} className="size-5 text-amber-400 mt-0.5 shrink-0" />
              <div className="space-y-1">
                <h3 className="text-sm font-medium text-amber-200">
                  {t("notConnected.title")}
                </h3>
                <p className="text-xs text-amber-300/80 leading-relaxed">
                  {t("notConnected.description")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {installationUrl && (
                <a
                  href={installationUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Button type="button" size="sm" variant="primary" className="gap-1.5 text-xs">
                    <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="size-3" />
                    <span>{t("notConnected.installButton")}</span>
                  </Button>
                </a>
              )}
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={loadRepositories}
                disabled={isLoadingRepos}
                className="gap-1.5 text-xs"
              >
                <FontAwesomeIcon icon={faArrowsRotate} spin={isLoadingRepos} className="size-3" />
                <span>{t("notConnected.refreshButton")}</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <select
              id="github-repo-select"
              value={currentRepo}
              onChange={handleRepoChange}
              disabled={disabled || isLoadingRepos || repositories.length === 0}
              className={selectClassName}
            >
              <option value="" disabled>
                {isLoadingRepos
                  ? t("loadingReposPlaceholder")
                  : repositories.length === 0
                    ? t("noRepos")
                    : t("selectRepo")}
              </option>
              {repositories.map(repo => (
                <option key={repo.id} value={repo.fullName}>
                  {repo.fullName}
                  {" "}
                  {repo.private ? `(${t("privateBadge")})` : ""}
                </option>
              ))}
            </select>
            {manageUrl && (
              <div className="flex items-center justify-end pt-1">
                <a
                  href={manageUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <span>{t("manageAccess")}</span>
                  <FontAwesomeIcon icon={faArrowUpRightFromSquare} className="size-2.5" />
                </a>
              </div>
            )}
          </>
        )}
      </div>
      {/* Branch Selection (Shown when repository is selected) */}
      {currentRepo && isConnected && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="github-branch-select" className="flex items-center gap-1.5">
              <FontAwesomeIcon icon={faCodeBranch} className="text-slate-400" />
              {t("branchLabel")}
            </Label>
            {isLoadingBranches && (
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <FontAwesomeIcon icon={faSpinner} spin className="text-xs" />
                {t("loadingBranches")}
              </span>
            )}
          </div>
          <select
            id="github-branch-select"
            value={currentBranch}
            onChange={handleBranchChange}
            disabled={disabled || isLoadingBranches || branches.length === 0}
            className={selectClassName}
          >
            <option value="" disabled>
              {isLoadingBranches ? t("loadingBranches") : t("selectBranch")}
            </option>
            {branches.map(branch => (
              <option key={branch} value={branch}>
                {branch}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default GitHubSourcePicker;
