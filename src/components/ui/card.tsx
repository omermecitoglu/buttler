import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { HTMLAttributes } from "react";

export type CardProps = HTMLAttributes<HTMLDivElement>;

const Card = ({ className, ...props }: CardProps) => (
  <div
    className={cn(
      "w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-md",
      className,
    )}
    {...props}
  />
);

export default Card;
