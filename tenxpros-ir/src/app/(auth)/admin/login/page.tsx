import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/forms/login-form";
import { getCurrentAdmin } from "@/lib/auth";

export const metadata: Metadata = {
  title: "ورود مدیریت",
  description: "ورود امن به پنل مدیریت TenXPros Iran",
};

export default async function AdminLoginPage() {
  if (await getCurrentAdmin()) redirect("/admin");

  return (
    <section className="rounded-lg border border-white/10 bg-white/[0.055] p-6 shadow-panel backdrop-blur-xl sm:p-8">
      <div className="mb-7 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-credential">
          Admin Console
        </p>
        <h1 className="mt-3 text-3xl font-black text-white">ورود مدیریت</h1>
        <p className="mt-3 text-sm leading-7 text-slate-400">
          این بخش فقط برای مدیران مجاز TenXPros Iran در دسترس است.
        </p>
      </div>
      <LoginForm mode="admin" />
    </section>
  );
}
