"use server";

import { createHmac } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { stripe, stripeConfigured } from "@/lib/stripe";
import type { SessionSnapshot, SessionOrder } from "@/lib/order";

export type Receipt = { code: string; amount: number; table: string; method: string };

// Result of starting a payment — either a redirect (Stripe) or modal params (Razorpay).
export type StartResult =
  | { ok: true; gateway: "stripe"; url: string; intentId?: string }
  | { ok: true; gateway: "razorpay"; intentId?: string; orderId: string; keyId: string; amount: number; name: string; label: string }
  | { ok: false; error: string };

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
const GATEWAY = () => (process.env.PAYMENT_GATEWAY || "stripe").toLowerCase();

async function billTotal(token: string): Promise<{ total: number; label: string } | null> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_session", { p_token: token });
  const snap = data as SessionSnapshot;
  if (!snap || !snap.session) return null;
  const total = (snap.orders as SessionOrder[]).reduce((s, o) => s + Number(o.amount), 0);
  return { total, label: snap.table.label };
}

// Shared settlement: mark session paid, free table, record payment (idempotent).
async function settle(token: string, ref: string, method: string): Promise<{ ok: boolean; receipt?: Receipt; error?: string }> {
  if (!serviceRoleConfigured()) return { ok: false, error: "Server not configured (service role key)." };
  const admin = createAdminClient();

  const { data: table } = await admin.from("restaurant_tables").select("id,label").eq("token", token).single();
  if (!table) return { ok: false, error: "Table not found." };

  const { data: sess } = await admin.from("dining_sessions").select("*")
    .eq("table_id", table.id).in("status", ["open", "bill_pending", "paid"])
    .order("created_at", { ascending: false }).limit(1).single();
  if (!sess) return { ok: false, error: "Session not found." };

  const { data: orders } = await admin.from("session_orders").select("amount").eq("session_id", sess.id);
  const amount = (orders ?? []).reduce((s, o) => s + Number(o.amount), 0) + Number(sess.tip || 0);

  if (sess.payment_status === "paid" && sess.receipt_code) {
    return { ok: true, receipt: { code: sess.receipt_code, amount, table: table.label, method } };
  }

  const code = "LM-" + Math.random().toString(36).slice(2, 8).toUpperCase();
  await admin.from("dining_sessions").update({
    status: "paid", payment_status: "paid", payment_method: method,
    receipt_code: code, closed_at: new Date().toISOString(),
  }).eq("id", sess.id);
  await admin.from("restaurant_tables").update({ state: "free", current_session_id: null }).eq("id", table.id);
  await admin.from("payments").insert({
    session_id: sess.id, amount, currency: "inr",
    provider: method === "online" ? GATEWAY() : method,
    stripe_payment_intent: ref, status: "paid", receipt_code: code,
  });
  return { ok: true, receipt: { code, amount, table: table.label, method } };
}

// Persist a tip on the open session so settle() charges + records it.
async function setSessionTip(token: string, tip: number) {
  if (!serviceRoleConfigured() || tip <= 0) return;
  const admin = createAdminClient();
  const { data: table } = await admin.from("restaurant_tables").select("id").eq("token", token).single();
  if (!table) return;
  const { data: sess } = await admin.from("dining_sessions").select("id")
    .eq("table_id", table.id).in("status", ["open", "bill_pending"])
    .order("created_at", { ascending: false }).limit(1).single();
  if (sess) await admin.from("dining_sessions").update({ tip }).eq("id", sess.id);
}

