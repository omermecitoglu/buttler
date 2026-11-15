"use client";

import { faHardDrive } from "@fortawesome/free-solid-svg-icons/faHardDrive";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";

export type VolumeMountItem = {
  id?: string,
  containerPath: string,
  name?: string,
};

export type VolumeMountsRepeaterLabels = {
  title?: string,
  description?: string,
  addButton?: string,
  removeButton?: string,
  containerPathLabel?: string,
  containerPathPlaceholder?: string,
  volumeNameLabel?: string,
  volumeNamePlaceholder?: string,
  emptyMessage?: string,
};

export type VolumeMountsRepeaterProps = {
  items?: VolumeMountItem[],
  onChange?: (items: VolumeMountItem[]) => void,
  disabled?: boolean,
  labels?: VolumeMountsRepeaterLabels,
  className?: string,
};

const createEmptyVolume = (): VolumeMountItem => ({
  id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(),
  containerPath: "",
  name: "",
});

const VolumeMountsRepeater = ({
  items: controlledItems,
  onChange,
  disabled = false,
  labels,
  className,
}: VolumeMountsRepeaterProps) => {
  const [internalItems, setInternalItems] = useState<VolumeMountItem[]>(controlledItems ?? []);

  useEffect(() => {
    if (controlledItems !== undefined) {
      setInternalItems(controlledItems);
    }
  }, [controlledItems]);

  const updateItems = (nextItems: VolumeMountItem[]) => {
    setInternalItems(nextItems);
    onChange?.(nextItems);
  };

  const handleAdd = () => {
    updateItems([...internalItems, createEmptyVolume()]);
  };

  const handleRemove = (indexToRemove: number) => {
    updateItems(internalItems.filter((_, idx) => idx !== indexToRemove));
  };

  const handleChange = (index: number, field: "containerPath" | "name", value: string) => {
    const next = internalItems.map((item, idx) => {
      if (idx !== index) return item;
      return {
        ...item,
        [field]: value,
      };
    });
    updateItems(next);
  };

  const title = labels?.title ?? "Storage Mounts";
  const description = labels?.description ?? "Attach persistent Docker volumes to persist data across container restarts.";
  const addButton = labels?.addButton ?? "Add Mount";
  const removeButton = labels?.removeButton ?? "Remove storage mount";
  const containerPathLabel = labels?.containerPathLabel ?? "Container Path";
  const containerPathPlaceholder = labels?.containerPathPlaceholder ?? "e.g. /var/lib/mysql";
  const volumeNameLabel = labels?.volumeNameLabel ?? "Volume Name (optional)";
  const volumeNamePlaceholder = labels?.volumeNamePlaceholder ?? "e.g. db-data (auto-generated if empty)";
  const emptyMessage = labels?.emptyMessage ?? "No storage mounts configured.";

  return (
    <div className={cn("space-y-3 rounded-lg border border-slate-800 bg-slate-900/50 p-4", className)}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <FontAwesomeIcon icon={faHardDrive} className="size-4 text-slate-400" />
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
          <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2 px-1 text-xs font-medium text-slate-400">
            <span>{containerPathLabel}</span>
            <span>{volumeNameLabel}</span>
            <span className="w-8" />
          </div>
          {internalItems.map((item, index) => {
            const key = item.id ?? `vol-${index}`;
            return (
              <div
                key={key}
                className="grid grid-cols-[1fr_1fr_auto] items-center gap-2"
              >
                <div>
                  <Label htmlFor={`vol-path-${index}`} className="sr-only">
                    {containerPathLabel}
                  </Label>
                  <Input
                    id={`vol-path-${index}`}
                    type="text"
                    size="sm"
                    className="font-mono text-xs"
                    placeholder={containerPathPlaceholder}
                    value={item.containerPath}
                    onChange={e => handleChange(index, "containerPath", e.target.value)}
                    disabled={disabled}
                  />
                </div>
                <div>
                  <Label htmlFor={`vol-name-${index}`} className="sr-only">
                    {volumeNameLabel}
                  </Label>
                  <Input
                    id={`vol-name-${index}`}
                    type="text"
                    size="sm"
                    placeholder={volumeNamePlaceholder}
                    value={item.name ?? ""}
                    onChange={e => handleChange(index, "name", e.target.value)}
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

export default VolumeMountsRepeater;
