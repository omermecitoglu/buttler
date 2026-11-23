"use client";

import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { type ChangeEvent, useActionState, useEffect, useState } from "react";
import { type InstallState, installApp } from "~/actions/install";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

const initialState: InstallState = {};

type ManualInstallFormProps = {
  publicOrigin?: string,
};

const ManualInstallForm = ({ publicOrigin }: ManualInstallFormProps) => {
  const t = useTranslations("InstallPage.manual");
  const [origin, setOrigin] = useState(publicOrigin ?? "");
  const [state, formAction, pending] = useActionState(installApp, initialState);
  const [appId, setAppId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  useEffect(() => {
    if (!origin && typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, [origin]);

  const setupUrl = `${origin}/services/new`;

  const handlePrivateKeyFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setPrivateKey((await file.text()).trim());
    }
  };

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5 rounded-md border border-slate-800 bg-slate-900/60 p-3">
        <p className="text-xs leading-relaxed text-slate-400">
          {t.rich("setupUrlHint", {
            strong: chunks => <strong className="font-medium text-slate-200">{chunks}</strong>,
          })}
        </p>
        <Input
          id="setupUrl"
          type="text"
          value={setupUrl}
          readOnly
          onFocus={e => e.target.select()}
          aria-label={t("setupUrlLabel")}
          className="font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="appId">{t("appIdLabel")}</Label>
        <Input
          id="appId"
          name="appId"
          type="text"
          inputMode="numeric"
          value={appId}
          onChange={e => setAppId(e.target.value)}
          placeholder={t("appIdPlaceholder")}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="privateKey">{t("privateKeyLabel")}</Label>
        <textarea
          id="privateKey"
          name="privateKey"
          rows={5}
          value={privateKey}
          onChange={e => setPrivateKey(e.target.value)}
          placeholder={t("privateKeyPlaceholder")}
          spellCheck={false}
          className={cn(
            "w-full rounded-md border border-slate-700 bg-slate-900/90 px-3 py-2 font-mono text-xs text-slate-100",
            "placeholder:text-slate-500 shadow-xs hover:border-slate-600",
            "focus:border-slate-400 focus:outline-slate-400 focus-visible:outline-slate-400",
          )}
        />
        <input
          id="privateKeyFile"
          name="privateKeyFile"
          type="file"
          accept=".pem,application/x-pem-file"
          onChange={handlePrivateKeyFile}
          aria-label={t("privateKeyFileLabel")}
          className={cn(
            "block w-full text-xs text-slate-400",
            "file:mr-3 file:rounded-md file:border-0 file:bg-slate-800 file:px-3 file:py-1.5",
            "file:text-xs file:font-medium file:text-slate-200 hover:file:bg-slate-700",
          )}
        />
        <p className="text-xs text-slate-500">
          {t("privateKeyHelp")}
        </p>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="clientSecret">{t("clientSecretLabel")}</Label>
        <Input
          id="clientSecret"
          name="clientSecret"
          type="password"
          value={clientSecret}
          onChange={e => setClientSecret(e.target.value)}
          placeholder={t("clientSecretPlaceholder")}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="webhookSecret">{t("webhookSecretLabel")}</Label>
        <Input
          id="webhookSecret"
          name="webhookSecret"
          type="password"
          value={webhookSecret}
          onChange={e => setWebhookSecret(e.target.value)}
          placeholder={t("webhookSecretPlaceholder")}
        />
      </div>
      {state.error && (
        <p role="alert" className="text-sm text-red-400">
          {t(`errors.${state.error}`)}
        </p>
      )}
      <div className="pt-2">
        <Button type="submit" variant="secondary" size="md" className="w-full" disabled={pending}>
          {pending ? t("submitting") : t("submit")}
        </Button>
      </div>
    </form>
  );
};

export default ManualInstallForm;
