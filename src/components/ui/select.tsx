import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { ComponentProps } from "react";

export type SelectProps = ComponentProps<"select">;

const Select = ({ className, ...props }: SelectProps) => (
  <select
    className={cn(
      "h-9 w-full rounded-md border border-slate-700 bg-slate-900/90 px-2 text-sm text-slate-100 shadow-xs",
      "hover:border-slate-600",
      "focus:border-slate-400 focus-visible:outline-2 focus-visible:outline-slate-400",
      "disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950 disabled:text-slate-600",
      className,
    )}
    {...props}
  />
);

export default Select;
