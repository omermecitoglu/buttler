import type { ReactNode } from "react";

type AuthLayoutProps = {
  children: ReactNode,
};

const AuthLayout = ({
  children,
}: AuthLayoutProps) => (
  <div className="flex min-h-screen items-center justify-center p-4">
    {children}
  </div>
);

export default AuthLayout;
