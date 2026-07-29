"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-5">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-8 text-center shadow-soft">
        <p lang="en" className="font-latin text-sm font-semibold text-red-600">
          Error
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          مشکلی پیش آمده است
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          درخواست شما کامل نشد. چند لحظه بعد دوباره تلاش کنید.
        </p>
        <Button type="button" onClick={reset} className="mt-6">
          تلاش دوباره
        </Button>
      </div>
    </main>
  );
}
