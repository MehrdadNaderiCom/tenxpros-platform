import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/wght.css";
import "@fontsource-variable/vazirmatn/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://tenxpros.ir"),
  title: {
    default: "TenXPros ایران | رهبری AI Adoption در حوزه تخصصی شما",
    template: "%s | TenXPros ایران",
  },
  description:
    "برنامه انتخابی ۱۲ هفته‌ای برای متخصصانی که می‌خواهند AI Adoption را در حوزه خود رهبری کنند و یک Living AI Solution Dossier قابل دفاع بسازند.",
  robots: { index: true, follow: true },
  openGraph: {
    locale: "fa_IR",
    type: "website",
    siteName: "TenXPros ایران",
    images: ["/images/dossier-snapshot.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070b11",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
