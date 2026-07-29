import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink-950 px-6">
      <div className="max-w-lg text-center">
        <p className="font-latin text-sm font-semibold tracking-[0.22em] text-iris-300">
          404
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-white">
          این صفحه پیدا نشد
        </h1>
        <p className="mt-4 leading-8 text-slate-400">
          نشانی صفحه را بررسی کنید یا به صفحه اصلی برگردید.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-11 items-center justify-center rounded-lg bg-iris-500 px-6 font-medium text-white transition hover:bg-iris-400"
        >
          بازگشت به صفحه اصلی
        </Link>
      </div>
    </main>
  );
}
