import type { Metadata } from "next";
import { ApplyPage } from "@/components/marketing/apply-page";

export const metadata: Metadata = {
  title: "درخواست حضور در Founding Charter",
  description:
    "تخصص، حوزه و مسئله حرفه‌ای خود را برای بررسی حضور در Founding Charter معرفی کنید. پرداخت فقط پس از پذیرش انجام می‌شود."
};

export default function Page() {
  return <ApplyPage />;
}