// ---- Start a payment (gateway chosen by PAYMENT_GATEWAY env) ----
export async function startBillPayment(token: string, tip = 0): Promise<StartResult> {
  if (!serviceRoleConfigured()) return { ok: false, error: "Server not configured (service role key)." };
  const admin = createAdminClient();

  const { data: table } = await admin.from("restaurant_tables").select("id,label").eq("token", token).single();
  if (!table) return { ok: false, error: "Table not found." };

  const { data: sess } = await admin.from("dining_sessions").select("id,status,payment_status")
    .eq("table_id", table.id).in("status", ["open", "bill_pending"])
    .order("created_at", { ascending: false }).limit(1).single();
  if (!sess) return { ok: false, error: "No open bill for this table." };

  const { data: orders } = await admin.from("session_orders").select("amount").eq("session_id", sess.id);
  const orderTotal = (orders ?? []).reduce((s, o) => s + Number(o.amount), 0);
  if (orderTotal <= 0) return { ok: false, error: "Your bill is empty." };

  const t = Number.isFinite(tip) && tip > 0 ? Math.round(tip) : 0;
  await setSessionTip(token, t);
  const grandTotal = orderTotal + t;
  const paise = Math.round(grandTotal * 100);

  if (GATEWAY() === "razorpay") {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) return { ok: false, error: "Online payment is not set up yet." };

    const { data: intent, error: intentErr } = await admin.from("payment_intents").insert({
      purpose: "dine_in_bill",
      session_id: sess.id,
      table_token: token,
      expected_amount: grandTotal,
      currency: "INR",
      tip_amount: t,
      provider: "razorpay",
      status: "created",
      metadata: { token, session_id: sess.id, table_label: table.label }
    }).select("id").single();

    if (intentErr || !intent) {
      return { ok: false, error: "Failed to initialize payment intent." };
    }

    try {
      const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
        },
        body: JSON.stringify({
          amount: paise,
          currency: "INR",
          notes: { intent_id: intent.id, token, session_id: sess.id }
        }),
      });

      if (!res.ok) {
        await admin.from("payment_intents").update({ status: "failed", failure_reason: `Razorpay HTTP ${res.status}` }).eq("id", intent.id);
        return { ok: false, error: "Razorpay order creation failed (" + res.status + ")." };
      }

      const order = await res.json();

      await admin.from("payment_intents").update({
        provider_order_id: order.id,
        status: "processing"
      }).eq("id", intent.id);

      return {
        ok: true,
        gateway: "razorpay",
        intentId: intent.id,
        orderId: order.id,
        keyId,
        amount: paise,
        name: "Lumière",
        label: table.label
      };
    } catch (e) {
      await admin.from("payment_intents").update({ status: "failed", failure_reason: e instanceof Error ? e.message : "Razorpay error" }).eq("id", intent.id);
      return { ok: false, error: e instanceof Error ? e.message : "Razorpay error" };
    }
  }

  // default: Stripe hosted checkout (redirect)
  if (!stripeConfigured()) return { ok: false, error: "Online payment is not set up yet." };

  const { data: intent, error: intentErr } = await admin.from("payment_intents").insert({
    purpose: "dine_in_bill",
    session_id: sess.id,
    table_token: token,
    expected_amount: grandTotal,
    currency: "INR",
    tip_amount: t,
    provider: "stripe",
    status: "created",
    metadata: { token, session_id: sess.id, table_label: table.label }
  }).select("id").single();

  if (intentErr || !intent) {
    return { ok: false, error: "Failed to initialize payment intent." };
  }

  try {
    const cs = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [{
        price_data: { currency: "inr", product_data: { name: `Table ${table.label} — Lumière` }, unit_amount: paise },
        quantity: 1,
      }],
      success_url: `${SITE()}/t/${token}?paid=1&intent_id=${intent.id}&cs={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE()}/t/${token}`,
      metadata: { intent_id: intent.id, token, session_id: sess.id },
    });

    await admin.from("payment_intents").update({
      provider_order_id: cs.id,
      status: "processing"
    }).eq("id", intent.id);

    return { ok: true, gateway: "stripe", url: cs.url ?? "", intentId: intent.id };
  } catch (e) {
    await admin.from("payment_intents").update({ status: "failed", failure_reason: e instanceof Error ? e.message : "Stripe error" }).eq("id", intent.id);
    return { ok: false, error: e instanceof Error ? e.message : "Stripe error" };
  }
}

