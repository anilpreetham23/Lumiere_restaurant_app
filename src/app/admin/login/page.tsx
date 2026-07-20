"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen grid place-items-center bg-ink px-5">
      <form onSubmit={submit} className="bg-cream rounded-2xl p-8 w-full max-w-sm shadow-2xl">
        <div className="text-center mb-6">
          <span className="grid place-items-center w-14 h-14 rounded-full bg-gradient-to-br from-gold to-[#b3873a] text-ink font-serif text-2xl mx-auto mb-3">L</span>
          <h1 className="font-serif text-2xl">Lumiere Staff</h1>
          <p className="text-xs text-neutral-500 mt-1">Sign in to the management console</p>
        </div>
        <label className="block text-xs font-medium mb-1.5">Email</label>
        <input type="email" required className="field mb-4" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="block text-xs font-medium mb-1.5">Password</label>
        <input type="password" required className="field mb-5" value={password} onChange={(e) => setPassword(e.target.value)} />
        {error && <p className="text-sm text-wine mb-3">{error}</p>}
        <button disabled={loading} className="btn-wine w-full justify-center disabled:opacity-60">
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Lock size={16} />} Sign In
        </button>
      </form>
    </div>
  );
}
