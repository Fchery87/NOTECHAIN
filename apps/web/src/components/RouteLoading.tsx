export default function RouteLoading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-stone-300 border-t-stone-900 rounded-full animate-spin" />
        <p className="text-sm text-stone-500">Loading…</p>
      </div>
    </div>
  );
}
