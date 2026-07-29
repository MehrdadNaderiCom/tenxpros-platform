import type { Metadata } from "next";
import { ServicesPage } from "@/components/marketing/services-page";

export const metadata: Metadata = {
  title: "Office Hour، Coaching و نشست هفتگی AI",
  description:
    "Office Hour هفتگی ۳۰ دقیقه‌ای، Private Coaching ساعتی ۵ میلیون تومان و نشست ۹۰ دقیقه‌ای DBC برای اعضا و فارغ‌التحصیلان، بدون هزینه جداگانه."
};

export default function Page() {
  return <ServicesPage />;
}
