"use client";

import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { useTranslations } from "next-intl";
import { useId } from "react";

export type InternetAccessChoiceProps = {
  /** Nothing is chosen without it, the user must pick one */
  value: boolean | null,
  onChange: (hasInternetAccess: boolean) => void,
  disabled?: boolean,
};

const options = [
  { value: true, key: "allowed" },
  { value: false, key: "blocked" },
] as const;

/** Sends "yes" or "no" as `internetAccess` */
const InternetAccessChoice = ({ value, onChange, disabled }: InternetAccessChoiceProps) => {
  const t = useTranslations("ServicePage.internetAccess");
  const idPrefix = useId();

  return (
    <fieldset disabled={disabled} className="grid gap-3 sm:grid-cols-2">
      <legend className="sr-only">{t("title")}</legend>
      {options.map(option => {
        const id = `${idPrefix}-${option.key}`;
        return (
          <div
            key={option.key}
            className={cn(
              "relative flex items-start gap-3 rounded-lg border px-4 py-3 transition-all",
              value === option.value
                ? "border-sky-500 bg-sky-500/10 shadow-xs"
                : "border-slate-800 bg-slate-900/50 hover:border-slate-700",
            )}
          >
            <input
              id={id}
              type="radio"
              name="internetAccess"
              value={option.value ? "yes" : "no"}
              required
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-0.5 size-4 shrink-0 accent-sky-500"
            />
            <div>
              {/* The label covers the whole box, so it can be clicked anywhere */}
              <label htmlFor={id} className="block cursor-pointer text-sm font-medium text-slate-200 after:absolute after:inset-0">
                {t(`${option.key}.label`)}
              </label>
              <p className="mt-1 text-xs text-slate-400">{t(`${option.key}.description`)}</p>
            </div>
          </div>
        );
      })}
    </fieldset>
  );
};

export default InternetAccessChoice;
