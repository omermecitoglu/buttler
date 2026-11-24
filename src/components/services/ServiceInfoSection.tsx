import Card from "~/components/ui/card";
import type { ReactNode } from "react";

export type ServiceInfoSectionProps = {
  title: string,
  action?: ReactNode,
  children: ReactNode,
};

const ServiceInfoSection = ({ title, action, children }: ServiceInfoSectionProps) => (
  <Card className="p-6">
    <div className="mb-4 flex min-h-8 items-center justify-between gap-4">
      <h2 className="text-base font-semibold text-slate-100">{title}</h2>
      {action}
    </div>
    {children}
  </Card>
);

export default ServiceInfoSection;
