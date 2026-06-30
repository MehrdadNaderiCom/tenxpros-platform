import { signOut } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/authz";
import { Logo } from "@/components/shared/logo";
import { Badge } from "@/components/ui/badge";
import { AdminNavClient, type NavSection } from "@/components/shared/admin-nav-client";

/**
 * Admin sidebar information architecture. Grouped into sections (verified to
 * cover every admin route exactly once) so the long flat menu reads as a clean,
 * professional, searchable navigation. Search + collapse + active highlighting
 * live in the AdminNavClient island.
 */
const sections: NavSection[] = [
  { title: "Overview", items: [{ label: "Dashboard", href: "/admin" }] },
  {
    title: "People",
    items: [
      { label: "Applications", href: "/admin/applications" },
      { label: "Participants", href: "/admin/participants" },
      { label: "Tickets", href: "/admin/tickets" },
    ],
  },
  {
    title: "Learning",
    items: [
      { label: "Diagnostics", href: "/admin/diagnostics" },
      { label: "Paths", href: "/admin/paths" },
      { label: "Modules", href: "/admin/modules" },
      { label: "Dossiers", href: "/admin/dossiers" },
    ],
  },
  {
    title: "Partner Program",
    items: [
      { label: "Partners", href: "/admin/partners" },
      { label: "Academy & certificates", href: "/admin/partners/academy" },
      { label: "Lesson content", href: "/admin/academy/content" },
      { label: "Applications", href: "/admin/partners/applications" },
      { label: "Deal Registrations", href: "/admin/partners/deal-registrations" },
      { label: "Commissions", href: "/admin/partners/commissions" },
      { label: "Configuration", href: "/admin/partners/config" },
      { label: "House Accounts", href: "/admin/partners/house-accounts" },
      { label: "Audit Log", href: "/admin/partners/audit" },
    ],
  },
  {
    title: "Credentials",
    items: [
      { label: "Certifications", href: "/admin/certifications" },
      { label: "Badges", href: "/admin/badges" },
      { label: "Directory", href: "/admin/directory" },
    ],
  },
  {
    title: "Revenue",
    items: [
      { label: "Pricing", href: "/admin/pricing" },
      { label: "Payments", href: "/admin/payments" },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Analytics", href: "/admin/analytics" },
      { label: "Reports", href: "/admin/reports" },
    ],
  },
  {
    title: "Newsletter",
    items: [
      { label: "Compose & campaigns", href: "/admin/newsletter" },
      { label: "Subscribers & groups", href: "/admin/newsletter/subscribers" },
    ],
  },
  {
    title: "System",
    items: [
      { label: "Users", href: "/admin/users" },
      { label: "Email", href: "/admin/email" },
      { label: "Audit", href: "/admin/audit" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
];

/** Visible only to the super admin (TenXPros Command). Ordered by daily use. */
const marketingSection: NavSection = {
  title: "Marketing",
  items: [
    { label: "Command", href: "/admin/marketing" },
    { label: "Insights", href: "/admin/marketing/insights" },
    { label: "Today", href: "/admin/marketing/activity" },
    { label: "Journal", href: "/admin/marketing/journal" },
    { label: "Prospects", href: "/admin/marketing/prospects" },
    { label: "Playbook", href: "/admin/marketing/playbook" },
    { label: "Campaigns", href: "/admin/marketing/campaigns" },
    { label: "Settings", href: "/admin/marketing/settings" },
  ],
};

export function AdminNav({ name, email }: { name?: string | null; email?: string | null }) {
  const visibleSections = isSuperAdmin(email)
    ? [sections[0], marketingSection, ...sections.slice(1)]
    : sections;
  return (
    <aside className="border-b border-neutral-200 bg-white p-5 md:min-h-screen md:w-72 md:shrink-0 md:border-b-0 md:border-r">
      <div className="space-y-6">
        <Logo />
        <div className="space-y-2">
          <Badge status="ENROLLED">ADMIN</Badge>
          <p className="font-medium text-slate-900">{name ?? "Admin"}</p>
          <p className="text-xs text-slate-500">Environment: {process.env.NODE_ENV}</p>
        </div>

        <AdminNavClient sections={visibleSections} />

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button className="text-sm font-medium text-slate-600 hover:text-navy-900" type="submit">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
