"use server";

import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; error?: string };

function str(fd: FormData, k: string) {
  return String(fd.get(k) ?? "").trim();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,20}$/;

function todayISO() {
  // local calendar date as YYYY-MM-DD
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function submitReservation(fd: FormData): Promise<ActionResult> {
  const row = {
    name: str(fd, "name"),
    phone: str(fd, "phone"),
    email: str(fd, "email"),
    guests: str(fd, "guests"),
    date: str(fd, "date"),
    time: str(fd, "time"),
    requests: str(fd, "requests") || null,
  };
  if (!row.name || !row.email || !row.phone || !row.date || !row.time) {
    return { ok: false, error: "Please complete all required fields." };
  }
  if (!EMAIL_RE.test(row.email)) return { ok: false, error: "Enter a valid email address." };
  if (!PHONE_RE.test(row.phone)) return { ok: false, error: "Enter a valid phone number." };
  if (row.date < todayISO()) return { ok: false, error: "Please choose today or a future date." };
  const supabase = await createClient();
  const { error } = await supabase.from("reservations").insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function submitContact(fd: FormData): Promise<ActionResult> {
  const row = {
    name: str(fd, "name"),
    email: str(fd, "email"),
    phone: str(fd, "phone") || null,
    subject: str(fd, "subject") || "General Inquiry",
    message: str(fd, "message"),
  };
  if (!row.name || !row.email || !row.message) {
    return { ok: false, error: "Please complete all required fields." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert(row);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function subscribeNewsletter(fd: FormData): Promise<ActionResult> {
  const email = str(fd, "email");
  if (!email || !email.includes("@")) return { ok: false, error: "Enter a valid email." };
  const supabase = await createClient();
  const { error } = await supabase.from("subscribers").insert({ email });
  // 23505 = unique violation -> already subscribed, treat as success
  if (error && error.code !== "23505") return { ok: false, error: error.message };
  return { ok: true };
}

export type OrderItem = { id: string; title: string; price: number; qty: number };

export async function placeOrder(payload: {
  customer_name: string;
  email: string;
  phone: string;
  notes?: string;
  items: OrderItem[];
}): Promise<ActionResult & { orderId?: string }> {
  const { customer_name, email, phone, notes, items } = payload;
  if (!customer_name || !email || !phone) {
    return { ok: false, error: "Please complete your contact details." };
  }
  if (!EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (!PHONE_RE.test(phone)) return { ok: false, error: "Enter a valid phone number." };
  if (!items?.length) return { ok: false, error: "Your order is empty." };

  const total = items.reduce((s, i) => s + i.price * i.qty, 0);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .insert({
      customer_name,
      email,
      phone,
      notes: notes || null,
      items,
      total,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, orderId: data.id };
}
