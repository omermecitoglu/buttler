const CurrentUserSkeleton = () => (
  <div aria-hidden className="flex h-12 animate-pulse items-center gap-3 px-3">
    <div className="size-8 shrink-0 rounded-full bg-slate-800" />
    <div className="flex flex-col gap-1.5">
      <div className="h-3 w-24 rounded bg-slate-800" />
      <div className="h-2.5 w-16 rounded bg-slate-800" />
    </div>
  </div>
);

export default CurrentUserSkeleton;
