"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import SharedVariablesRepeater, { type SharedVariableItem } from "~/components/services/SharedVariablesRepeater";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Label from "~/components/ui/label";
import type { SharedVariableSource } from "~/core/shared-variables";

export type SharedVariablesFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  variables: { id: string, key: string, template: string }[],
  /** The service itself, secrets have no value */
  source: SharedVariableSource,
  /** The services that inherit the variables, which can be recreated */
  inheritingServices: { id: string, name: string }[],
};

const SharedVariablesForm = ({ action, variables, source, inheritingServices }: SharedVariablesFormProps) => {
  const t = useTranslations("ServicePage.links.shared");
  const idPrefix = useId();
  // Controlled inputs, so they aren't reset when the action fails
  const [items, setItems] = useState<SharedVariableItem[]>(() => variables.map(variable => ({
    ...variable,
    uid: variable.id,
  })));
  const [recreate, setRecreate] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // React resets the form after an action, which unchecks the checkboxes without updating their state
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
    recreated: t("messages.recreated"),
    save_failed: t("messages.save_failed"),
    recreate_failed: t("messages.recreate_failed"),
    duplicate_keys: t("messages.duplicate_keys"),
    INVALID_SHARED_VARIABLES: t("messages.invalid_shared_variables"),
  };

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
      <input
        type="hidden"
        name="variables"
        value={JSON.stringify(items.map(({ id, key, template }) => ({ id, key: key.trim(), template })))}
      />
      <input type="hidden" name="recreate" value={JSON.stringify(recreate)} />
      <SharedVariablesRepeater items={items} onChange={setItems} source={source} disabled={isSaving} />
      {inheritingServices.length > 0 && (
        <fieldset className="space-y-2">
          <legend className="text-xs text-slate-400">{t("recreate")}</legend>
          {inheritingServices.map(service => (
            <div key={service.id} className="flex items-start gap-2">
              <input
                key={submitCount}
                id={`${idPrefix}-recreate-${service.id}`}
                type="checkbox"
                checked={recreate.includes(service.id)}
                onChange={event => setRecreate(event.target.checked
                  ? [...recreate, service.id]
                  : recreate.filter(id => id !== service.id))}
                disabled={isSaving}
                className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
              />
              <Label htmlFor={`${idPrefix}-recreate-${service.id}`} className="font-normal tracking-normal normal-case">
                {service.name}
              </Label>
            </div>
          ))}
        </fieldset>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <p className="text-xs text-slate-500">{t(recreate.length > 0 ? "applyNow" : "applyLater")}</p>
        <div className="ml-auto shrink-0">
          <Button type="submit" variant="primary" size="sm" pending={isSaving}>
            {isSaving ? t("saving") : t("save")}
          </Button>
        </div>
      </div>
    </Form>
  );
};

export default SharedVariablesForm;
