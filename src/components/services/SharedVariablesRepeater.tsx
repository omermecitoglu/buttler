"use client";

import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useTranslations } from "next-intl";
import { useId } from "react";
import TemplateInput from "~/components/services/TemplateInput";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import {
  type SharedVariableSource,
  getUnknownPlaceholders,
  resolveTemplate,
} from "~/core/shared-variables";

export type SharedVariableItem = {
  /** Only for React, the saved ID is `id` */
  uid: string,
  id?: string,
  key: string,
  template: string,
  /** Shown under the variable, e.g. where it comes from */
  note?: string,
};

export type SharedVariablesRepeaterProps = {
  items: SharedVariableItem[],
  onChange: (items: SharedVariableItem[]) => void,
  /** The service itself, secrets have no value */
  source: SharedVariableSource,
  disabled?: boolean,
};

const secretMask = "••••••";

const SharedVariablesRepeater = ({ items, onChange, source, disabled }: SharedVariablesRepeaterProps) => {
  const t = useTranslations("ServicePage.links.shared");
  const idPrefix = useId();

  const runtimeKeys = source.variables
    .filter(({ scope }) => scope === "runtime" || scope === "both")
    .map(({ key }) => key);
  const suggestions = ["{host}", ...runtimeKeys.map(key => `{env.${key}}`)];
  const keys = items.map(({ key }) => key.trim());

  const update = (uid: string, changes: Partial<SharedVariableItem>) => {
    onChange(items.map(item => (item.uid === uid ? { ...item, ...changes } : item)));
  };

  return (
    <div className="flex flex-col gap-4">
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
                      disabled={disabled}
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
                      disabled={disabled}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => onChange(items.filter(({ uid }) => uid !== item.uid))}
                    disabled={disabled}
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
                {item.note && <p className="text-xs text-sky-400">{item.note}</p>}
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
                      disabled={disabled}
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
          onClick={() => onChange([...items, { uid: crypto.randomUUID(), key: "", template: "" }])}
          disabled={disabled}
          className="gap-1.5"
        >
          <FontAwesomeIcon icon={faPlus} className="size-3" />
          <span>{t("add")}</span>
        </Button>
      </div>
    </div>
  );
};

export default SharedVariablesRepeater;
