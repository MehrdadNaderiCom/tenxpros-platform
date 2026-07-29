import type { Metadata } from "next";
import { PricingPage } from "@/components/marketing/pricing-page";

export const metadata: Metadata = {
  title: "قیمت Founding Charter",
  description:
    "قیمت استاندارد برنامه ۹۰ میلیون تومان و Offer فعلی Founding Charter برابر ۶۰ میلیون تومان است. پرداخت فقط پس از پذیرش انجام می‌شود.",
};

export default function Page() {
  return <PricingPage />;
}
