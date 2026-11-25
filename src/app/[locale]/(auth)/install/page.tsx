import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import ChangeDomainLink from "~/components/setup/ChangeDomainLink";
import CloudflareStep from "~/components/setup/CloudflareStep";
import DomainStep from "~/components/setup/DomainStep";
import GitHubStep from "~/components/setup/GitHubStep";
import MoveToDomain from "~/components/setup/MoveToDomain";
import SetupSteps from "~/components/setup/SetupSteps";
import Card from "~/components/ui/card";
import { getPublicOrigin, isLoopbackOrigin } from "~/core/headers";
import { isSetupSession } from "~/core/setup";
import { getSetupLink } from "~/core/setup-code";
import { getSetupProgress } from "~/core/setup-progress";

type InstallCardProps = Pick<PageProps<"/[locale]/install">, "searchParams">;

async function LinkRequired() {
  const t = await getTranslations("InstallPage.linkRequired");
  return (
    <Card className="max-w-md text-center">
      <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">
        {t.rich("description", {
          command: chunks => <code className="font-mono text-slate-200">{chunks}</code>,
        })}
      </p>
    </Card>
  );
}

async function CurrentStep({ searchParams }: InstallCardProps) {
  const [
    progress,
    origin,
    { step, cloudflare: error },
  ] = await Promise.all([
    getSetupProgress(),
    getPublicOrigin(),
    searchParams,
  ]);

  if (progress.step === "cloudflare") {
    return (
      <>
        <SetupSteps current="cloudflare" />
        <CloudflareStep error={error} />
      </>
    );
  }

  const isLocal = isLoopbackOrigin(origin);
  if (progress.step === "domain" || (isLocal && step === "domain")) {
    return (
      <>
        <SetupSteps current="domain" />
        <DomainStep progress={progress} isLocal={isLocal} />
      </>
    );
  }

  const domainOrigin = `https://${progress.hostname}`;
  const setupLink = getSetupLink(domainOrigin);
  return (
    <>
      <SetupSteps current="github" />
      {origin === domainOrigin || setupLink === null ? (
        <GitHubStep origin={domainOrigin} />
      ) : (
        <div className="space-y-4">
          <MoveToDomain hostname={progress.hostname} url={setupLink} />
          <ChangeDomainLink />
        </div>
      )}
    </>
  );
}

async function InstallCard({ searchParams }: InstallCardProps) {
  // The session is not known until the request
  await connection();
  if (!await isSetupSession()) return <LinkRequired />;

  const t = await getTranslations("InstallPage");
  return (
    <Card className="max-w-lg">
      <h1 className="mb-4 text-center text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
      <Suspense fallback={<p className="text-center text-sm text-slate-400">{t("loading")}</p>}>
        <CurrentStep searchParams={searchParams} />
      </Suspense>
    </Card>
  );
}

export default function({ searchParams }: PageProps<"/[locale]/install">) {
  return (
    <Suspense fallback={<Card className="h-64 max-w-lg animate-pulse" />}>
      <InstallCard searchParams={searchParams} />
    </Suspense>
  );
}
