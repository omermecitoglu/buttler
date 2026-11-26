"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";

export type RemoveLinkFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  /** Name of the service on the other side */
  name: string,
};

const RemoveLinkForm = ({ action, name }: RemoveLinkFormProps) => {
  const t = useTranslations("ServicePage.links");
  const [isRemoving, setIsRemoving] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsRemoving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsRemoving(false);
    }
  };

  const messages = {
    disconnect_failed: t("messages.disconnect_failed"),
    remove_failed: t("messages.remove_failed"),
  };

  return (
    <Form action={handleAction} messages={messages} className="gap-2">
      <Button
        type="submit"
        variant="ghost"
        size="xs"
        pending={isRemoving}
        aria-label={t("removeLink", { name })}
        className="text-slate-400 hover:text-rose-400"
      >
        {isRemoving ? t("removing") : t("remove")}
      </Button>
    </Form>
  );
};

export default RemoveLinkForm;
