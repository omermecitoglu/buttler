import { BaseInput } from "@omer-x/tailwind-ui-kit/form";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { ComponentProps } from "react";

export type InputProps = ComponentProps<typeof BaseInput>;

const Input = ({ className, size = "md", ...props }: InputProps) => (
  <BaseInput
    size={size}
    className={cn(
      "w-full border border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 shadow-xs",
      "hover:border-slate-600",
      "focus:border-slate-400 focus:outline-slate-400 focus-visible:outline-slate-400",
      "disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950",
      "disabled:text-slate-600 disabled:placeholder:text-slate-700",
      className,
    )}
    {...props}
  />
);

export default Input;
