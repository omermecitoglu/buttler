"use client";

import { useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

type ManifestFormProps = {
  publicOrigin: string,
};

const ManifestForm = ({ publicOrigin }: ManifestFormProps) => {
  const [appName, setAppName] = useState("Buttler");
  const [organization, setOrganization] = useState("");

  const manifest = {
    name: appName,
    url: publicOrigin,
    hook_attributes: {
      url: `${publicOrigin}/webhook`,
    },
    redirect_url: `${publicOrigin}/auth/github-install`,
    callback_urls: [`${publicOrigin}/auth/github`],
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
        <Label htmlFor="appName">GitHub App Name</Label>
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
        <Label htmlFor="organization">GitHub Organization</Label>
        <Input
          id="organization"
          name="organization"
          type="text"
          value={organization}
          onChange={e => setOrganization(e.target.value)}
          placeholder="e.g. acme-corp (optional)"
        />
        <p className="text-xs text-slate-500">
          Leave blank to create the app under your personal account.
        </p>
      </div>
      <Button type="submit" size="md" className="w-full">
        Create GitHub App
      </Button>
    </form>
  );
};

export default ManifestForm;
