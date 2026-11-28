"use client";

import { useTranslations } from "next-intl";
import { type ReactNode, useId, useState } from "react";
import RecreateSubmit, { getRecreateHelpKey } from "~/components/services/RecreateSubmit";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import type { ContainerState } from "~/utils/containerState";

export type LinkInheritanceItem = {
  linkId: string,
  /** The linked service and the button that removes the link */
  header: ReactNode,
  /** Links to system services are made by Buttler, they can't be changed */
  inheritance: {
    /** The service on the other side, which shares the variables */
    sourceName: string,
    variables: { id: string, key: string }[],
    inherits: boolean,
    names: { sharedVariableId: string, name: string }[],
  } | null,
};

export type LinksInheritanceFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  links: LinkInheritanceItem[],
  /** Names that the service inherits through the links that can't be changed */
  takenNames: string[],
  /** The container of this service */
  containerState: ContainerState,
};

type LinkState = {
  inherits: boolean,
  names: Partial<Record<string, string>>,
};

function getSavedState(inheritance: NonNullable<LinkInheritanceItem["inheritance"]>): LinkState {
  return {
    inherits: inheritance.inherits,
    names: Object.fromEntries(inheritance.names.map(({ sharedVariableId, name }) => [sharedVariableId, name])),
  };
}

/** What the service inherits through each of its links, saved together so the container is recreated once */
const LinksInheritanceForm = ({ action, links, takenNames, containerState }: LinksInheritanceFormProps) => {
  const t = useTranslations("ServicePage.links.inheritance");
  const tRecreate = useTranslations("Recreate");
  const idPrefix = useId();
  // Controlled inputs, outside of the form, so they aren't reset when the action fails.
  // Only the links that were changed are here, a link that was added later starts with what is saved.
  const [states, setStates] = useState<Partial<Record<string, LinkState>>>({});
  const [recreate, setRecreate] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const editable = links.flatMap(({ linkId, inheritance }) => {
    if (!inheritance) return [];
    const state = states[linkId] ?? getSavedState(inheritance);
    return [{ linkId, inheritance, state }];
  });
  const getName = (state: LinkState, variable: { id: string, key: string }) => {
    return state.names[variable.id]?.trim() || variable.key;
  };
  // The unsaved changes of the other links count too
  const inheritedNames = [
    ...takenNames,
    ...editable.flatMap(({ inheritance, state }) => {
      return state.inherits ? inheritance.variables.map(variable => getName(state, variable)) : [];
    }),
  ];
  const hasFields = editable.some(({ inheritance }) => inheritance.variables.length > 0 || inheritance.inherits);
  const isDuplicate = (name: string) => inheritedNames.filter(other => other === name).length > 1;

  const update = (linkId: string, state: LinkState, change: Partial<LinkState>) => {
    setStates({ ...states, [linkId]: { ...state, ...change } });
  };

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
    update_failed: t("messages.update_failed"),
    recreate_failed: t("messages.recreate_failed"),
    duplicate_names: t("messages.duplicate_names"),
    INVALID_LINKS: t("messages.invalid_links"),
  };

  const renderInheritance = ({ linkId, inheritance, state }: typeof editable[number]) => {
    if (inheritance.variables.length === 0 && !inheritance.inherits) {
      return <p className="text-xs text-slate-500">{t("nothingShared", { name: inheritance.sourceName })}</p>;
    }
    return (
      <div className="space-y-3">
        <div className="flex items-start gap-2">
          <input
            id={`${idPrefix}-${linkId}-inherits`}
            type="checkbox"
            checked={state.inherits}
            onChange={event => update(linkId, state, { inherits: event.target.checked })}
            disabled={isSaving}
            className="mt-0.5 size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
          />
          <Label htmlFor={`${idPrefix}-${linkId}-inherits`} className="font-normal tracking-normal normal-case">
            {t("inherit", { name: inheritance.sourceName })}
          </Label>
        </div>
        {state.inherits && inheritance.variables.length > 0 && (
          <ul className="space-y-2 pl-6">
            {inheritance.variables.map(variable => {
              const name = getName(state, variable);
              const inputId = `${idPrefix}-${linkId}-name-${variable.id}`;
              return (
                <li key={variable.id} className="space-y-1">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                    <code className="truncate font-mono text-xs text-slate-300">{variable.key}</code>
                    <span className="font-mono text-xs text-slate-500 select-none">→</span>
                    <div>
                      <Label htmlFor={inputId} className="sr-only">{t("nameLabel", { key: variable.key })}</Label>
                      <Input
                        id={inputId}
                        type="text"
                        size="sm"
                        className="font-mono text-xs"
                        placeholder={t("keepName")}
                        value={state.names[variable.id] ?? ""}
                        onChange={event => update(linkId, state, {
                          names: { ...state.names, [variable.id]: event.target.value },
                        })}
                        disabled={isSaving}
                      />
                    </div>
                  </div>
                  {isDuplicate(name) && <p className="text-xs text-rose-400">{t("duplicateName", { name })}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <ul className="divide-y divide-slate-800/80">
        {links.map(({ linkId, header }) => {
          const item = editable.find(editableLink => editableLink.linkId === linkId);
          return (
            <li key={linkId} className="space-y-3 py-3">
              {header}
              {item && renderInheritance(item)}
            </li>
          );
        })}
      </ul>
      {hasFields && (
        <Form action={handleAction} messages={messages} className="flex w-full flex-col items-stretch gap-4">
          <input
            type="hidden"
            name="links"
            value={JSON.stringify(editable.map(({ linkId, inheritance, state }) => ({
              linkId,
              inherits: state.inherits,
              names: inheritance.variables.flatMap(variable => {
                const name = state.names[variable.id]?.trim();
                return name && name !== variable.key ? [{ sharedVariableId: variable.id, name }] : [];
              }),
            })))}
          />
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
      )}
    </div>
  );
};

export default LinksInheritanceForm;
