"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";

export type SystemServicesFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  show: boolean,
};

const SystemServicesForm = ({ action, show: savedShow }: SystemServicesFormProps) => {
  const t = useTranslations("SettingsPage.systemServices");
  const id = useId();
  // Controlled input, so it isn't reset when the action fails
  const [show, setShow] = useState(savedShow);
  const [isSaving, setIsSaving] = useState(false);
  // React resets the form after an action, which unchecks the checkbox without updating its state
  const [submitCount, setSubmitCount] = useState(0);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSaving(false);
      setSubmitCount(count => count + 1);
    }
  };

  const messages = {
    saved: t("messages.saved"),
  };

  return (
    <Form action={handleAction} messages={messages} className="w-full">
      {/* The checkbox may show a reset state until it is mounted again, so the value comes from the state */}
      {show && <input type="hidden" name="show" value="on" />}
      <div className="flex items-start gap-2">
        <input
          key={submitCount}
          id={id}
          type="checkbox"
          checked={show}
          onChange={event => setShow(event.target.checked)}
          disabled={isSaving}
          className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
        />
        <Label htmlFor={id} className="font-normal tracking-normal normal-case">{t("show")}</Label>
      </div>
      <Button type="submit" variant="secondary" size="xs" pending={isSaving}>
        {isSaving ? t("saving") : t("save")}
      </Button>
    </Form>
  );
};

export default SystemServicesForm;
