import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="inline-flex items-center gap-3 font-semibold text-navy-900">
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-navy-900 text-sm text-white">
        TX
      </span>
      <span>TenXPros</span>
    </Link>
  );
}
