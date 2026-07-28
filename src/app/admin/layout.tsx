import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminLogout from "@/components/AdminLogout";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // login page renders without chrome
  if (!user) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-cream">
      <header className="bg-white border-b border-cream2">
        <div className="mx-auto max-w-6xl px-5 h-16 flex items-center justify-between">
          <Link href="/admin" className="flex items-center gap-2 font-serif text-xl">
            <span className="grid place-items-center w-9 h-9 rounded-full bg-gradient-to-br from-gold to-[#b3873a] text-ink text-sm">L</span>
            Lumiere Console
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm text-neutral-600 hover:text-wine">Dashboard</Link>
            <Link href="/admin/kitchen" className="text-sm text-neutral-600 hover:text-wine">Kitchen</Link>
            <Link href="/admin/floor" className="text-sm text-neutral-600 hover:text-wine">Floor</Link>
            <Link href="/admin/menu" className="text-sm text-neutral-600 hover:text-wine">Menu</Link>
            <Link href="/admin/tables" className="text-sm text-neutral-600 hover:text-wine">Tables & QR</Link>
            <Link href="/admin/settings" className="text-sm text-neutral-600 hover:text-wine">Settings</Link>
            <Link href="/" className="text-sm text-neutral-600 hover:text-wine">View site</Link>
            <AdminLogout />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
