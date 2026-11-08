import { BaseButton } from "@omer-x/tailwind-ui-kit/button";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { ComponentProps } from "react";

type BaseButtonProps = ComponentProps<typeof BaseButton>;

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";

export type ButtonProps = BaseButtonProps & {
  variant?: ButtonVariant,
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-slate-100 text-slate-950 font-semibold shadow-xs",
    "hover:bg-white active:bg-slate-200",
    "focus-visible:outline-slate-400",
    "disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed",
  ),
  secondary: cn(
    "bg-slate-800 text-slate-100 border border-slate-700 font-medium shadow-xs",
    "hover:bg-slate-700 hover:border-slate-600 active:bg-slate-800",
    "focus-visible:outline-slate-500",
    "disabled:bg-slate-900 disabled:text-slate-600 disabled:border-slate-800 disabled:cursor-not-allowed",
  ),
  outline: cn(
    "border border-slate-700 text-slate-200 font-medium",
    "hover:bg-slate-800/80 hover:text-white hover:border-slate-600 active:bg-slate-800",
    "focus-visible:outline-slate-500",
    "disabled:border-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed",
  ),
  ghost: cn(
    "text-slate-300 font-medium",
    "hover:bg-slate-800/60 hover:text-white active:bg-slate-800",
    "focus-visible:outline-slate-500",
    "disabled:text-slate-600 disabled:cursor-not-allowed",
  ),
  danger: cn(
    "bg-rose-600 text-white font-semibold shadow-xs",
    "hover:bg-rose-500 active:bg-rose-700",
    "focus-visible:outline-rose-400",
    "disabled:bg-rose-950/60 disabled:text-rose-800 disabled:cursor-not-allowed",
  ),
};

const Button = ({
  variant = "primary",
  className,
  ...props
}: ButtonProps) => (
  <BaseButton
    className={cn(variantClasses[variant], className)}
    {...props}
  />
);

export default Button;