// Check status of a payment intent (used for frontend polling/verification)
export async function checkPaymentIntentStatus(intentId: string, token: string): Promise<{
  ok: boolean;
  status: string;
  receipt?: Receipt;
  error?: string;
}> {
  if (!serviceRoleConfigured() || !intentId) return { ok: false, status: "error", error: "Invalid parameters" };
  const admin = createAdminClient();

  const { data: intent } = await admin.from("payment_intents").select("*").eq("id", intentId).single();
  if (!intent) return { ok: false, status: "not_found", error: "Payment intent not found" };

  if (intent.table_token && intent.table_token !== token) {
    return { ok: false, status: "unauthorized", error: "Unauthorized table reference" };
  }

  if (intent.status === "succeeded") {
    const { data: payment } = await admin.from("payments").select("*").eq("intent_id", intentId).maybeSingle();
    const { data: table } = await admin.from("restaurant_tables").select("label").eq("token", token).single();
    if (payment) {
      return {
        ok: true,
        status: "succeeded",
        receipt: {
          code: payment.receipt_code,
          amount: Number(payment.paid_amount),
          table: table?.label ?? "—",
          method: "online"
        }
      };
    }
  }

  if (intent.status === "failed") {
    return { ok: false, status: "failed", error: intent.failure_reason || "Payment verification failed." };
  }

  return { ok: true, status: intent.status };
}

// ---- Stripe: check payment intent status after redirect (non-settling lookup) ----
export async function confirmBillPayment(token: string, cs: string, intentId?: string): Promise<{ ok: boolean; receipt?: Receipt; error?: string }> {
  if (!serviceRoleConfigured()) return { ok: false, error: "Payments not configured." };
  const admin = createAdminClient();

  let query = admin.from("payment_intents").select("id, status");
  if (intentId) {
    query = query.eq("id", intentId);
  } else if (cs) {
    query = query.eq("provider_order_id", cs);
  } else {
    return { ok: false, error: "Missing intent reference." };
  }

  const { data: intent } = await query.maybeSingle();
  if (!intent) return { ok: false, error: "Payment intent not found." };

  if (intent.status === "succeeded") {
    const res = await checkPaymentIntentStatus(intent.id, token);
    if (res.ok && res.receipt) return { ok: true, receipt: res.receipt };
  }

  return { ok: false, error: "Payment verification pending." };
}

// ---- Razorpay: check payment intent status after modal (non-settling lookup) ----
export async function verifyRazorpayPayment(
  token: string, orderId: string, paymentId: string, signature: string
): Promise<{ ok: boolean; receipt?: Receipt; error?: string }> {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { ok: false, error: "Payments not configured." };
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  if (expected !== signature) return { ok: false, error: "Payment signature verification failed." };

  if (!serviceRoleConfigured()) return { ok: false, error: "Payments not configured." };
  const admin = createAdminClient();

  const { data: intent } = await admin.from("payment_intents").select("id, status")
    .eq("provider_order_id", orderId)
    .maybeSingle();

  if (!intent) return { ok: false, error: "Payment intent not found." };

  if (intent.status === "succeeded") {
    const res = await checkPaymentIntentStatus(intent.id, token);
    if (res.ok && res.receipt) return { ok: true, receipt: res.receipt };
  }

  return { ok: false, error: "Payment verification pending with bank." };
}

// ============================================================
// RESERVATIONS — booking + refundable deposit (anti no-show)
// ============================================================

const RES_DEPOSIT = () => Number(process.env.RESERVATION_DEPOSIT || 500);

// True when a gateway + service role are configured (so we can charge a deposit).
function paymentsEnabled(): boolean {
  if (!serviceRoleConfigured()) return false;
  if (GATEWAY() === "razorpay") return !!process.env.RAZORPAY_KEY_ID && !!process.env.RAZORPAY_KEY_SECRET;
  return stripeConfigured();
}

export type ReservationInput = {
  name: string; phone: string; email: string; guests: string;
  date: string; time: string; requests?: string;
  pre_order?: { menu_item_id: string; qty: number }[];
};

