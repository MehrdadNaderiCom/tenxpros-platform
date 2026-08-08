export default function Loading() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16 md:px-8 md:py-24">
      <div className="space-y-6">
        <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-10 w-full max-w-xl animate-pulse rounded bg-neutral-200" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-32 animate-pulse rounded-lg bg-neutral-200" />
          <div className="h-32 animate-pulse rounded-lg bg-neutral-200" />
          <div className="h-32 animate-pulse rounded-lg bg-neutral-200" />
        </div>
      </div>
    </main>
  );
}
