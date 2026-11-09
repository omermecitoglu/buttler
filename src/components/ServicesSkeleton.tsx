import Card from "~/components/ui/card";

const ServicesSkeleton = () => (
  <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
    {[1, 2, 3].map(i => (
      <Card key={i} className="flex flex-col gap-4 p-6 animate-pulse">
        <div className="flex items-center justify-between">
          <div className="h-5 w-32 rounded bg-slate-800" />
          <div className="h-5 w-16 rounded-full bg-slate-800" />
        </div>
        <div className="h-20 rounded-xl bg-slate-950/60" />
        <div className="h-8 rounded bg-slate-800/60" />
      </Card>
    ))}
  </div>
);

export default ServicesSkeleton;
