"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function setReservationStatus(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authorised" };
  const { error } = await supabase.from("reservations").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setOrderStatus(id: string, status: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authorised" };
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin");
  return { ok: true };
}

// ---------- Kitchen Display + menu availability ----------

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ? supabase : null;
}

export async function setSessionOrderStatus(id: string, status: string) {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const { error } = await supabase.from("session_orders").update({ status }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resolveServiceRequest(id: string) {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const { error } = await supabase.from("service_requests").update({ status: "done" }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function setMenuAvailability(id: string, available: boolean) {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const { error } = await supabase.from("menu_items").update({ available }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function setMenuPrice(id: string, price: number) {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  if (!Number.isFinite(price) || price < 0) return { ok: false, error: "Bad price" };
  const { error } = await supabase.from("menu_items").update({ price }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function addMenuItem(input: {
  title: string; cuisine: string; price: number; image?: string; short?: string;
  dietary?: string[]; spice?: number;
}) {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title required" };
  if (!Number.isFinite(input.price) || input.price < 0) return { ok: false, error: "Bad price" };
  const id =
    title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") +
    "-" + Math.random().toString(36).slice(2, 6);
  const row = {
    id,
    title,
    cuisine: input.cuisine,
    price: input.price,
    image: input.image?.trim() || "/img/menu/1.jpg",
    short: input.short?.trim() || title,
    description: input.short?.trim() || title,
    tags: [],
    dietary: input.dietary ?? [],
    spice: Number.isFinite(input.spice) ? input.spice : 0,
    sort: 999,
  };
  const { error } = await supabase.from("menu_items").insert(row);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

export async function updateSettings(patch: Record<string, unknown>) {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const { error } = await supabase.from("app_settings").update(patch).eq("id", 1);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}

export async function setTableState(id: string, state: "free" | "reserved" | "occupied") {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const patch: Record<string, unknown> = { state };
  if (state === "free") patch.current_session_id = null;
  const { error } = await supabase.from("restaurant_tables").update(patch).eq("id", id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteMenuItem(id: string) {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const { error } = await supabase.from("menu_items").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/menu");
  return { ok: true };
}

// Cashier: settle + free the table.
export async function settleSession(sessionId: string, method: "cash" | "online") {
  const supabase = await requireStaff();
  if (!supabase) return { ok: false, error: "Not authorised" };
  const { data: sess, error: e1 } = await supabase
    .from("dining_sessions")
    .update({ status: "paid", payment_status: "paid", payment_method: method, closed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .select("table_id")
    .single();
  if (e1) return { ok: false, error: e1.message };
  if (sess?.table_id) {
    await supabase
      .from("restaurant_tables")
      .update({ state: "free", current_session_id: null })
      .eq("id", sess.table_id);
  }
  return { ok: true };
}
