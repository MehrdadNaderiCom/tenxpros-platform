import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL ?? "https://tenxpros.com"),
  title: {
    default: "TenXPros — Become an AI-Adopted Professional",
    template: "%s · TenXPros",
  },
  description:
    "TenXPros helps professionals become AI-adopted through diagnostics, customised learning, coaching, evidence-based certification, and connections with organisations seeking AI-ready talent — powered by TenXRole for career execution.",
  openGraph: {
    title: "TenXPros — Become an AI-Adopted Professional",
    description:
      "Diagnose, learn, practice, assess, certify, showcase, connect. The AI-adoption service layer for individual professionals — sibling to TenXRole and TenXOps.",
    type: "website",
    siteName: "TenXPros",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        {children}
      </body>
    </html>
  );
}
