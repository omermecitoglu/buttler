import LogoutButton from "~/components/LogoutButton";
import Brand from "~/components/layout/Brand";
import MainNav from "~/components/layout/MainNav";

const Sidebar = () => (
  <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-900/50 lg:flex">
    <div className="flex h-16 shrink-0 items-center px-5">
      <Brand />
    </div>
    <MainNav />
    <div className="border-t border-slate-800 p-3">
      <LogoutButton />
    </div>
  </aside>
);

export default Sidebar;
