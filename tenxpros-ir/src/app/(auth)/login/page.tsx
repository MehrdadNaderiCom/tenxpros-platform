import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { getCurrentMember } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ورود اعضا",
  description: "ورود امن به پنل اعضای TenXPros Iran",
};

export default async function ApplicantLoginPage() {
  if (await getCurrentMember()) redirect("/portal");

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-panel backdrop-blur-xl sm:p-8">
      <div className="mb-7 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-iris-300">
          Member Portal
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">ورود به پنل اعضا</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          با ایمیل و رمز عبوری که هنگام ارسال درخواست انتخاب کرده‌اید وارد شوید.
        </p>
      </div>
      <LoginForm mode="applicant" />
      <p className="mt-5 text-center text-xs leading-6 text-slate-400">
        لینک تأیید ایمیل را دریافت نکرده‌اید؟{" "}
        <Link
          href="/verify-email"
          className="font-bold text-iris-300 transition hover:text-white"
        >
          دریافت لینک تازه
        </Link>
      </p>
    </section>
  );
}
