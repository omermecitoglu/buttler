import Link from "next/link";
import { getPublicOrigin } from "~/core/headers";
import { getSetting } from "~/core/settings";

const Page = async () => {
  const [
    clientId,
    publicOrigin,
  ] = await Promise.all([
    getSetting("github_client_id"),
    getPublicOrigin(),
  ]);

  if (!clientId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-xl font-bold mb-2">GitHub App Configuration Missing</h1>
        <p className="text-neutral-400 mb-4">Please complete the setup to configure GitHub OAuth credentials.</p>
        <Link href="/install" className="underline text-blue-400">Go to Setup</Link>
      </div>
    );
  }

  const redirectURI = new URL("/auth/github", publicOrigin).toString();
  return (
    <Link
      href={`https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectURI}`}
    >
      Login with GitHub
    </Link>
  );
};

export default Page;
