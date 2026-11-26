"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";
import Select from "~/components/ui/select";

export type AddLinkFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  /** The services that can be linked, at least one */
  services: { id: string, name: string }[],
};

const AddLinkForm = ({ action, services }: AddLinkFormProps) => {
  const t = useTranslations("ServicePage.links");
  const idPrefix = useId();
  const [isAdding, setIsAdding] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsAdding(true);
    try {
      return await action(state, formData);
    } finally {
      setIsAdding(false);
    }
  };

  const messages = {
    add_failed: t("messages.add_failed"),
    already_linked: t("messages.already_linked"),
    connect_failed: t("messages.connect_failed"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Label htmlFor={`${idPrefix}-service`}>{t("serviceLabel")}</Label>
        {/* The options change after a link is added, so the selection must follow them */}
        <Select key={services.map(({ id }) => id).join()} id={`${idPrefix}-service`} name="linkedServiceId" required>
          {services.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
        </Select>
      </div>
      <Button type="submit" variant="primary" size="md" pending={isAdding} className="gap-2">
        {!isAdding && <FontAwesomeIcon icon={faPlus} className="size-3" />}
        <span>{isAdding ? t("adding") : t("add")}</span>
      </Button>
    </Form>
  );
};

export default AddLinkForm;
