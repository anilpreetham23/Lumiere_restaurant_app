"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Plus, Minus, ShoppingBag, X, BellRing, GlassWater, ReceiptText,
  Check, Loader2, ChefHat, UtensilsCrossed, Star, Share2, Flame, Sparkles,
} from "lucide-react";
import QRCode from "qrcode";
import { CreditCard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { startBillPayment, verifyRazorpayPayment, type Receipt } from "@/actions/pay";

// Razorpay checkout.js injects a global constructor.
declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void } }
}
import { money } from "@/data/menu";
import {
  ORDER_STEPS, STATUS_LABEL, sessionTotal,
  type MenuItem, type SessionSnapshot, type SessionOrder,
} from "@/lib/order";

const CUISINES = ["All", "France", "Italy", "Japan", "India", "Spain", "Patisserie"];

export default function TableOrder({
  token, initial, menu, receipt,
}: {
  token: string;
  initial: SessionSnapshot;
  menu: MenuItem[];
  receipt?: Receipt | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [snap, setSnap] = useState<SessionSnapshot>(initial);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cuisine, setCuisine] = useState("All");
  const [diet, setDiet] = useState("All");
  const [q, setQ] = useState("");
  const [welcome, setWelcome] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, { sum: number; n: number }>>({});
  const [ratedIds, setRatedIds] = useState<Set<string>>(new Set());
  const [tipPct, setTipPct] = useState(0);
  const [tipCustom, setTipCustom] = useState("");
  const [intro, setIntro] = useState(true);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [payBusy, setPayBusy] = useState(false);
  const [receiptQr, setReceiptQr] = useState<string | null>(null);
  const [localReceipt, setLocalReceipt] = useState<Receipt | null>(null);
  const effReceipt = receipt ?? localReceipt;

  useEffect(() => {
    if (!effReceipt) return;
    const url = `${window.location.origin}/verify/${effReceipt.code}`;
    QRCode.toDataURL(url, { margin: 1, width: 200, color: { dark: "#16130f", light: "#ffffff" } })
      .then(setReceiptQr).catch(() => {});
  }, [effReceipt]);

  function loadRazorpay(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function payOnline() {
    setPayBusy(true); setErr(null);
    const res = await startBillPayment(token, tipAmt);
    if (!res.ok) { setPayBusy(false); setErr(res.error); return; }

    if (res.gateway === "stripe") { window.location.href = res.url; return; }

    // Razorpay modal
    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) { setPayBusy(false); setErr("Could not load payment window."); return; }
    const rzp = new window.Razorpay({
      key: res.keyId, amount: res.amount, currency: "INR",
      name: res.name, description: `Table ${res.label}`, order_id: res.orderId,
      theme: { color: "#7a2e35" },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const v = await verifyRazorpayPayment(token, r.razorpay_order_id, r.razorpay_payment_id, r.razorpay_signature);
        setPayBusy(false);
        if (v.ok && v.receipt) { setLocalReceipt(v.receipt); setToast("Payment successful"); refresh(); }
        else setErr(v.error ?? "Payment could not be verified.");
      },
      modal: { ondismiss: () => setPayBusy(false) },
    } as Record<string, unknown>);
    rzp.open();
  }

  const menuMap = useMemo(() => Object.fromEntries(menu.map((m) => [m.id, m])), [menu]);
  const orders = snap?.orders ?? [];
  const table = snap?.table;
  const total = sessionTotal(orders);
  const diets = useMemo(() => ["All", ...Array.from(new Set(menu.flatMap((m) => m.dietary ?? [])))], [menu]);
  const tipAmt = tipCustom !== "" ? Math.max(0, Math.round(Number(tipCustom) || 0)) : Math.round((total * tipPct) / 100);
  const payTotal = total + tipAmt;

  const refresh = useCallback(async () => {
    const { data } = await supabase.rpc("get_session", { p_token: token });
    if (data) setSnap(data as SessionSnapshot);
  }, [supabase, token]);

  // poll live status every 5s (secure: rpc respects the token)
  useEffect(() => {
    const iv = setInterval(refresh, 5000);
    return () => clearInterval(iv);
  }, [refresh]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Branded scan-intro overlay — once per browser session.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem("lm_intro")) { setIntro(false); return; }
    sessionStorage.setItem("lm_intro", "1");
    const t = setTimeout(() => setIntro(false), 1900);
    return () => clearTimeout(t);
  }, []);

  // Aggregate dish ratings for "Trending tonight" badges.
  useEffect(() => {
    supabase.from("dish_ratings").select("menu_item_id,rating").then(({ data }) => {
      const agg: Record<string, { sum: number; n: number }> = {};
      (data ?? []).forEach((r: { menu_item_id: string; rating: number }) => {
        const a = agg[r.menu_item_id] ?? { sum: 0, n: 0 };
        a.sum += r.rating; a.n += 1; agg[r.menu_item_id] = a;
      });
      setRatings(agg);
    });
  }, [supabase]);

  const isTrending = (id: string) => {
    const a = ratings[id];
    return !!a && a.n >= 3 && a.sum / a.n >= 4;
  };

  async function rate(menuItemId: string, stars: number) {
    if (ratedIds.has(menuItemId)) return;
    setRatedIds((s) => new Set(s).add(menuItemId));
    setRatings((r) => {
      const a = r[menuItemId] ?? { sum: 0, n: 0 };
      return { ...r, [menuItemId]: { sum: a.sum + stars, n: a.n + 1 } };
    });
    await supabase.from("dish_ratings").insert({
      menu_item_id: menuItemId, rating: stars, session_id: snap?.session?.id ?? null,
    });
    setToast("Thanks for rating");
  }

  async function shareReceipt() {
    if (!effReceipt) return;
    const url = `${window.location.origin}/verify/${effReceipt.code}`;
    const text = `My Lumière receipt — ${money(effReceipt.amount)} · Table ${effReceipt.table}`;
    try {
      if (navigator.share) await navigator.share({ title: "Lumière Receipt", text, url });
      else { await navigator.clipboard.writeText(url); setToast("Receipt link copied"); }
    } catch { /* user dismissed share */ }
  }

  const cartCount = Object.values(cart).reduce((a, b) => a + b, 0);
  const cartTotal = Object.entries(cart).reduce(
    (s, [id, q]) => s + (menuMap[id]?.price ?? 0) * q, 0
  );

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const sub = (id: string) =>
    setCart((c) => {
      const n = (c[id] ?? 0) - 1;
      const next = { ...c };
      if (n <= 0) delete next[id]; else next[id] = n;
      return next;
    });

  async function placeOrder() {
    if (cartCount === 0) return;
    setBusy(true); setErr(null);
    const items = Object.entries(cart).map(([menu_item_id, qty]) => ({ menu_item_id, qty }));
    const { data, error } = await supabase.rpc("place_order", {
      p_token: token, p_items: items,
      p_customer: name || null, p_phone: phone || null,
    });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    if (data) setSnap(data as SessionSnapshot);
    setCart({}); setOpen(false);
    setToast("Order sent to the kitchen");
    // Loyalty: recognise returning guests by phone.
    if (phone && !welcome) {
      const { data: c } = await supabase.rpc("touch_customer", { p_phone: phone, p_name: name || null });
      const d = c as { visits: number; name: string | null } | null;
      if (d) setWelcome(
        d.visits > 1
          ? `Welcome back${d.name ? ", " + d.name : ""} — this is visit #${d.visits}. A glass of house wine is on us.`
          : "Welcome to Lumière. We're glad you're here."
      );
    }
  }

  async function callService(type: "waiter" | "water" | "bill") {
    setBusy(true);
    const { error } = await supabase.rpc("call_service", { p_token: token, p_type: type });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    setToast(
      type === "waiter" ? "A waiter is on the way" :
      type === "water" ? "Water is on the way" :
      "Your bill is being prepared"
    );
    refresh();
  }

  const filtered = (cuisine === "All" ? menu : menu.filter((m) => m.cuisine === cuisine))
    .filter((m) => diet === "All" || (m.dietary ?? []).includes(diet))
    .filter((m) => {
      const t = q.trim().toLowerCase();
      if (!t) return true;
      return m.title.toLowerCase().includes(t) || m.short.toLowerCase().includes(t) ||
        m.cuisine.toLowerCase().includes(t) || (m.tags ?? []).some((x) => x.toLowerCase().includes(t));
    });

  return (
    <div className="min-h-screen bg-cream pb-40">
      {/* branded scan intro */}
      <AnimatePresence>
        {intro && (
          <motion.div
            className="fixed inset-0 z-[80] grid place-items-center bg-ink"
            initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.6 }}
            onClick={() => setIntro(false)}
          >
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="font-serif text-5xl text-gold">Lumière</div>
              <div className="mt-2 text-[11px] tracking-[5px] uppercase text-cream/50">International Fine Dining</div>
              <div className="mt-5 text-sm text-cream/70">Table {table?.label ?? "—"} · welcome</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* header */}
      <header className="sticky top-0 z-30 bg-ink text-cream">
        <div className="mx-auto max-w-2xl px-5 py-3 flex items-center justify-between">
          <div>
            <div className="font-serif text-2xl leading-none text-gold">Lumière</div>
            <div className="text-[11px] tracking-[3px] uppercase text-cream/50">International Fine Dining</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] uppercase tracking-wide text-cream/50">Table</div>
            <div className="font-serif text-2xl text-gold leading-none">{table?.label ?? "—"}</div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5">
        {/* returning-guest welcome */}
        <AnimatePresence>
          {welcome && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-5 flex items-start gap-3 rounded-2xl border border-gold/40 bg-white p-4 shadow-sm"
            >
              <Sparkles size={18} className="text-gold shrink-0 mt-0.5" />
              <p className="text-sm text-ink">{welcome}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* call-waiter row */}
        <div className="grid grid-cols-3 gap-3 py-5">
          <ServiceBtn icon={<BellRing size={18} />} label="Call waiter" onClick={() => callService("waiter")} disabled={busy} />
          <ServiceBtn icon={<GlassWater size={18} />} label="Water" onClick={() => callService("water")} disabled={busy} />
          <ServiceBtn icon={<ReceiptText size={18} />} label="Ask for bill" onClick={() => callService("bill")} disabled={busy} />
        </div>

        {/* paid receipt */}
        {effReceipt && (
          <div className="mb-6 rounded-2xl bg-white p-6 shadow-sm text-center border border-gold/40">
            <div className="text-green-600 font-medium mb-1">Payment successful</div>
            <div className="font-serif text-3xl text-wine">{money(effReceipt.amount)}</div>
            <div className="text-sm text-neutral-500 mb-4">Table {effReceipt.table} · paid online</div>
            {receiptQr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={receiptQr} alt="receipt" className="w-40 h-40 mx-auto rounded-xl" />
            )}
            <div className="mt-3 text-xs uppercase tracking-widest text-neutral-400">Receipt code</div>
            <div className="font-mono text-lg text-ink">{effReceipt.code}</div>
            <p className="mt-3 text-xs text-neutral-500">Show this at the exit. Thank you for dining with Lumière.</p>
            <button
              onClick={shareReceipt}
              className="mt-4 inline-flex items-center gap-2 text-sm text-wine border border-wine/30 rounded-full px-4 py-2 hover:bg-wine/5"
            >
              <Share2 size={15} /> Share keepsake receipt
            </button>
          </div>
        )}

        {/* live orders */}
        {orders.length > 0 && (
          <section className="mb-6">
            <h2 className="font-serif text-xl mb-3">Your order</h2>
            <div className="space-y-3">
              {orders.map((o) => <OrderCard key={o.id} order={o} menuMap={menuMap} onRate={rate} ratedIds={ratedIds} />)}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm">
              <span className="text-neutral-500">Running total</span>
              <span className="font-serif text-2xl text-wine">{money(total)}</span>
            </div>
            {!effReceipt && total > 0 && (
              <div className="mt-3 grid gap-2">
                {/* tip */}
                <div className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="text-sm text-neutral-600 mb-2">Add a tip for the team</div>
                  <div className="flex gap-2">
                    {[0, 5, 10, 15].map((p) => (
                      <button
                        key={p}
                        onClick={() => { setTipPct(p); setTipCustom(""); }}
                        className={`flex-1 py-2 rounded-xl text-sm border transition ${
                          tipCustom === "" && tipPct === p ? "bg-wine text-white border-wine" : "bg-cream text-neutral-600 border-cream2"
                        }`}
                      >
                        {p === 0 ? "None" : `${p}%`}
                      </button>
                    ))}
                    <input
                      value={tipCustom}
                      onChange={(e) => setTipCustom(e.target.value.replace(/[^0-9]/g, ""))}
                      inputMode="numeric"
                      placeholder="₹"
                      className="w-16 rounded-xl border border-cream2 px-2 text-center text-sm bg-cream focus:outline-none focus:border-gold"
                    />
                  </div>
                  {tipAmt > 0 && (
                    <div className="mt-2 flex justify-between text-xs text-neutral-500">
                      <span>Tip</span><span>{money(tipAmt)}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={payOnline}
                  disabled={payBusy}
                  className="w-full flex items-center justify-center gap-2 bg-ink text-cream rounded-2xl py-4 font-medium disabled:opacity-60"
                >
                  <CreditCard size={18} className="text-gold" />
                  {payBusy ? "Redirecting to payment…" : `Pay online · ${money(payTotal)}`}
                </button>
                <p className="text-center text-xs text-neutral-500">
                  Or tap <b>Ask for bill</b> to pay by cash at the counter.
                </p>
              </div>
            )}
          </section>
        )}

        {/* menu */}
        <h2 className="font-serif text-xl mb-3">Menu</h2>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search dishes, cuisines…"
          className="w-full rounded-full border border-cream2 bg-white px-4 py-2.5 text-sm mb-3 focus:outline-none focus:border-gold"
        />
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5">
          {CUISINES.map((c) => (
            <button
              key={c}
              onClick={() => setCuisine(c)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm border transition ${
                cuisine === c ? "bg-wine text-white border-wine" : "bg-white text-neutral-600 border-cream2"
              }`}
            >
              {c === "Patisserie" ? "Pâtisserie" : c}
            </button>
          ))}
        </div>

        {diets.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5">
            {diets.map((d) => (
              <button
                key={d}
                onClick={() => setDiet(d)}
                className={`shrink-0 px-3.5 py-1 rounded-full text-xs border transition ${
                  diet === d ? "bg-gold text-ink border-gold" : "bg-white text-neutral-600 border-cream2"
                }`}
              >
                {d === "All" ? "All diets" : d}
              </button>
            ))}
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mt-2">
          {filtered.map((m) => (
            <div key={m.id} className={`bg-white rounded-2xl overflow-hidden shadow-sm flex flex-col ${!m.available ? "opacity-60" : ""}`}>
              <div className="flex gap-3 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.image} alt={m.title} className="w-20 h-20 rounded-xl object-cover" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] uppercase tracking-wide text-gold">{m.cuisine}</div>
                    {isTrending(m.id) && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-wine bg-wine/10 px-1.5 py-0.5 rounded-full">
                        <Flame size={11} /> Trending
                      </span>
                    )}
                  </div>
                  <div className="font-serif text-lg leading-tight truncate">{m.title}</div>
                  <div className="text-xs text-neutral-500 line-clamp-2">{m.short}</div>
                  {((m.dietary?.length ?? 0) > 0 || (m.spice ?? 0) > 0) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                      {(m.dietary ?? []).map((d) => (
                        <span key={d} className="text-[10px] text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full">{d}</span>
                      ))}
                      {(m.spice ?? 0) > 0 && (
                        <span className="inline-flex items-center text-[10px] text-red-500">
                          {Array.from({ length: m.spice ?? 0 }).map((_, i) => <Flame key={i} size={11} fill="currentColor" />)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-auto flex items-center justify-between px-3 pb-3">
                <span className="font-medium text-wine">{money(Number(m.price))}</span>
                {!m.available ? (
                  <span className="text-xs font-medium text-neutral-400 uppercase">Sold out</span>
                ) : cart[m.id] ? (
                  <div className="flex items-center gap-3">
                    <button onClick={() => sub(m.id)} className="w-8 h-8 grid place-items-center rounded-full bg-cream2"><Minus size={15} /></button>
                    <span className="w-4 text-center font-medium">{cart[m.id]}</span>
                    <button onClick={() => add(m.id)} className="w-8 h-8 grid place-items-center rounded-full bg-wine text-white"><Plus size={15} /></button>
                  </div>
                ) : (
                  <button onClick={() => add(m.id)} className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-full bg-wine text-white">
                    <Plus size={15} /> Add
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* sticky cart bar */}
      <AnimatePresence>
        {cartCount > 0 && !open && (
          <motion.button
            initial={{ y: 80 }} animate={{ y: 0 }} exit={{ y: 80 }}
            onClick={() => setOpen(true)}
            className="fixed bottom-4 inset-x-0 mx-auto max-w-2xl w-[calc(100%-2.5rem)] z-40 flex items-center justify-between bg-wine text-white rounded-2xl px-5 py-4 shadow-lg"
          >
            <span className="flex items-center gap-2"><ShoppingBag size={18} /> {cartCount} item{cartCount > 1 ? "s" : ""}</span>
            <span className="font-medium">{money(cartTotal)} · Review</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* cart sheet */}
      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-50 bg-black/50 flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
            <motion.div
              className="bg-cream w-full max-w-2xl mx-auto rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto"
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-2xl">Your selection</h3>
                <button onClick={() => setOpen(false)}><X /></button>
              </div>

              <div className="space-y-3">
                {Object.entries(cart).map(([id, q]) => {
                  const m = menuMap[id];
                  if (!m) return null;
                  return (
                    <div key={id} className="flex items-center gap-3 bg-white rounded-xl p-3">
                      <div className="flex-1">
                        <div className="font-medium">{m.title}</div>
                        <div className="text-sm text-wine">{money(Number(m.price))}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => sub(id)} className="w-8 h-8 grid place-items-center rounded-full bg-cream2"><Minus size={15} /></button>
                        <span className="w-4 text-center">{q}</span>
                        <button onClick={() => add(id)} className="w-8 h-8 grid place-items-center rounded-full bg-wine text-white"><Plus size={15} /></button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!snap?.session && (
                <div className="grid grid-cols-2 gap-3 mt-4">
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" className="rounded-xl border border-cream2 px-3 py-2.5 text-sm bg-white" />
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="rounded-xl border border-cream2 px-3 py-2.5 text-sm bg-white" />
                </div>
              )}

              {err && <p className="text-sm text-red-600 mt-3">{err}</p>}

              <button
                onClick={placeOrder}
                disabled={busy}
                className="mt-5 w-full flex items-center justify-center gap-2 bg-wine text-white rounded-2xl py-4 font-medium disabled:opacity-60"
              >
                {busy ? <Loader2 className="animate-spin" size={18} /> : <UtensilsCrossed size={18} />}
                Place order · {money(cartTotal)}
              </button>
              <p className="text-center text-xs text-neutral-400 mt-3">
                Orders are prepared to order. You can keep adding dishes to the same table bill.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }}
            className="fixed top-4 inset-x-0 mx-auto w-fit z-[60] bg-ink text-cream px-5 py-2.5 rounded-full text-sm flex items-center gap-2 shadow-lg"
          >
            <Check size={16} className="text-gold" /> {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ServiceBtn({ icon, label, onClick, disabled }: { icon: React.ReactNode; label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} className="flex flex-col items-center gap-1.5 bg-white rounded-2xl py-3 shadow-sm text-neutral-700 active:scale-95 transition disabled:opacity-60">
      <span className="text-wine">{icon}</span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function OrderCard({ order, menuMap, onRate, ratedIds }: {
  order: SessionOrder; menuMap: Record<string, MenuItem>;
  onRate: (menuItemId: string, stars: number) => void; ratedIds: Set<string>;
}) {
  const stepIdx = ORDER_STEPS.indexOf(order.status);
  const prep = Math.max(...order.items.map((i) => menuMap[i.menu_item_id]?.prep_minutes ?? 15), 10);
  const elapsed = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);
  const remaining = Math.max(0, prep - elapsed);
  const done = order.status === "served";

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-neutral-600">
          {order.items.map((i) => `${i.qty}× ${i.title}`).join(", ")}
        </span>
        <span className="font-medium text-wine">{money(Number(order.amount))}</span>
      </div>
      <div className="flex items-center gap-2 text-sm">
        <ChefHat size={16} className={done ? "text-green-600" : "text-gold"} />
        <span className="font-medium">{STATUS_LABEL[order.status]}</span>
        {!done && remaining > 0 && <span className="text-neutral-400">· ~{remaining} min</span>}
      </div>
      {/* progress */}
      <div className="mt-3 flex gap-1">
        {ORDER_STEPS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= stepIdx ? "bg-gold" : "bg-cream2"}`} />
        ))}
      </div>
      {/* rate served dishes */}
      {done && (
        <div className="mt-3 space-y-2 border-t border-cream2 pt-3">
          {order.items.map((it) => {
            const rated = ratedIds.has(it.menu_item_id);
            return (
              <div key={it.menu_item_id} className="flex items-center justify-between">
                <span className="text-xs text-neutral-500 truncate mr-2">Rate {it.title}</span>
                {rated ? (
                  <span className="text-xs text-green-600">Thanks ✓</span>
                ) : (
                  <span className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} onClick={() => onRate(it.menu_item_id, n)} aria-label={`${n} star`}>
                        <Star size={16} className="text-gold hover:fill-gold" />
                      </button>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
