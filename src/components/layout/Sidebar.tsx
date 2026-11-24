import LogoutButton from "~/components/LogoutButton";
import Brand from "~/components/layout/Brand";
import MainNav from "~/components/layout/MainNav";
import type { ReactNode } from "react";

export type SidebarProps = {
  currentUser: ReactNode,
};

const Sidebar = ({ currentUser }: SidebarProps) => (
  <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 lg:flex">
    <div className="flex h-16 shrink-0 items-center px-5">
      <Brand />
    </div>
    <MainNav />
    <div className="flex items-center gap-2 border-t border-slate-800 p-3">
      {currentUser}
      <LogoutButton />
    </div>
  </aside>
);

export default Sidebar;
