"use client";

import { useState } from "react";
import { CalendarCheck, CheckCircle2, Loader2, Plus, Minus } from "lucide-react";
import { createReservation, startReservationDeposit, verifyReservationDeposit } from "@/actions/pay";
import { money } from "@/data/menu";
import type { MenuItem } from "@/lib/order";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function ReservationForm({ menu = [] }: { menu?: MenuItem[] }) {
  const today = new Date().toLocaleDateString("en-CA"); // YYYY-MM-DD local
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [showPre, setShowPre] = useState(false);
  const [pre, setPre] = useState<Record<string, number>>({});
  const [form, setForm] = useState({
    name: "", phone: "", email: "", guests: "2 People", date: "", time: "7:00 PM", requests: "",
  });

  const preCount = Object.values(pre).reduce((a, b) => a + b, 0);
  const add = (id: string) => setPre((p) => ({ ...p, [id]: (p[id] ?? 0) + 1 }));
  const sub = (id: string) => setPre((p) => { const n = (p[id] ?? 0) - 1; const x = { ...p }; if (n <= 0) delete x[id]; else x[id] = n; return x; });

  function loadRz(): Promise<boolean> {
    return new Promise((r) => {
      const w = window as any;
      if (w.Razorpay) return r(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => r(true); s.onerror = () => r(false);
      document.body.appendChild(s);
    });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading"); setError(null);
    const pre_order = Object.entries(pre).map(([menu_item_id, qty]) => ({ menu_item_id, qty }));
    const res = await createReservation({ ...form, pre_order });
    if (!res.ok) { setError(res.error ?? "Something went wrong."); setState("idle"); return; }

    if (res.payEnabled && res.id && (res.deposit ?? 0) > 0) {
      const pay = await startReservationDeposit(res.id);
      if (!pay.ok) { setError(pay.error); setState("idle"); return; }
      if (pay.gateway === "stripe") { window.location.href = pay.url; return; }
      const ok = await loadRz(); const w = window as any;
      if (!ok || !w.Razorpay) { setError("Could not load payment window."); setState("idle"); return; }
      const rid = res.id;
      const rzp = new w.Razorpay({
        key: pay.keyId, amount: pay.amount, currency: "INR", name: pay.name,
        description: "Table reservation deposit", order_id: pay.orderId, theme: { color: "#7a2e35" },
        handler: async (r: any) => {
          const v = await verifyReservationDeposit(rid, r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
          if (v.ok) setState("done"); else { setError(v.error ?? "Deposit not verified."); setState("idle"); }
        },
        modal: { ondismiss: () => setState("idle") },
      });
      rzp.open();
      return;
    }
    setState("done");
  }

  if (state === "done") {
    return (
      <div className="bg-white rounded-2xl p-10 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <CheckCircle2 size={48} className="text-gold mx-auto mb-4" />
        <h3 className="font-serif text-2xl mb-2">Table Requested</h3>
        <p className="text-neutral-500">
          Thank you. Our maître d&apos; will confirm your reservation by email shortly.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] grid sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Full Name *</label>
        <input required className="field" placeholder="Jane Doe" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Phone *</label>
        <input required className="field" placeholder="+91 ..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Email *</label>
        <input type="email" required className="field" placeholder="you@email.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Guests *</label>
        <select className="field" value={form.guests} onChange={(e) => setForm({ ...form, guests: e.target.value })}>
          <option>1 Person</option><option>2 People</option><option>3 - 4 People</option>
          <option>5 - 6 People</option><option>7 - 10 People</option><option>10+ People</option>
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Date *</label>
        <input type="date" required min={today} className="field" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Time *</label>
        <select className="field" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}>
          {["12:00 PM", "1:00 PM", "2:00 PM", "6:00 PM", "7:00 PM", "8:00 PM", "9:00 PM", "10:00 PM"].map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Special Requests</label>
        <textarea rows={2} className="field" placeholder="Allergies, dietary needs, occasions..." value={form.requests} onChange={(e) => setForm({ ...form, requests: e.target.value })} />
      </div>

      {/* optional pre-order */}
      {menu.length > 0 && (
        <div className="sm:col-span-2 border border-cream2 rounded-xl p-4">
          <button type="button" onClick={() => setShowPre((v) => !v)} className="flex items-center justify-between w-full text-sm font-medium">
            <span>Pre-order dishes (optional){preCount > 0 ? ` · ${preCount} selected` : ""}</span>
            <span className="text-gold">{showPre ? "Hide" : "Add"}</span>
          </button>
          {showPre && (
            <div className="mt-3 grid sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {menu.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-2 text-sm border-b border-cream2 pb-2">
                  <span className="truncate">{m.title}<span className="text-wine"> · {money(Number(m.price))}</span></span>
                  <span className="flex items-center gap-2 shrink-0">
                    {pre[m.id] ? (
                      <>
                        <button type="button" onClick={() => sub(m.id)} className="w-6 h-6 grid place-items-center rounded-full bg-cream2"><Minus size={12} /></button>
                        <span className="w-4 text-center">{pre[m.id]}</span>
                      </>
                    ) : null}
                    <button type="button" onClick={() => add(m.id)} className="w-6 h-6 grid place-items-center rounded-full bg-wine text-white"><Plus size={12} /></button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="sm:col-span-2 text-sm text-wine">{error}</p>}
      <div className="sm:col-span-2">
        <button disabled={state === "loading"} className="btn-gold w-full justify-center disabled:opacity-70">
          {state === "loading" ? <Loader2 className="animate-spin" size={18} /> : <CalendarCheck size={18} />}
          Confirm Reservation
        </button>
        <p className="text-center text-[0.7rem] text-neutral-400 mt-2">
          A refundable deposit may be requested to secure your table, applied to your final bill.
        </p>
      </div>
    </form>
  );
}
