"use client";

import { cn } from "@omer-x/tailwind-ui-kit/utils";
import { type ComponentProps, useLayoutEffect, useRef } from "react";

export type TextareaProps = ComponentProps<"textarea"> & {
  size?: "sm" | "md",
  /** Grows with its content, starting from the height of a single line */
  autoGrow?: boolean,
};

const Textarea = ({ className, size = "md", autoGrow = false, rows, value, ...props }: TextareaProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!autoGrow || !element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight + element.offsetHeight - element.clientHeight}px`;
  }, [autoGrow, value]);

  return (
    <textarea
      ref={ref}
      rows={rows ?? (autoGrow ? 1 : undefined)}
      value={value}
      className={cn(
        {
          "min-h-9 px-3 py-2 text-sm leading-5": size === "md",
          "min-h-8 px-2.5 py-[7px] text-xs leading-4": size === "sm",
          "resize-none overflow-hidden": autoGrow,
        },
        "block w-full rounded-md outline-2 outline-offset-2 outline-transparent transition-colors",
        "border border-slate-700 bg-slate-900/90 text-slate-100 placeholder:text-slate-500 shadow-xs",
        "hover:border-slate-600",
        "focus:border-slate-400 focus:outline-slate-400 focus-visible:outline-slate-400",
        "disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950",
        "disabled:text-slate-600 disabled:placeholder:text-slate-700",
        className,
      )}
      {...props}
    />
  );
};

export default Textarea;
