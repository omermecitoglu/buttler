"use client";

import { faHardDrive } from "@fortawesome/free-solid-svg-icons/faHardDrive";
import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faTrash } from "@fortawesome/free-solid-svg-icons/faTrash";
import { faTriangleExclamation } from "@fortawesome/free-solid-svg-icons/faTriangleExclamation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useEffect, useState } from "react";
import Button from "~/components/ui/button";
import Input from "~/components/ui/input";
import Label from "~/components/ui/label";
import Select from "~/components/ui/select";
import type { VolumeOptions } from "~/data/services";

export type VolumeMountItem = {
  id?: string,
  containerPath: string,
  name?: string,
  /** Whether the volume is picked from the ones that Buttler created, or its name is typed */
  source?: "new" | "existing",
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
  sourceLabel?: string,
  newVolume?: string,
  existingVolume?: string,
  chooseVolume?: string,
  sharedWarning?: (services: string[]) => string,
};

export type VolumeMountsRepeaterProps = {
  items?: VolumeMountItem[],
  onChange?: (items: VolumeMountItem[]) => void,
  disabled?: boolean,
  labels?: VolumeMountsRepeaterLabels,
  options?: VolumeOptions,
  className?: string,
};

const createEmptyVolume = (): VolumeMountItem => ({
  id: typeof crypto !== "undefined" ? crypto.randomUUID() : Math.random().toString(),
  containerPath: "",
  name: "",
  source: "new",
});

const VolumeMountsRepeater = ({
  items: controlledItems,
  onChange,
  disabled = false,
  labels,
  options = { existing: [], usedBy: {} },
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

  const handleChange = (index: number, field: "containerPath" | "name" | "source", value: string) => {
    const next = internalItems.map((item, idx) => {
      if (idx !== index) return item;
      // A typed name is not one of the existing volumes, so it isn't kept
      if (field === "source") return { ...item, source: value as VolumeMountItem["source"], name: "" };
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
  const sourceLabel = labels?.sourceLabel ?? "Volume";
  const newVolume = labels?.newVolume ?? "New";
  const existingVolume = labels?.existingVolume ?? "Existing";
  const chooseVolume = labels?.chooseVolume ?? "Choose a volume";
  const sharedWarning = labels?.sharedWarning ??
    ((services: string[]) => `Also used by ${services.join(", ")}, they share its data.`);

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
            const isExisting = item.source === "existing";
            const otherServices = options.usedBy[(item.name ?? "").trim()] ?? [];
            return (
              <div key={key} className="space-y-1">
                <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
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
                  <div className="flex gap-2">
                    <Label htmlFor={`vol-source-${index}`} className="sr-only">
                      {sourceLabel}
                    </Label>
                    <Select
                      id={`vol-source-${index}`}
                      className="h-8 w-28 shrink-0 text-xs"
                      value={isExisting ? "existing" : "new"}
                      onChange={e => handleChange(index, "source", e.target.value)}
                      disabled={disabled}
                    >
                      <option value="new">{newVolume}</option>
                      <option value="existing" disabled={options.existing.length === 0}>{existingVolume}</option>
                    </Select>
                    <Label htmlFor={`vol-name-${index}`} className="sr-only">
                      {volumeNameLabel}
                    </Label>
                    {isExisting ? (
                      <Select
                        id={`vol-name-${index}`}
                        className="h-8 min-w-0 text-xs"
                        value={item.name ?? ""}
                        onChange={e => handleChange(index, "name", e.target.value)}
                        disabled={disabled}
                      >
                        <option value="" disabled>{chooseVolume}</option>
                        {options.existing.map(name => (
                          <option key={name} value={name}>{name}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={`vol-name-${index}`}
                        type="text"
                        size="sm"
                        className="min-w-0"
                        placeholder={volumeNamePlaceholder}
                        value={item.name ?? ""}
                        onChange={e => handleChange(index, "name", e.target.value)}
                        disabled={disabled}
                      />
                    )}
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
                {otherServices.length > 0 && (
                  <p className="flex items-center gap-1.5 px-1 text-xs text-amber-400">
                    <FontAwesomeIcon icon={faTriangleExclamation} className="size-3" />
                    <span>{sharedWarning(otherServices)}</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VolumeMountsRepeater;
