"use client";

import { faNetworkWired } from "@fortawesome/free-solid-svg-icons/faNetworkWired";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type PortMappingItem = {
  id?: string,
  external: number | string,
  internal: number | string,
};

export type PortMappingsRepeaterLabels = {
  title?: string,
  description?: string,
  addButton?: string,
  removeButton?: string,
  hostPortLabel?: string,
  hostPortPlaceholder?: string,
  containerPortLabel?: string,
  containerPortPlaceholder?: string,
  emptyMessage?: string,
};

export type PortMappingsRepeaterProps = {
  items?: PortMappingItem[],
  onChange?: (items: PortMappingItem[]) => void,
  disabled?: boolean,
  labels?: PortMappingsRepeaterLabels,
  className?: string,
};

const createEmptyPort = (): PortMappingItem => ({
  id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(),
  external: "",
  internal: "",
});

const PortMappingsRepeater = ({
  items: controlledItems,
  onChange,
  disabled = false,
  labels,
  className,
}: PortMappingsRepeaterProps) => {
  const [internalItems, setInternalItems] = useState<PortMappingItem[]>(controlledItems ?? []);

  useEffect(() => {
    if (controlledItems !== undefined) {
      setInternalItems(controlledItems);
    }
  }, [controlledItems]);

  const updateItems = (nextItems: PortMappingItem[]) => {
    setInternalItems(nextItems);
    onChange?.(nextItems);
  };

  const handleAdd = () => {
    updateItems([...internalItems, createEmptyPort()]);
  };

  const handleRemove = (indexToRemove: number) => {
    updateItems(internalItems.filter((_, idx) => idx !== indexToRemove));
  };

  const handleChange = (index: number, field: "external" | "internal", value: string) => {
    const next = internalItems.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        [field]: value === "" ? "" : Number(value) || value,
      };
    });
    updateItems(next);
  };

  const title = labels?.title ?? "Port Mappings";
  const description = labels?.description ?? "Map host ports to container ports.";
  const addButton = labels?.addButton ?? "Add Port";
  const removeButton = labels?.removeButton ?? "Remove port mapping";
  const hostPortLabel = labels?.hostPortLabel ?? "Host Port";
  const hostPortPlaceholder = labels?.hostPortPlaceholder ?? "e.g. 8080";
  const containerPortLabel = labels?.containerPortLabel ?? "Container Port";
  const containerPortPlaceholder = labels?.containerPortPlaceholder ?? "e.g. 80";
  const emptyMessage = labels?.emptyMessage ?? "No port mappings configured.";

  return (
    <div className={cn("space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faNetworkWired} className="size-4 text-slate-400" />
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
            <span>{hostPortLabel}</span>
            <span className="w-4" />
            <span>{containerPortLabel}</span>
            <span className="w-8" />
          </div>
          {internalItems.map((item, index) => {
            const key = item.id ?? `port-${index}`;
            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2"
              >
                <div>
                  <Label htmlFor={`host-port-${index}`} className="sr-only">
                    {hostPortLabel}
                  </Label>
                  <Input
                    id={`host-port-${index}`}
                    type="number"
                    min={1}
                    max={65535}
                    size="sm"
                    placeholder={hostPortPlaceholder}
                    value={item.external}
                    onChange={e => handleChange(index, "external", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <span className="text-center text-xs text-slate-500 select-none">→</span>
                <div>
                  <Label htmlFor={`container-port-${index}`} className="sr-only">
                    {containerPortLabel}
                  </Label>
                  <Input
                    id={`container-port-${index}`}
                    type="number"
                    min={1}
                    max={65535}
                    size="sm"
                    placeholder={containerPortPlaceholder}
                    value={item.internal}
                    onChange={e => handleChange(index, "internal", e.target.value)}
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

export default PortMappingsRepeater;
