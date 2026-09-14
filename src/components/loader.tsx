export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`inline-block animate-spin rounded-full border-2 border-teal-200 border-t-teal-600 ${className}`}
    />
  );
}

export function Loader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-neutral-500">
      <Spinner className="h-7 w-7" />
      <p>{label}</p>
    </div>
  );
}
