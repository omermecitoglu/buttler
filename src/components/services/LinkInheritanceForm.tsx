"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import RecreateSubmit, { getRecreateHelpKey } from "~/components/services/RecreateSubmit";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import type { ContainerState } from "~/utils/containerState";

export type LinkInheritanceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  /** The service on the other side, which shares the variables */
  sourceName: string,
  variables: { id: string, key: string }[],
  inherits: boolean,
  names: { sharedVariableId: string, name: string }[],
  /** Names that the service already inherits through its other links */
  takenNames: string[],
  /** The container of this service */
  containerState: ContainerState,
};

const LinkInheritanceForm = ({
  action,
  sourceName,
  variables,
  inherits: savedInherits,
  names: savedNames,
  takenNames,
  containerState,
}: LinkInheritanceFormProps) => {
  const t = useTranslations("ServicePage.links.inheritance");
  const tRecreate = useTranslations("Recreate");
  const idPrefix = useId();
  // Controlled inputs, so they aren't reset when the action fails
  const [inherits, setInherits] = useState(savedInherits);
  const [names, setNames] = useState<Partial<Record<string, string>>>(() => {
    return Object.fromEntries(savedNames.map(({ sharedVariableId, name }) => [sharedVariableId, name]));
  });
  const [recreate, setRecreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // React resets the form after an action, which unchecks the checkboxes without updating their state
  const [submitCount, setSubmitCount] = useState(0);

  const getName = (variable: { id: string, key: string }) => names[variable.id]?.trim() || variable.key;
  const finalNames = variables.map(getName);

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
    update_failed: t("messages.update_failed"),
    recreate_failed: t("messages.recreate_failed"),
    duplicate_names: t("messages.duplicate_names"),
    INVALID_NAMES: t("messages.invalid_names"),
  };

  if (variables.length === 0 && !savedInherits) {
    return <p className="text-xs text-slate-500">{t("nothingShared", { name: sourceName })}</p>;
  }

  return (
    <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-3">
      <input
        type="hidden"
        name="names"
        value={JSON.stringify(variables.flatMap(variable => {
          const name = names[variable.id]?.trim();
          return name && name !== variable.key ? [{ sharedVariableId: variable.id, name }] : [];
        }))}
      />
      {/* The checkboxes may show a reset state until they are mounted again, so the values come from the state */}
      {inherits && <input type="hidden" name="inherits" value="on" />}
      <div className="flex items-start gap-2">
        <input
          key={submitCount}
          id={`${idPrefix}-inherits`}
          type="checkbox"
          checked={inherits}
          onChange={event => setInherits(event.target.checked)}
          disabled={isSaving}
          className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
        />
        <Label htmlFor={`${idPrefix}-inherits`} className="font-normal tracking-normal normal-case">
          {t("inherit", { name: sourceName })}
        </Label>
      </div>
      {inherits && variables.length > 0 && (
        <ul className="space-y-2 pl-6">
          {variables.map((variable, index) => {
            const name = finalNames[index];
            const isDuplicate = finalNames.indexOf(name) !== index || takenNames.includes(name);
            return (
              <li key={variable.id} className="space-y-1">
                <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                  <code className="truncate font-mono text-xs text-slate-300">{variable.key}</code>
                  <span className="font-mono text-xs text-slate-500 select-none">→</span>
                  <div>
                    <Label htmlFor={`${idPrefix}-name-${variable.id}`} className="sr-only">
                      {t("nameLabel", { key: variable.key })}
                    </Label>
                    <Input
                      id={`${idPrefix}-name-${variable.id}`}
                      type="text"
                      size="sm"
                      className="font-mono text-xs"
                      placeholder={t("keepName")}
                      value={names[variable.id] ?? ""}
                      onChange={event => setNames({ ...names, [variable.id]: event.target.value })}
                      disabled={isSaving}
                    />
                  </div>
                </div>
                {isDuplicate && <p className="text-xs text-rose-400">{t("duplicateName", { name })}</p>}
              </li>
            );
          })}
        </ul>
      )}
      <RecreateSubmit
        options={containerState === "running" ? [{
          name: "recreate",
          label: tRecreate("container"),
          checked: recreate,
          onChange: setRecreate,
        }] : []}
        help={tRecreate(`help.${getRecreateHelpKey(containerState, recreate)}`)}
        submitLabel={isSaving ? t("saving") : t("save")}
        isSaving={isSaving}
      />
    </Form>
  );
};

export default LinkInheritanceForm;
