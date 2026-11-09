import { faDocker } from "@fortawesome/free-brands-svg-icons/faDocker";
import { faGithub } from "@fortawesome/free-brands-svg-icons/faGithub";
import { faServer } from "@fortawesome/free-solid-svg-icons/faServer";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { cn } from "@omer-x/tailwind-ui-kit/utils";

export type ServiceTypeBadgeProps = {
  type: "github" | "dockerhub" | "system",
  label: string,
  className?: string,
};

const iconMap = {
  github: faGithub,
  dockerhub: faDocker,
  system: faServer,
};

const ServiceTypeBadge = ({ type, label, className }: ServiceTypeBadgeProps) => {
  const icon = iconMap[type];

  return (
    <span
      className={cn([
        "inline-flex items-center gap-1.5 rounded-md border border-slate-700/80",
        "bg-slate-800/60 px-2 py-0.5 text-xs font-medium text-slate-300",
        className,
      ])}
    >
      <FontAwesomeIcon icon={icon} className="size-3 text-slate-400" />
      <span>{label}</span>
    </span>
  );
};

export default ServiceTypeBadge;
