import Card from "~/components/ui/card";

const ServicePanelSkeleton = () => (
  <Card className="flex animate-pulse flex-col gap-4 p-6">
    <div className="h-5 w-40 rounded bg-slate-800" />
    <div className="h-40 rounded-xl bg-slate-950/60" />
  </Card>
);

export default ServicePanelSkeleton;
