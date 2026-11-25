import { getTranslations } from "next-intl/server";

type KnownError = "access_denied" | "invalid_state" | "failed";

const isKnownError = (value: unknown): value is KnownError => (
  value === "access_denied" || value === "invalid_state" || value === "failed"
);

export type CloudflareErrorProps = {
  /** From the address, so it may be anything */
  error: unknown,
};

/** Why the connection could not be completed */
const CloudflareError = async ({ error }: CloudflareErrorProps) => {
  if (!isKnownError(error)) return null;
  const t = await getTranslations("SettingsPage.cloudflare.errors");
  return (
    <p className="rounded-md border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-400">{t(error)}</p>
  );
};

export default CloudflareError;
