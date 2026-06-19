/**
 * Route-segment loading state for all dashboard pages.
 * Shown by Next.js while a page's JS chunk loads during client navigation —
 * before this existed, navigations showed a frozen screen until the chunk
 * (now code-split per page) finished downloading.
 */
export default function DashboardSegmentLoading() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-neutral-50/50">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-neutral-200 border-t-brand-green mb-3"></div>
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    </div>
  );
}
