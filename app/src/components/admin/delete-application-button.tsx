"use client";

import { deleteApplication } from "@/lib/actions/applications";

/**
 * Delete control for a single application row. Confirms before submitting the
 * (admin-only, audited) server action so an accidental click cannot remove a
 * record. Rendered inside the admin applications list and the detail page.
 */
export function DeleteApplicationButton({
  applicationId,
  applicantName,
  className,
}: {
  applicationId: string;
  applicantName: string;
  className?: string;
}) {
  return (
    <form
      action={deleteApplication}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Delete the application from ${applicantName}? This permanently removes the application and its payment records and cannot be undone.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="applicationId" value={applicationId} />
      <button type="submit" className={className ?? "font-medium text-red-600 hover:underline"}>
        Delete
      </button>
    </form>
  );
}
