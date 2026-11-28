"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import RecreateSubmit from "~/components/services/RecreateSubmit";
import SharedVariablesRepeater, { type SharedVariableItem } from "~/components/services/SharedVariablesRepeater";
import Form from "~/components/ui/form";
import type { SharedVariableSource } from "~/core/shared-variables";

export type SharedVariablesFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  variables: { id: string, key: string, template: string }[],
  /** The service itself, secrets have no value */
  source: SharedVariableSource,
  /** Some linked services inherit the variables, so their containers can be recreated */
  canRecreate: boolean,
};

const SharedVariablesForm = ({ action, variables, source, canRecreate }: SharedVariablesFormProps) => {
  const t = useTranslations("ServicePage.links.shared");
  const tRecreate = useTranslations("Recreate");
  // Controlled inputs, so they aren't reset when the action fails
  const [items, setItems] = useState<SharedVariableItem[]>(() => variables.map(variable => ({
    ...variable,
    uid: variable.id,
  })));
  const [recreate, setRecreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSaving(false);
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
      <SharedVariablesRepeater items={items} onChange={setItems} source={source} disabled={isSaving} />
      <RecreateSubmit
        options={canRecreate ? [{
          name: "recreate",
          label: tRecreate("linkedServices"),
          checked: recreate,
          onChange: setRecreate,
        }] : []}
        help={tRecreate(canRecreate && recreate ? "linkedHelp.now" : "linkedHelp.later")}
        submitLabel={isSaving ? t("saving") : t("save")}
        isSaving={isSaving}
      />
    </Form>
  );
};

export default SharedVariablesForm;
