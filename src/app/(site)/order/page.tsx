"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, Trash2, Loader2, CheckCircle2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { money } from "@/data/menu";
import { placeOrder } from "@/actions/public";

export default function OrderPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [form, setForm] = useState({ customer_name: "", email: "", phone: "", notes: "" });

  const SERVICE = total * 0.125;
  const grand = total + SERVICE;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    setError(null);
    const res = await placeOrder({
      ...form,
      items: items.map((i) => ({ id: i.id, title: i.title, price: i.price, qty: i.qty })),
    });
    if (res.ok) {
      setOrderId(res.orderId ?? null);
      setState("done");
      clear();
    } else {
      setError(res.error ?? "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <section className="py-28 bg-cream min-h-[70vh] grid place-items-center">
        <div className="bg-white rounded-2xl p-10 text-center max-w-md mx-5 shadow-lg">
          <CheckCircle2 size={54} className="text-gold mx-auto mb-4" />
          <h1 className="font-serif text-3xl mb-2">Order Received</h1>
          <p className="text-neutral-500">
            Thank you. Your order reference is{" "}
            <span className="font-mono text-wine">{orderId?.slice(0, 8)}</span>. Our kitchen will be in
            touch to confirm timing and payment.
          </p>
          <Link href="/menu" className="btn-gold mt-6">Order Something Else</Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="bg-ink text-white py-16 text-center">
        <span className="section-label">Order Online</span>
        <h1 className="font-serif text-4xl mt-3 text-white">Your Order</h1>
        <div className="gold-line mx-auto mt-4" />
      </section>

      <section className="py-16 bg-cream">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3">
            {items.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center text-neutral-500">
                <ShoppingBag size={44} className="mx-auto mb-3 text-gold/60" />
                <p>Your order is empty.</p>
                <Link href="/menu" className="btn-outline mt-5">Browse the Menu</Link>
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-5 space-y-4">
                {items.map((i) => (
                  <div key={i.id} className="flex gap-4 items-center border-b border-cream2 pb-4 last:border-0 last:pb-0">
                    <Image src={i.image} alt={i.title} width={72} height={72} className="w-18 h-18 rounded-lg object-cover" />
                    <div className="flex-1">
                      <p className="font-medium text-ink">{i.title}</p>
                      <p className="text-wine font-serif">{money(i.price)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setQty(i.id, i.qty - 1)} className="w-7 h-7 grid place-items-center rounded-full bg-cream2"><Minus size={13} /></button>
                      <span className="w-6 text-center">{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)} className="w-7 h-7 grid place-items-center rounded-full bg-cream2"><Plus size={13} /></button>
                    </div>
                    <button onClick={() => remove(i.id)} className="text-neutral-400 hover:text-wine ml-2"><Trash2 size={17} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <form onSubmit={submit} className="bg-white rounded-2xl p-6 space-y-4">
              <h3 className="font-serif text-2xl">Checkout</h3>
              <input required placeholder="Full name" className="field" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              <input required type="email" placeholder="Email" className="field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <input required placeholder="Phone" className="field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <textarea placeholder="Notes (allergies, delivery time...)" rows={3} className="field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />

              <div className="border-t border-cream2 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-neutral-500"><span>Subtotal</span><span>{money(total)}</span></div>
                <div className="flex justify-between text-neutral-500"><span>Service (12.5%)</span><span>{money(SERVICE)}</span></div>
                <div className="flex justify-between font-serif text-xl text-wine pt-1"><span>Total</span><span>{money(grand)}</span></div>
              </div>

              {error && <p className="text-sm text-wine">{error}</p>}
              <button disabled={items.length === 0 || state === "loading"} className="btn-wine w-full justify-center disabled:opacity-60">
                {state === "loading" ? <Loader2 className="animate-spin" size={18} /> : null}
                Place Order
              </button>
              <p className="text-[0.7rem] text-neutral-400 text-center">
                Payment is arranged on confirmation. Card payments (Stripe) can be enabled later.
              </p>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
