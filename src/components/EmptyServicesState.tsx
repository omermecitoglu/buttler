import { faPlus } from "@fortawesome/free-solid-svg-icons/faPlus";
import { faServer } from "@fortawesome/free-solid-svg-icons/faServer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Button from "~/components/ui/button";
import { Link } from "~/i18n/navigation";

export type EmptyServicesStateProps = {
  title: string,
  description: string,
  actionLabel: string,
};

const EmptyServicesState = ({
  title,
  description,
  actionLabel,
}: EmptyServicesStateProps) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-6 py-16 text-center">
    <div className="flex size-14 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 shadow-inner">
      <FontAwesomeIcon icon={faServer} className="size-6 text-slate-400" />
    </div>
    <h3 className="mt-4 text-base font-semibold text-slate-100">{title}</h3>
    <p className="mt-1.5 max-w-sm text-sm text-slate-400">{description}</p>
    <div className="mt-6">
      <Link href="/services/new">
        <Button variant="primary" size="sm" className="gap-2">
          <FontAwesomeIcon icon={faPlus} className="size-3" />
          <span>{actionLabel}</span>
        </Button>
      </Link>
    </div>
  </div>
);

export default EmptyServicesState;
