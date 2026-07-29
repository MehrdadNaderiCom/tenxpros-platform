import { updateSlotStatusAction } from "@/actions/bookings";
import { AvailabilityForm } from "@/components/admin/availability-form";
import {
  AdminBadge,
  AdminHeading,
  AdminPanel,
  EmptyState,
} from "@/components/admin/admin-ui";
import { db } from "@/lib/db";
import { formatTehranDateTime } from "@/lib/format";

const statusLabels = {
  OPEN: "آزاد",
  RESERVED: "رزرو شده",
  BLOCKED: "مسدود",
  CANCELLED: "لغو شده",
} as const;

export default async function AdminSlotsPage() {
  // Server Components run once per request; this deliberately snapshots the
  // rolling admin view instead of creating reactive client state.
  const earliestVisibleStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const slots = await db.officeHourSlot.findMany({
    where: { startsAt: { gt: earliestVisibleStart } },
    include: {
      booking: {
        select: {
          id: true,
          user: { select: { fullName: true } },
        },
      },
      createdBy: { select: { fullName: true } },
    },
    orderBy: { startsAt: "asc" },
    take: 200,
  });

  return (
    <>
      <AdminHeading
        title="زمان‌های آزاد Office Hour"
        description="زمان‌های هفته جاری یا هفته بلافاصله بعد را با Time Zone تهران تعریف کنید. اعضا در هر هفته فقط Slotهای همان هفته را خواهند دید."
      />

      <div className="grid gap-7 xl:grid-cols-[0.85fr_1.15fr]">
        <AdminPanel className="h-fit">
          <AvailabilityForm />
        </AdminPanel>

        <AdminPanel>
          <h2 className="text-xl font-black text-slate-950">Slotهای ثبت شده</h2>
          {slots.length === 0 ? (
            <div className="mt-5">
              <EmptyState
                title="زمانی ثبت نشده است"
                description="یک بازه آزاد بسازید تا اعضا بتوانند زمان این هفته را انتخاب کنند."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {slots.map((slot) => (
                <article
                  key={slot.id}
                  className="flex flex-col gap-4 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AdminBadge
                        tone={
                          slot.status === "OPEN"
                            ? "positive"
                            : slot.status === "RESERVED"
                              ? "info"
                              : "neutral"
                        }
                      >
                        {statusLabels[slot.status]}
                      </AdminBadge>
                      {slot.booking ? (
                        <span className="text-xs font-bold text-slate-500">
                          {slot.booking.user.fullName}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-3 font-black text-slate-950">
                      {formatTehranDateTime(slot.startsAt)}
                    </p>
                    {slot.note ? (
                      <p className="mt-1 text-xs leading-6 text-slate-500">{slot.note}</p>
                    ) : null}
                  </div>

                  {!slot.booking ? (
                    <form action={updateSlotStatusAction} className="flex gap-2">
                      <input type="hidden" name="slotId" value={slot.id} />
                      {slot.status === "OPEN" ? (
                        <button
                          type="submit"
                          name="status"
                          value="BLOCKED"
                          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800"
                        >
                          مسدود کردن
                        </button>
                      ) : (
                        <button
                          type="submit"
                          name="status"
                          value="OPEN"
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700"
                        >
                          باز کردن
                        </button>
                      )}
                      <button
                        type="submit"
                        name="status"
                        value="CANCELLED"
                        className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                      >
                        لغو Slot
                      </button>
                    </form>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </AdminPanel>
      </div>
    </>
  );
}
