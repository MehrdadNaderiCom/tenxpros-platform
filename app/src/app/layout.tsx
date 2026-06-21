import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://tenxpros.com"),
  title: {
    default: "TenXPros",
    template: "%s | TenXPros",
  },
  description:
    "A selective 12-week AI adoption program for professionals building a defensible Living AI Solution Dossier.",
  robots: { index: true, follow: true },
  other: {
    cryptomus: "e50d84e2",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
