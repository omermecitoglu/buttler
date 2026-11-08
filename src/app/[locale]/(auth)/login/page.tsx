import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faCircleExclamation } from "@fortawesome/free-solid-svg-icons/faCircleExclamation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { getPublicOrigin } from "@omer-x/next-utils";
import Link from "next/link";
import Button from "~/components/ui/button";
import Card from "~/components/ui/card";
import { getSetting } from "~/core/settings";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string,
  }>,
};

const errorDescriptions: Record<string, string> = {
  github: "GitHub authentication failed. Please try again.",
  access_denied: "Access was denied by GitHub. Please authorize the application to proceed.",
  missing_code: "Authorization code was missing. Please try again.",
};

const LoginPage = async ({ searchParams }: LoginPageProps) => {
  const [{ error }, clientId, publicOrigin] = await Promise.all([
    searchParams,
    getSetting("github_client_id"),
    getPublicOrigin(),
  ]);

  if (!clientId) {
    return (
      <Card className="max-w-md text-center">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">Setup Required</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            GitHub App configuration is missing. Please complete the setup to configure GitHub OAuth credentials.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          className="w-full justify-center"
          render={<Link href="/install" />}
        >
          Go to Setup
        </Button>
      </Card>
    );
  }

  const redirectURI = new URL("/auth/github", publicOrigin).toString();
  const authUrl = new URL("https://github.com/login/oauth/authorize");
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("redirect_uri", redirectURI);
  authUrl.searchParams.set("scope", "read:user");

  const errorMessage = error
    ? (errorDescriptions[error] ?? "An error occurred during authentication. Please try again.")
    : null;

  return (
    <Card className="max-w-md">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-slate-100">Sign in to Buttler</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Authenticate with your GitHub account to continue.
        </p>
      </div>
      {errorMessage && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-300">
          <FontAwesomeIcon icon={faCircleExclamation} className="mt-0.5 size-4 shrink-0 text-rose-400" />
          <p>{errorMessage}</p>
        </div>
      )}
      <Button
        size="lg"
        className="w-full justify-center gap-2.5"
        render={<Link href={authUrl.toString()} />}
      >
        <FontAwesomeIcon icon={faGithub} className="size-5" />
        <span>Continue with GitHub</span>
      </Button>
    </Card>
  );
};

export default LoginPage;