// Create the reservation. If payments are on, it starts as deposit-pending
// (confirmed after the deposit is paid); otherwise it's a free request.
export async function createReservation(
  input: ReservationInput
): Promise<{ ok: boolean; id?: string; deposit?: number; payEnabled?: boolean; error?: string }> {
  if (!input.name || !input.email || !input.phone || !input.date || !input.time)
    return { ok: false, error: "Please complete all required fields." };
  if (input.date < new Date().toLocaleDateString("en-CA"))
    return { ok: false, error: "Please choose today or a future date." };

  const payEnabled = paymentsEnabled();
  const deposit = payEnabled ? RES_DEPOSIT() : 0;

  if (!serviceRoleConfigured()) {
    // no service role → fall back to the plain public insert (anon)
    const supabase = await createClient();
    const { error } = await supabase.from("reservations").insert({
      name: input.name, phone: input.phone, email: input.email, guests: input.guests,
      date: input.date, time: input.time, requests: input.requests || null,
      pre_order: input.pre_order ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, deposit: 0, payEnabled: false };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.from("reservations").insert({
    name: input.name, phone: input.phone, email: input.email, guests: input.guests,
    date: input.date, time: input.time, requests: input.requests || null,
    pre_order: input.pre_order ?? null,
    deposit_amount: deposit,
    deposit_status: deposit > 0 ? "pending" : "none",
    status: "pending",
  }).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id, deposit, payEnabled };
}

async function settleReservation(rid: string, ref: string): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { data: r } = await admin.from("reservations").select("deposit_amount,deposit_status").eq("id", rid).single();
  if (!r) return { ok: false, error: "Reservation not found." };
  if (r.deposit_status === "paid") return { ok: true };
  await admin.from("reservations").update({ deposit_status: "paid", status: "confirmed" }).eq("id", rid);
  await admin.from("payments").insert({
    reservation_id: rid, amount: Number(r.deposit_amount), currency: "inr",
    provider: GATEWAY(), stripe_payment_intent: ref, status: "paid",
  });
  return { ok: true };
}

export async function startReservationDeposit(rid: string): Promise<StartResult> {
  if (!paymentsEnabled()) return { ok: false, error: "Deposits are not enabled." };
  const admin = createAdminClient();
  const { data: r } = await admin.from("reservations").select("deposit_amount,name").eq("id", rid).single();
  if (!r) return { ok: false, error: "Reservation not found." };
  const paise = Math.round(Number(r.deposit_amount) * 100);
  if (paise <= 0) return { ok: false, error: "No deposit due." };

  if (GATEWAY() === "razorpay") {
    const keyId = process.env.RAZORPAY_KEY_ID!, keySecret = process.env.RAZORPAY_KEY_SECRET!;
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64") },
      body: JSON.stringify({ amount: paise, currency: "INR", notes: { rid } }),
    });
    if (!res.ok) return { ok: false, error: "Razorpay error (" + res.status + ")." };
    const order = await res.json();
    return { ok: true, gateway: "razorpay", orderId: order.id, keyId, amount: paise, name: "Lumière Deposit", label: "Reservation" };
  }

  const cs = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price_data: { currency: "inr", product_data: { name: "Lumière — Reservation Deposit" }, unit_amount: paise }, quantity: 1 }],
    success_url: `${SITE()}/reservations?dep=1&rid=${rid}&cs={CHECKOUT_SESSION_ID}`,
    cancel_url: `${SITE()}/reservations?dep=cancel`,
    metadata: { rid },
  });
  return { ok: true, gateway: "stripe", url: cs.url ?? "" };
}

export async function confirmReservationDeposit(rid: string, cs: string): Promise<{ ok: boolean; error?: string }> {
  if (!stripeConfigured()) return { ok: false, error: "Payments not configured." };
  const session = await stripe.checkout.sessions.retrieve(cs);
  if (session.payment_status !== "paid") return { ok: false, error: "Deposit not completed." };
  const pi = typeof session.payment_intent === "string" ? session.payment_intent : cs;
  return await settleReservation(rid, pi);
}

export async function verifyReservationDeposit(
  rid: string, orderId: string, paymentId: string, signature: string
): Promise<{ ok: boolean; error?: string }> {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return { ok: false, error: "Payments not configured." };
  const expected = createHmac("sha256", secret).update(`${orderId}|${paymentId}`).digest("hex");
  if (expected !== signature) return { ok: false, error: "Signature verification failed." };
  return await settleReservation(rid, paymentId);
}
