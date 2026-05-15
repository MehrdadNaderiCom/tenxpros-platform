import { Footer } from "@/components/shared/footer";
import { PublicNav } from "@/components/shared/public-nav";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PublicNav />
      {children}
      <Footer />
    </>
  );
}
