import Card from "~/components/ui/card";
import type { ReactNode } from "react";

export type ServiceInfoSectionProps = {
  title: string,
  children: ReactNode,
};

const ServiceInfoSection = ({ title, children }: ServiceInfoSectionProps) => (
  <Card className="p-6">
    <h2 className="mb-4 text-base font-semibold text-slate-100">{title}</h2>
    {children}
  </Card>
);

export default ServiceInfoSection;
