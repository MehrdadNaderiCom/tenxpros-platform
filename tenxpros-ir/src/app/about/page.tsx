import type { Metadata } from "next";
import { AboutPage } from "@/components/marketing/about-page";

export const metadata: Metadata = {
  title: "درباره TenXPros",
  description:
    "چرا TenXPros ساخته شد، Review Standard چگونه معنا پیدا می‌کند و چه اصولی پشت Professional Credential قرار دارند."
};

export default function Page() {
  return <AboutPage />;
}
