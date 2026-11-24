import { Link } from "~/i18n/navigation";

export type AccessMessageProps = {
  title: string,
  description: string,
  href: "/login" | "/services",
  linkLabel: string,
};

const AccessMessage = ({ title, description, href, linkLabel }: AccessMessageProps) => (
  <div className="flex flex-col items-center gap-2 py-16 text-center">
    <h1 className="text-xl font-semibold text-slate-100">{title}</h1>
    <p className="text-sm text-slate-400">{description}</p>
    <Link href={href} className="mt-4 text-sm font-medium text-slate-300 hover:text-white">
      {linkLabel}
    </Link>
  </div>
);

export default AccessMessage;
