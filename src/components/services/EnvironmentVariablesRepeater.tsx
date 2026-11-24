"use client";

import { faKey } from "@fortawesome/free-solid-svg-icons/faKey";
import { faLock } from "@fortawesome/free-solid-svg-icons/faLock";
import { faLockOpen } from "@fortawesome/free-solid-svg-icons/faLockOpen";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import Select from "~/components/ui/select";
import { type EnvironmentVariableScope, environmentVariableScopes } from "~/core/environment-variables";

export type EnvironmentVariableItem = {
  id?: string,
  key: string,
  value: string,
  scope: EnvironmentVariableScope,
  isSecret: boolean,
  /** Key of the saved secret, which is kept if a new value is not entered */
  savedSecretKey?: string,
};

export type EnvironmentVariablesRepeaterLabels = {
  title?: string,
  description?: string,
  addButton?: string,
  removeButton?: string,
  keyLabel?: string,
  keyPlaceholder?: string,
  valueLabel?: string,
  valuePlaceholder?: string,
  scopeLabel?: string,
  scopes?: Record<EnvironmentVariableScope, string>,
  scopeHelp?: string,
  secretLabel?: string,
  savedSecretPlaceholder?: string,
  emptyMessage?: string,
};

export type EnvironmentVariablesRepeaterProps = {
  items?: EnvironmentVariableItem[],
  onChange?: (items: EnvironmentVariableItem[]) => void,
  disabled?: boolean,
  /** Whether the service has a build step, which the variables can be used in */
  hasBuild?: boolean,
  labels?: EnvironmentVariablesRepeaterLabels,
  className?: string,
};

const createEmptyVariable = (): EnvironmentVariableItem => ({
  id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(),
  key: "",
  value: "",
  scope: "runtime",
  isSecret: false,
});

