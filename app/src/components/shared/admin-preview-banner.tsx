/**
 * Read-only banner shown at the top of a partner panel / participant portal when
 * a super admin is previewing someone else's view. Server component; the Exit
 * link clears the preview cookie via the impersonation-exit route.
 */
export function AdminPreviewBanner({ name, exitTo = "/admin" }: { name: string; exitTo?: string }) {
  const href = `/admin/impersonate/exit?to=${encodeURIComponent(exitTo)}`;
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <span>
        Admin preview, <strong>read-only</strong>. You are viewing <strong>{name}</strong>’s view. Changes are
        disabled here.
      </span>
      <a href={href} className="font-medium text-amber-900 underline underline-offset-2 hover:text-amber-700">
        Exit preview
      </a>
    </div>
  );
}
