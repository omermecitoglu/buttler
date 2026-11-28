"use client";

import { Tooltip as BaseTooltip } from "@base-ui/react/tooltip";
import { cn } from "@omer-x/tailwind-ui-kit/utils";
import type { ReactElement, ReactNode } from "react";

export type TooltipProps = {
  content: ReactNode,
  /** The element that shows the tooltip, it must accept a ref and the props of the trigger */
  children: ReactElement,
  className?: string,
};

const Tooltip = ({
  content,
  children,
  className,
}: TooltipProps) => (
  <BaseTooltip.Root>
    <BaseTooltip.Trigger render={children} delay={100} />
    <BaseTooltip.Portal>
      <BaseTooltip.Positioner sideOffset={6} className="z-50">
        <BaseTooltip.Popup
          className={cn(
            "max-w-xs rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 shadow-lg",
            "origin-(--transform-origin) transition-[opacity,scale] duration-100",
            "data-starting-style:scale-95 data-starting-style:opacity-0",
            "data-ending-style:scale-95 data-ending-style:opacity-0",
            className,
          )}
        >
          {content}
        </BaseTooltip.Popup>
      </BaseTooltip.Positioner>
    </BaseTooltip.Portal>
  </BaseTooltip.Root>
);

export default Tooltip;
