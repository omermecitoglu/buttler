export type ServiceInfoListProps = {
  items: { label: string, value: string, title?: string }[],
};

const ServiceInfoList = ({ items }: ServiceInfoListProps) => (
  <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
    {items.map(({ label, value, title }) => (
      <div key={label} className="min-w-0">
        <dt className="text-xs font-medium text-slate-500">{label}</dt>
        <dd className="mt-0.5 truncate font-mono text-slate-300" title={title ?? value}>{value}</dd>
      </div>
    ))}
  </dl>
);

export default ServiceInfoList;
