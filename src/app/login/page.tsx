import Link from "next/link";
import { getConfigs } from "~/core/config";
import { getPublicOrigin } from "~/core/headers";

const Page = async () => {
  const [
    configs,
    publicOrigin,
  ] = await Promise.all([
    getConfigs(),
    getPublicOrigin(),
  ]);
  const redirectURI = new URL("/auth/github", publicOrigin).toString();
  if (!configs.githubAppClientId) {
    throw new Error("Client ID of the GitHub App is missing in the configurations!");
  }
  return (
    <Link
      href={`https://github.com/login/oauth/authorize?client_id=${configs.githubAppClientId}&redirect_uri=${redirectURI}`}
      className="btn btn-primary"
    >
      Login with GitHub
    </Link>
  );
};

export default Page;
