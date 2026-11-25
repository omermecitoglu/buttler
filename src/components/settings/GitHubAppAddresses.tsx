import { getTranslations } from "next-intl/server";
import { getGitHubAppMetadata } from "~/core/github/app";
import { getSetting } from "~/core/settings";

export type GitHubAppAddressesProps = {
  hostname: string,
};

/** GitHub only knows the domain that the app was created with, so nothing has to be done while it's the same */
const GitHubAppAddresses = async ({ hostname }: GitHubAppAddressesProps) => {
  const [
    app,
    appDomain,
    t,
  ] = await Promise.all([
    getGitHubAppMetadata(),
    getSetting("github_app_domain"),
    getTranslations("SettingsPage.domain.github"),
  ]);

  if (appDomain === hostname) return null;

  const addresses = [
    { label: t("callback"), path: "/auth/github" },
    { label: t("webhook"), path: "/webhooks/github" },
    { label: t("setup"), path: "/services/new" },
  ];

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
      <h3 className="text-sm font-semibold text-slate-200">{t("title")}</h3>
      <p className="mt-1 text-xs text-slate-400">{t("description")}</p>
      <dl className="mt-3 space-y-2">
        {addresses.map(({ label, path }) => (
          <div key={path}>
            <dt className="text-xs text-slate-500">{label}</dt>
            <dd className="font-mono text-sm break-all text-slate-300">{`https://${hostname}${path}`}</dd>
          </div>
        ))}
      </dl>
      {app && (
        <a
          href={app.htmlUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block text-xs font-medium text-slate-200 underline hover:text-white"
        >
          {t("open")}
        </a>
      )}
    </div>
  );
};

export default GitHubAppAddresses;
