import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="flex justify-center">
          <Logo />
        </div>
        {children}
        <p className="text-center text-sm text-slate-600">
          Need to apply first?{" "}
          <Link href="/apply" className="font-medium text-navy-900">
            Start an application
          </Link>
        </p>
      </div>
    </main>
  );
}
