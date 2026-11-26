"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import TemplateInput from "~/components/services/TemplateInput";
import Button from "~/components/ui/button";
import Form from "~/components/ui/form";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import {
  type SharedVariableSource,
  getUnknownPlaceholders,
  resolveTemplate,
} from "~/core/shared-variables";

export type SharedVariablesFormProps = {
  action: (initialState: unknown, formData: FormData) => Promise<Record<string, string>>,
  variables: { id: string, key: string, template: string }[],
  /** The service itself, secrets have no value */
  source: SharedVariableSource,
  /** The services that inherit the variables, which can be recreated */
  inheritingServices: { id: string, name: string }[],
};

type Item = {
  /** Only for React, the saved ID is `id` */
  uid: string,
  id?: string,
  key: string,
  template: string,
};

const secretMask = "••••••";

const SharedVariablesForm = ({ action, variables, source, inheritingServices }: SharedVariablesFormProps) => {
  const t = useTranslations("ServicePage.links.shared");
  const idPrefix = useId();
  // Controlled inputs, so they aren't reset when the action fails
  const [items, setItems] = useState<Item[]>(() => variables.map(variable => ({ ...variable, uid: variable.id })));
  const [recreate, setRecreate] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  // React resets the form after an action, which unchecks the checkboxes without updating their state
  const [submitCount, setSubmitCount] = useState(0);

  const runtimeKeys = source.variables
    .filter(({ scope }) => scope === "runtime" || scope === "both")
    .map(({ key }) => key);
  const suggestions = ["{host}", ...runtimeKeys.map(key => `{env.${key}}`)];
  const keys = items.map(({ key }) => key.trim());

  const handleAction = async (state: unknown, formData: FormData) => {
    setIsSaving(true);
    try {
      return await action(state, formData);
    } finally {
      setIsSaving(false);
      setSubmitCount(count => count + 1);
    }
  };

  const update = (uid: string, changes: Partial<Item>) => {
    setItems(items.map(item => (item.uid === uid ? { ...item, ...changes } : item)));
  };

  const messages = {
    saved: t("messages.saved"),
    recreated: t("messages.recreated"),
    save_failed: t("messages.save_failed"),
    recreate_failed: t("messages.recreate_failed"),
    duplicate_keys: t("messages.duplicate_keys"),
    invalid_shared_variables: t("messages.invalid_shared_variables"),
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
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{t("empty")}</p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, index) => {
            const resolved = resolveTemplate(item.template, source, secretMask);
            const unknown = getUnknownPlaceholders(item.template);
            const key = item.key.trim();
            const isDuplicate = key !== "" && keys.indexOf(key) !== index;
            return (
              <li key={item.uid} className="space-y-1.5">
                <div className="grid grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)_2.5rem] items-start gap-2">
                  <div>
                    <Label htmlFor={`${idPrefix}-key-${item.uid}`} className="sr-only">{t("keyLabel")}</Label>
                    <Input
                      id={`${idPrefix}-key-${item.uid}`}
                      type="text"
                      size="sm"
                      className="font-mono text-xs"
                      placeholder={t("keyPlaceholder")}
                      value={item.key}
                      onChange={event => update(item.uid, { key: event.target.value })}
                      disabled={isSaving}
                      required
                    />
                  </div>
                  <span className="text-center font-mono text-xs leading-8 text-slate-500 select-none">=</span>
                  <div>
                    <Label htmlFor={`${idPrefix}-template-${item.uid}`} className="sr-only">{t("templateLabel")}</Label>
                    <TemplateInput
                      id={`${idPrefix}-template-${item.uid}`}
                      value={item.template}
                      onChange={template => update(item.uid, { template })}
                      suggestions={suggestions}
                      placeholder={t("templatePlaceholder", { example: "{host}" })}
                      disabled={isSaving}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => setItems(items.filter(({ uid }) => uid !== item.uid))}
                    disabled={isSaving}
                    aria-label={t("remove")}
                    className="text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                  >
                    <FontAwesomeIcon icon={faTrash} className="size-3.5" />
                  </Button>
                </div>
                <p className="font-mono text-xs break-all text-slate-500">
                  {"→ "}
                  {resolved.value === "" ? <span className="italic">{t("emptyValue")}</span> : resolved.value}
                  {resolved.isSecret && <span className="ml-2 font-sans text-amber-400">{t("secret")}</span>}
                </p>
                {isDuplicate && <p className="text-xs text-rose-400">{t("duplicateKey")}</p>}
                {resolved.unset.map(name => (
                  <p key={name} className="flex flex-wrap items-center gap-x-2 text-xs text-amber-400">
                    <span>{t("unset", { name })}</span>
                    <button
                      type="button"
                      className="underline underline-offset-2 hover:text-amber-300"
                      onClick={() => update(item.uid, {
                        template: item.template.replaceAll(`{env.${name}}`, `{env.${name}:-}`),
                      })}
                      disabled={isSaving}
                    >
                      {t("addFallback")}
                    </button>
                  </p>
                ))}
                {unknown.map(placeholder => (
                  <p key={placeholder} className="text-xs text-amber-400">{t("unknown", { placeholder })}</p>
                ))}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs text-slate-500">
        {t("help", { host: "{host}", env: "{env.NAME}", fallback: "{env.NAME:-fallback}" })}
      </p>
      <div>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={() => setItems([...items, { uid: crypto.randomUUID(), key: "", template: "" }])}
          disabled={isSaving}
          className="gap-1.5"
        >
          <FontAwesomeIcon icon={faPlus} className="size-3" />
          <span>{t("add")}</span>
        </Button>
      </div>
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