const EnvironmentVariablesRepeater = ({
  items: controlledItems,
  onChange,
  disabled = false,
  hasBuild = true,
  labels,
  className,
}: EnvironmentVariablesRepeaterProps) => {
  const [internalItems, setInternalItems] = useState<EnvironmentVariableItem[]>(controlledItems ?? []);

  useEffect(() => {
    if (controlledItems !== undefined) {
      setInternalItems(controlledItems);
    }
  }, [controlledItems]);

  const updateItems = (nextItems: EnvironmentVariableItem[]) => {
    setInternalItems(nextItems);
    onChange?.(nextItems);
  };

  const handleAdd = () => {
    updateItems([...internalItems, createEmptyVariable()]);
  };

  const handleRemove = (indexToRemove: number) => {
    updateItems(internalItems.filter((_, idx) => idx !== indexToRemove));
  };

  const handleChange = (index: number, changes: Partial<Omit<EnvironmentVariableItem, "id">>) => {
    const next = internalItems.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        ...changes,
      };
    });
    updateItems(next);
  };

  const title = labels?.title ?? "Environment Variables";
  const description = labels?.description ?? "Configure runtime environment variables and secrets.";
  const addButton = labels?.addButton ?? "Add Variable";
  const removeButton = labels?.removeButton ?? "Remove variable";
  const keyLabel = labels?.keyLabel ?? "Key";
  const keyPlaceholder = labels?.keyPlaceholder ?? "e.g. DATABASE_URL";
  const valueLabel = labels?.valueLabel ?? "Value";
  const valuePlaceholder = labels?.valuePlaceholder ?? "e.g. postgres://...";
  const scopeLabel = labels?.scopeLabel ?? "Available in";
  const scopes = labels?.scopes ?? { build: "Build", runtime: "Runtime", both: "Both" };
  const scopeHelp = labels?.scopeHelp;
  const secretLabel = labels?.secretLabel ?? "Secret";
  const emptyMessage = labels?.emptyMessage ?? "No environment variables configured.";

  const columns = hasBuild
    ? "grid-cols-[1fr_auto_1fr_7rem_2.5rem_2.5rem]"
    : "grid-cols-[1fr_auto_1fr_2.5rem_2.5rem]";

  return (
    <div className={cn("space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faKey} className="size-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
          </div>
          {description && (
            <p className="mt-0.5 text-xs text-slate-400">{description}</p>
          )}
        </div>
        <Button
          type="button"
          variant="secondary"
          size="xs"
          onClick={handleAdd}
          disabled={disabled}
          className="gap-1.5"
        >
          <FontAwesomeIcon icon={faPlus} className="size-3" />
          <span>{addButton}</span>
        </Button>
      </div>
      {internalItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-md border border-dashed border-slate-800 py-6 text-center">
          <p className="text-xs text-slate-500">{emptyMessage}</p>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={handleAdd}
            disabled={disabled}
            className="mt-2 text-slate-400 hover:text-slate-200"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-1 size-3" />
            <span>{addButton}</span>
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className={cn("grid items-center gap-2 px-1 text-xs font-medium text-slate-400", columns)}>
            <span>{keyLabel}</span>
            <span className="w-4" />
            <span>{valueLabel}</span>
            {hasBuild && <span>{scopeLabel}</span>}
            <span className="text-center">{secretLabel}</span>
            <span />
          </div>
          {internalItems.map((item, index) => {
            const key = item.id ?? `env-${index}`;
            return (
              <div
                key={key}
                className={cn("grid items-center gap-2", columns)}
              >
                <div>
                  <Label htmlFor={`env-key-${index}`} className="sr-only">
                    {keyLabel}
                  </Label>
                  <Input
                    id={`env-key-${index}`}
                    type="text"
                    size="sm"
                    className="font-mono text-xs uppercase"
                    placeholder={keyPlaceholder}
                    value={item.key}
                    onChange={e => handleChange(index, { key: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                <span className="text-center font-mono text-xs text-slate-500 select-none">=</span>
                <div>
                  <Label htmlFor={`env-val-${index}`} className="sr-only">
                    {valueLabel}
                  </Label>
                  <Input
                    id={`env-val-${index}`}
                    type={item.isSecret ? "password" : "text"}
                    autoComplete={item.isSecret ? "new-password" : "off"}
                    size="sm"
                    className="font-mono text-xs"
                    placeholder={item.isSecret && item.savedSecretKey === item.key.trim() && labels?.savedSecretPlaceholder
                      ? labels.savedSecretPlaceholder
                      : valuePlaceholder}
                    value={item.value}
                    onChange={e => handleChange(index, { value: e.target.value })}
                    disabled={disabled}
                  />
                </div>
                {hasBuild && (
                  <div>
                    <Label htmlFor={`env-scope-${index}`} className="sr-only">
                      {scopeLabel}
                    </Label>
                    <Select
                      id={`env-scope-${index}`}
                      className="text-xs"
                      value={item.scope}
                      onChange={e => handleChange(index, { scope: e.target.value as EnvironmentVariableScope })}
                      disabled={disabled}
                    >
                      {environmentVariableScopes.map(scope => (
                        <option key={scope} value={scope}>{scopes[scope]}</option>
                      ))}
                    </Select>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleChange(index, { isSecret: !item.isSecret })}
                  disabled={disabled}
                  aria-label={secretLabel}
                  aria-pressed={item.isSecret}
                  title={secretLabel}
                  className={item.isSecret ? "text-amber-400 hover:text-amber-300" : "text-slate-500 hover:text-slate-200"}
                >
                  <FontAwesomeIcon icon={item.isSecret ? faLock : faLockOpen} className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => handleRemove(index)}
                  disabled={disabled}
                  aria-label={removeButton}
                  className="text-slate-400 hover:bg-rose-500/10 hover:text-rose-400"
                >
                  <FontAwesomeIcon icon={faTrash} className="size-3.5" />
                </Button>
              </div>
            );
          })}
          {hasBuild && scopeHelp && (
            <p className="px-1 text-xs text-slate-500">{scopeHelp}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default EnvironmentVariablesRepeater;
