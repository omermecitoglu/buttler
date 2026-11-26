import Image from "next/image";
import logo from "~/assets/logo.png";
import { Link } from "~/i18n/navigation";

const Brand = () => (
  <Link
    href="/"
    className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-500"
  >
    {/* The ornate frame is illegible at this size, so the portrait is zoomed in */}
    <span className="size-8 shrink-0 overflow-hidden rounded-full bg-white">
      <Image src={logo} alt="" width={64} height={64} className="size-full scale-130" />
    </span>
    <span className="text-base font-semibold tracking-tight text-slate-100">Buttler</span>
  </Link>
);

export default Brand;
