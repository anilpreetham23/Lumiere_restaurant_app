"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogout() {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button onClick={logout} className="flex items-center gap-1.5 text-sm text-neutral-600 hover:text-wine">
      <LogOut size={15} /> Sign out
    </button>
  );
}
