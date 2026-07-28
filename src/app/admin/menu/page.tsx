"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  setMenuAvailability, setMenuPrice, addMenuItem, deleteMenuItem,
} from "@/actions/admin";
import type { MenuItem } from "@/lib/order";

const CUISINES = ["France", "Italy", "Japan", "India", "Spain", "Patisserie"];

export default function MenuAdminPage() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({ title: "", cuisine: "France", price: "", short: "", image: "", dietary: "", spice: "0" });
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    const { data } = await supabase.from("menu_items").select("*").order("sort");
    setItems((data ?? []) as MenuItem[]);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  async function toggle(it: MenuItem) {
    setBusy(it.id);
    await setMenuAvailability(it.id, !it.available);
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, available: !x.available } : x)));
    setBusy(null);
  }
  async function savePrice(it: MenuItem, value: string) {
    const price = Number(value);
    if (!Number.isFinite(price) || price === it.price) return;
    setBusy(it.id);
    await setMenuPrice(it.id, price);
    setItems((xs) => xs.map((x) => (x.id === it.id ? { ...x, price } : x)));
    setBusy(null);
  }
  async function add() {
    setErr(null);
    if (!form.title.trim()) { setErr("Enter a dish name."); return; }
    const price = Number(form.price);
    if (!Number.isFinite(price) || price < 0) { setErr("Enter a valid price."); return; }
    setAdding(true);
    const dietary = form.dietary.split(",").map((s) => s.trim()).filter(Boolean);
    const res = await addMenuItem({ title: form.title, cuisine: form.cuisine, price, short: form.short, image: form.image, dietary, spice: Number(form.spice) });
    setAdding(false);
    if (!res.ok) { setErr(res.error ?? "Could not add."); return; }
    setForm({ title: "", cuisine: form.cuisine, price: "", short: "", image: "", dietary: "", spice: "0" });
    load();
  }
  async function del(it: MenuItem) {
    if (!confirm(`Delete "${it.title}"? This cannot be undone.`)) return;
    setBusy(it.id);
    await deleteMenuItem(it.id);
    setItems((xs) => xs.filter((x) => x.id !== it.id));
    setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl">Menu</h1>
        <p className="text-neutral-500 text-sm">
          Add or remove dishes, set ₹ prices, toggle sold-out. Changes apply instantly on every table.
        </p>
      </div>

      {/* add new dish */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h2 className="font-serif text-xl mb-3">Add a dish</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Dish name *" className="field lg:col-span-2" />
          <select value={form.cuisine} onChange={(e) => setForm({ ...form, cuisine: e.target.value })} className="field">
            {CUISINES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} type="number" placeholder="Price ₹ *" className="field" />
          <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} placeholder="Image path (optional)" className="field" />
          <button onClick={add} disabled={adding} className="btn-wine justify-center disabled:opacity-60">
            {adding ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />} Add
          </button>
          <input value={form.dietary} onChange={(e) => setForm({ ...form, dietary: e.target.value })} placeholder="Dietary tags, comma-sep (e.g. Veg, Vegan, GF)" className="field lg:col-span-4" />
          <select value={form.spice} onChange={(e) => setForm({ ...form, spice: e.target.value })} className="field lg:col-span-2">
            <option value="0">No spice</option>
            <option value="1">Mild 🌶</option>
            <option value="2">Medium 🌶🌶</option>
            <option value="3">Hot 🌶🌶🌶</option>
          </select>
          <input value={form.short} onChange={(e) => setForm({ ...form, short: e.target.value })} placeholder="Short description (optional)" className="field lg:col-span-6" />
        </div>
        {err && <p className="text-sm text-wine mt-2">{err}</p>}
      </div>

      {/* list */}
      <div className="bg-white rounded-2xl p-5 shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-neutral-400">
              <th className="pb-2 pr-4 font-medium">Dish</th>
              <th className="pb-2 pr-4 font-medium">Cuisine</th>
              <th className="pb-2 pr-4 font-medium">Price (₹)</th>
              <th className="pb-2 pr-4 font-medium">Available</th>
              <th className="pb-2 pr-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-t border-cream2">
                <td className="py-3 pr-4 font-medium text-ink">{it.title}</td>
                <td className="py-3 pr-4 text-neutral-500">{it.cuisine}</td>
                <td className="py-3 pr-4">
                  <input type="number" defaultValue={it.price} onBlur={(e) => savePrice(it, e.target.value)} className="w-24 rounded-lg border border-cream2 px-2 py-1" />
                </td>
                <td className="py-3 pr-4">
                  <button onClick={() => toggle(it)} disabled={busy === it.id}
                    className={`relative w-12 h-6 rounded-full transition ${it.available ? "bg-green-500" : "bg-neutral-300"}`} aria-label="toggle availability">
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${it.available ? "left-6" : "left-0.5"}`} />
                  </button>
                  <span className="ml-2 text-xs text-neutral-500">{it.available ? "On menu" : "Sold out"}</span>
                </td>
                <td className="py-3 pr-4">
                  <button onClick={() => del(it)} disabled={busy === it.id} className="text-neutral-400 hover:text-wine" aria-label="delete">
                    <Trash2 size={17} />
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr><td colSpan={5} className="py-8 text-center text-neutral-400">Loading menu…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
