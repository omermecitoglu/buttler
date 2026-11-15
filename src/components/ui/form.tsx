import { BaseForm } from "@omer-x/tailwind-ui-kit/form";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { ComponentProps } from "react";

export type FormProps = ComponentProps<typeof BaseForm>;

const Form = ({
  className,
  children,
  ...otherProps
}: FormProps) => (
  <BaseForm
    {...otherProps}
    className={cn("grid justify-items-start gap-6", className)}
    renderMessages={(
      <div
        className={cn(
          "w-full flex items-start gap-3 rounded-md px-4 py-3 text-sm",
          "data-[message-type=default]:bg-slate-800 data-[message-type=default]:text-slate-200",
          "data-[message-type=error]:border data-[message-type=error]:border-rose-500/20",
          "data-[message-type=error]:bg-rose-500/10 data-[message-type=error]:text-rose-400",
          "data-[message-type=info]:border data-[message-type=info]:border-sky-500/20",
          "data-[message-type=info]:bg-sky-500/10 data-[message-type=info]:text-sky-400",
          "data-[message-type=success]:border data-[message-type=success]:border-emerald-500/20",
          "data-[message-type=success]:bg-emerald-500/10 data-[message-type=success]:text-emerald-400",
          "data-[message-type=warning]:border data-[message-type=warning]:border-amber-500/20",
          "data-[message-type=warning]:bg-amber-500/10 data-[message-type=warning]:text-amber-400",
        )}
      />
    )}
  >
    {children}
  </BaseForm>
);

export default Form;
