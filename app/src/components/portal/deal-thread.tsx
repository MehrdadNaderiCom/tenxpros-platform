import { cn } from "@/lib/utils";

type ThreadMessage = {
  id: string;
  authorRole: string;
  authorName: string;
  body: string;
  createdAt: Date;
};

/** Presentational message thread for an opportunity. Server component, no state. */
export function DealThread({ messages }: { messages: ThreadMessage[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-slate-500">No messages yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {messages.map((m) => {
        const isAdmin = m.authorRole === "ADMIN";
        return (
          <li
            key={m.id}
            className={cn(
              "rounded-lg border p-4",
              isAdmin ? "border-navy-200 bg-navy-50" : "border-neutral-200 bg-white",
            )}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-navy-900">
                {m.authorName}
                <span className="ml-2 text-xs font-normal text-slate-500">{isAdmin ? "TenXPros" : "Partner"}</span>
              </span>
              <span className="text-xs text-slate-500">{m.createdAt.toLocaleString()}</span>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{m.body}</p>
          </li>
        );
      })}
    </ol>
  );
}
