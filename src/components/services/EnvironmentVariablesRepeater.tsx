"use client";

import { faKey } from "@fortawesome/free-solid-svg-icons/faKey";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type EnvironmentVariableItem = {
  id?: string,
  key: string,
  value: string,
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
  emptyMessage?: string,
};

export type EnvironmentVariablesRepeaterProps = {
  items?: EnvironmentVariableItem[],
  onChange?: (items: EnvironmentVariableItem[]) => void,
  disabled?: boolean,
  labels?: EnvironmentVariablesRepeaterLabels,
  className?: string,
};

const createEmptyVariable = (): EnvironmentVariableItem => ({
  id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(),
  key: "",
  value: "",
});

const EnvironmentVariablesRepeater = ({
  items: controlledItems,
  onChange,
  disabled = false,
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

  const handleChange = (index: number, field: "key" | "value", value: string) => {
    const next = internalItems.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        [field]: value,
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
  const emptyMessage = labels?.emptyMessage ?? "No environment variables configured.";

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
          <div className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2 px-1 text-xs font-medium text-slate-400">
            <span>{keyLabel}</span>
            <span className="w-4" />
            <span>{valueLabel}</span>
            <span className="w-8" />
          </div>
          {internalItems.map((item, index) => {
            const key = item.id ?? `env-${index}`;
            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"
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
                    onChange={e => handleChange(index, "key", e.target.value)}
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
                    type="text"
                    size="sm"
                    className="font-mono text-xs"
                    placeholder={valuePlaceholder}
                    value={item.value}
                    onChange={e => handleChange(index, "value", e.target.value)}
                    disabled={disabled}
                  />
                </div>
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
        </div>
      )}
    </div>
  );
};

export default EnvironmentVariablesRepeater;
