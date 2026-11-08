export default function({ children }: LayoutProps<"/[locale]">) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      {children}
    </div>
  );
}
