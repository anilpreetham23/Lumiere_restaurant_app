"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateSettings } from "@/actions/admin";

type Settings = {
  restaurant_name: string; tagline: string; phone: string; email: string;
  address: string; hours: string; currency: string;
  deposit_amount: number; service_charge_pct: number;
  payment_gateway: string; accepting_orders: boolean;
};

const FIELDS: [keyof Settings, string, string][] = [
  ["restaurant_name", "Restaurant name", "text"],
  ["tagline", "Tagline", "text"],
  ["phone", "Phone", "text"],
  ["email", "Email", "text"],
  ["address", "Address", "text"],
  ["hours", "Opening hours", "text"],
  ["currency", "Currency symbol", "text"],
  ["deposit_amount", "Reservation deposit", "number"],
  ["service_charge_pct", "Service charge %", "number"],
];

export default function SettingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [s, setS] = useState<Settings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("app_settings").select("*").eq("id", 1).single().then(({ data, error }) => {
      if (error) setErr("Run the app_settings SQL in Supabase first.");
      else setS(data as Settings);
    });
  }, [supabase]);

  function set<K extends keyof Settings>(k: K, v: Settings[K]) {
    setS((p) => (p ? { ...p, [k]: v } : p));
    setSaved(false);
  }

  async function save() {
    if (!s) return;
    setSaving(true); setErr(null);
    const res = await updateSettings({ ...s });
    setSaving(false);
    if (res.ok) { setSaved(true); } else setErr(res.error ?? "Save failed");
  }

  if (err && !s) return <div className="bg-white rounded-2xl p-8 text-center text-wine">{err}</div>;
  if (!s) return <div className="text-neutral-400">Loading settings…</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-serif text-3xl">Settings</h1>
        <p className="text-neutral-500 text-sm">Live restaurant configuration — changes apply instantly, no redeploy.</p>
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
        {/* accepting orders kill switch */}
        <div className="flex items-center justify-between border-b border-cream2 pb-4">
          <div>
            <div className="font-medium">Accepting orders</div>
            <div className="text-xs text-neutral-500">Turn off to pause all QR ordering instantly.</div>
          </div>
          <button
            onClick={() => set("accepting_orders", !s.accepting_orders)}
            className={`relative w-12 h-6 rounded-full transition ${s.accepting_orders ? "bg-green-500" : "bg-neutral-300"}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${s.accepting_orders ? "left-6" : "left-0.5"}`} />
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {FIELDS.map(([key, label, type]) => (
            <div key={key} className={key === "address" || key === "tagline" ? "sm:col-span-2" : ""}>
              <label className="block text-xs font-medium mb-1.5 text-neutral-600">{label}</label>
              <input
                type={type}
                value={String(s[key] ?? "")}
                onChange={(e) => set(key, (type === "number" ? Number(e.target.value) : e.target.value) as never)}
                className="field"
              />
            </div>
          ))}
          <div>
            <label className="block text-xs font-medium mb-1.5 text-neutral-600">Payment gateway</label>
            <select value={s.payment_gateway} onChange={(e) => set("payment_gateway", e.target.value)} className="field">
              <option value="razorpay">Razorpay</option>
              <option value="stripe">Stripe</option>
            </select>
          </div>
        </div>

        {err && <p className="text-sm text-wine">{err}</p>}
        <button onClick={save} disabled={saving} className="btn-wine justify-center disabled:opacity-60">
          {saving ? <Loader2 className="animate-spin" size={16} /> : saved ? <Check size={16} /> : null}
          {saved ? "Saved" : "Save changes"}
        </button>
      </div>
      <p className="text-xs text-neutral-400">
        Note: payment gateway <b>keys</b> live in server env (Vercel), not here — this only selects which gateway is active.
      </p>
    </div>
  );
}
