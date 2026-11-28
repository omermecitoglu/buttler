"use client";

import Tooltip from "~/components/ui/tooltip";
import type { ReactElement } from "react";

export type DisabledReasonProps = {
  /** Shown on hover, nothing is wrapped without it */
  reason: string | null | undefined,
  /** The disabled control */
  children: ReactElement,
};

/** A disabled button gets no pointer events, so the tooltip is on a wrapper that lets them through */
const DisabledReason = ({ reason, children }: DisabledReasonProps) => {
  if (!reason) return children;
  return (
    <Tooltip content={reason}>
      <span className="inline-flex cursor-not-allowed *:pointer-events-none">{children}</span>
    </Tooltip>
  );
};

export default DisabledReason;
