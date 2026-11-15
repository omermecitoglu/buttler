"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

type ManifestFormProps = {
  publicOrigin?: string,
};

const ManifestForm = ({ publicOrigin }: ManifestFormProps) => {
  const t = useTranslations("InstallPage.manifest");
  const [origin, setOrigin] = useState(publicOrigin ?? "");
  const [appName, setAppName] = useState("Buttler");
  const [organization, setOrganization] = useState("");

  useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [origin]);

  const manifest = {
    name: appName,
    url: origin,
    hook_attributes: {
      url: `${origin}/webhook`,
    },
    redirect_url: `${origin}/auth/github-install`,
    callback_urls: [`${origin}/auth/github`],
    default_permissions: {
      contents: "read",
      metadata: "read",
    },
    default_events: ["push"],
    public: false,
  };

  const formAction = organization.trim()
    ? `https://github.com/organizations/${encodeURIComponent(organization.trim())}/settings/apps/new`
    : "https://github.com/settings/apps/new";

  return (
    <form
      action={formAction}
      method="post"
      className="space-y-4"
    >
      <input
        type="hidden"
        name="manifest"
        value={JSON.stringify(manifest)}
      />
      <div className="space-y-1.5">
        <Label htmlFor="appName">{t("appNameLabel")}</Label>
        <Input
          id="appName"
          name="appName"
          type="text"
          value={appName}
          onChange={e => setAppName(e.target.value)}
          placeholder="Buttler"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="organization">{t("organizationLabel")}</Label>
        <Input
          id="organization"
          name="organization"
          type="text"
          value={organization}
          onChange={e => setOrganization(e.target.value)}
          placeholder={t("organizationPlaceholder")}
        />
        <p className="text-xs text-slate-500">
          {t("organizationHelp")}
        </p>
      </div>
      <Button type="submit" size="md" className="w-full">
        {t("submit")}
      </Button>
    </form>
  );
};

export default ManifestForm;
