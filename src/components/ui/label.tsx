import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { LabelHTMLAttributes } from "react";

export type LabelProps = LabelHTMLAttributes<HTMLLabelElement>;

/* eslint-disable jsx-a11y/label-has-associated-control */
const Label = ({ className, ...props }: LabelProps) => (
  <label
    className={cn(
      "block text-xs font-semibold uppercase tracking-wider text-slate-300",
      className,
    )}
    {...props}
  />
);
/* eslint-enable jsx-a11y/label-has-associated-control */

export default Label;
