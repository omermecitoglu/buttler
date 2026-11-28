"use client";

import { type ReactNode, useId, useState } from "react";
import Button, { type ButtonProps } from "~/components/ui/button";
import Label from "~/components/ui/label";
import type { ContainerState } from "~/utils/containerState";

export type RecreateOption = {
  /** The field that is sent with "on" when it's checked */
  name: string,
  label: string,
  checked: boolean,
  onChange: (checked: boolean) => void,
};

export type RecreateSubmitProps = {
  /** The checkboxes that recreate containers when the form is saved, the ones that can't be used are left out */
  options: RecreateOption[],
  /** Tells when the changes are applied */
  help?: ReactNode,
  submitLabel: string,
  /** The look of the submit button, a primary button by default */
  submitProps?: Pick<ButtonProps, "variant" | "size" | "className" | "aria-label">,
  isSaving: boolean,
  /** Other buttons, before the submit button */
  children?: ReactNode,
};

/** The submit button of a form with the checkboxes that decide whether it recreates containers */
const RecreateSubmit = ({ options, help, submitLabel, submitProps, isSaving, children }: RecreateSubmitProps) => {
  const idPrefix = useId();
  // React resets the form after an action, which unchecks the checkboxes without updating their state
  const [resetKey, setResetKey] = useState(0);
  const [wasSaving, setWasSaving] = useState(isSaving);
  if (wasSaving !== isSaving) {
    setWasSaving(isSaving);
    if (!isSaving) setResetKey(key => key + 1);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {help && <p className="text-xs text-slate-500">{help}</p>}
      <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-2 sm:ml-auto sm:shrink-0">
        {/* The checkboxes may show a reset state until they are mounted again, so the values come from the state */}
        {options.map(option => option.checked && <input key={option.name} type="hidden" name={option.name} value="on" />)}
        {options.map(option => (
          <div key={option.name} className="flex items-center gap-2">
            <input
              key={resetKey}
              id={`${idPrefix}-${option.name}`}
              type="checkbox"
              checked={option.checked}
              onChange={event => option.onChange(event.target.checked)}
              disabled={isSaving}
              className="size-4 shrink-0 rounded border-slate-700 bg-slate-900 accent-sky-500"
            />
            <Label htmlFor={`${idPrefix}-${option.name}`} className="font-normal tracking-normal normal-case">
              {option.label}
            </Label>
          </div>
        ))}
        <div className="flex shrink-0 gap-2">
          {children}
          <Button type="submit" variant="primary" size="sm" {...submitProps} pending={isSaving}>{submitLabel}</Button>
        </div>
      </div>
    </div>
  );
};

export default RecreateSubmit;

/** Tells when the changes are applied to the container, the keys of `Recreate.help` */
export function getRecreateHelpKey(state: ContainerState, recreate: boolean) {
  if (state === "stopped") return "onStart";
  if (state === "busy") return "onDeploy";
  return recreate ? "now" : "onRestart";
}
