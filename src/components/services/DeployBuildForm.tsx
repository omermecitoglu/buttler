"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type DeployBuildFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  commit: string,
};

/** Deploys an earlier build without building it again */
const DeployBuildForm = ({ action, commit }: DeployBuildFormProps) => {
  const t = useTranslations("ServicePage.builds");
  const [isDeploying, setIsDeploying] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsDeploying(true);
    try {
      return await action(state, formData);
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Form
      action={handleAction}
      messages={{ deploy_failed: t("messages.deploy_failed"), service_busy: t("messages.service_busy") }}
      className="gap-2"
    >
      <Button
        type="submit"
        variant="secondary"
        size="xs"
        pending={isDeploying}
        aria-label={t("deployBuild", { commit })}
      >
        {isDeploying ? t("deploying") : t("deploy")}
      </Button>
    </Form>
  );
};

export default DeployBuildForm;
