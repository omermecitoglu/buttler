import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons/faCircleExclamation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { parseSearchParams } from "@omer-x/next-utils/search-params";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import z from "zod";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import { getSetting } from "~/core/settings";
import { Link } from "~/i18n/navigation";

const LoginSearchParams = z.object({
  // An unknown error shows the default message
  error: z.enum(["github", "access_denied", "not_allowed", "missing_code", "setup_link", "invalid_state"])
    .or(z.unknown().transform(() => "default" as const))
    .optional(),
});

type LoginErrorMessageProps = {
  searchParams: Promise<{ error?: string }>,
};

async function LoginErrorMessage({ searchParams }: LoginErrorMessageProps) {
  const [
    { error },
    t,
  ] = await Promise.all([
    parseSearchParams(searchParams, LoginSearchParams),
    getTranslations("LoginPage"),
  ]);
  if (!error) return null;

  const errorMessage = t(`errors.${error}`);

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-300">
      <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 size-4 shrink-0 text-rose-400" />
      <p>{errorMessage}</p>
    </div>
  );
}

/** A plain link, the route sets the state of the login and redirects to GitHub */
function GitHubLoginButton({ label }: { label: string }) {
  return (
    <Button
      size="lg"
      className="w-full justify-center gap-2.5"
      // The content comes from the button, and a route handler needs a full page load, not the router
      // eslint-disable-next-line jsx-a11y/anchor-has-content, @next/next/no-html-link-for-pages
      render={<a href="/auth/github/login" />}
      nativeButton={false}
    >
      <FontAwesomeIcon icon={faGithub} className="size-5" />
      <span>{label}</span>
    </Button>
  );
}

async function LoginCard({ searchParams }: LoginErrorMessageProps) {
  // The client ID is not known until the installation, which comes after the build
  await connection();
  const [
    clientId,
    t,
  ] = await Promise.all([
    getSetting("github_client_id"),
    getTranslations("LoginPage"),
  ]);

  if (!clientId) {
    return (
      <Card className="max-w-md text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("setupRequired.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            {t("setupRequired.description")}
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          className="w-full justify-center"
          render={<Link href="/install" />}
          nativeButton={false}
        >
          {t("setupRequired.button")}
        </Button>
      </Card>
    );
  }

  return (
    <Card className="max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">{t("title")}</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          {t("description")}
        </p>
      </div>
      <Suspense fallback={null}>
        <LoginErrorMessage searchParams={searchParams} />
      </Suspense>
      <GitHubLoginButton label={t("continueWithGitHub")} />
    </Card>
  );
}

export default function({ searchParams }: PageProps<"/[locale]/login">) {
  return (
    <Suspense fallback={<Card className="h-64 max-w-md animate-pulse" />}>
      <LoginCard searchParams={searchParams} />
    </Suspense>
  );
}
