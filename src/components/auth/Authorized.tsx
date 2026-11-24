import { requireAdmin, requireUser } from "~/core/auth";
import type { ReactNode } from "react";

export type AuthorizedProps = {
  adminOnly?: boolean,
  children: ReactNode,
};

/**
 * Only renders its content for the users with access. It reads the session, so it needs a `<Suspense>` boundary.
 * Layouts are not rendered again while navigating, so each page must have its own.
 */
const Authorized = async ({ adminOnly = false, children }: AuthorizedProps) => {
  await (adminOnly ? requireAdmin() : requireUser());
  return children;
};

export default Authorized;
