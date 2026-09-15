import { NextResponse, type NextRequest } from "next/server";
import { stripe, stripeConfigured } from "@/lib/stripe";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import type Stripe from "stripe";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  if (!serviceRoleConfigured() || !stripeConfigured()) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: `Webhook error: ${msg}` }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Idempotency check via webhook_events
  const { error: eventErr } = await admin.from("webhook_events").insert({
    provider: "stripe",
    event_id: event.id,
    event_type: event.type,
    payload: event as any,
    status: "pending",
  });

  // Duplicate event -> return 200 OK safely
  if (eventErr && eventErr.code === "23505") {
    return NextResponse.json({ status: "already_processed" }, { status: 200 });
  }

  // Handle checkout.session.completed
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status !== "paid") {
      await admin.from("webhook_events").update({ status: "ignored" }).eq("event_id", event.id);
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const intentId = session.metadata?.intent_id;
    const csId = session.id;

    // Retrieve payment intent
    let intentQuery = admin.from("payment_intents").select("*");
    if (intentId) {
      intentQuery = intentQuery.eq("id", intentId);
    } else if (csId) {
      intentQuery = intentQuery.eq("provider_order_id", csId);
    } else {
      await admin.from("webhook_events").update({ status: "failed", error_message: "No intent/order reference" }).eq("event_id", event.id);
      return NextResponse.json({ error: "No intent/order reference" }, { status: 400 });
    }

    const { data: intent } = await intentQuery.maybeSingle();

    if (!intent) {
      await admin.from("webhook_events").update({ status: "failed", error_message: "Payment intent not found" }).eq("event_id", event.id);
      return NextResponse.json({ error: "Payment intent not found" }, { status: 400 });
    }

    // Verify Provider, Purpose, Amount, Currency
    if (intent.provider !== "stripe") {
      await admin.from("webhook_events").update({ status: "failed", error_message: "Provider mismatch" }).eq("event_id", event.id);
      return NextResponse.json({ error: "Provider mismatch" }, { status: 400 });
    }

    if (intent.purpose !== "dine_in_bill" && intent.purpose !== "reservation_deposit") {
      await admin.from("webhook_events").update({ status: "ignored" }).eq("event_id", event.id);
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    // Amount total in paise to INR
    const paidAmount = (session.amount_total ?? 0) / 100;
    if (paidAmount < Number(intent.expected_amount)) {
      await admin.from("payment_intents").update({ status: "failed", failure_reason: "Underpaid amount" }).eq("id", intent.id);
      await admin.from("webhook_events").update({ status: "failed", error_message: "Underpaid amount" }).eq("event_id", event.id);
      return NextResponse.json({ error: "Underpaid amount" }, { status: 400 });
    }

    if ((session.currency || "").toUpperCase() !== (intent.currency || "").toUpperCase()) {
      await admin.from("webhook_events").update({ status: "failed", error_message: "Currency mismatch" }).eq("event_id", event.id);
      return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
    }

    // Extract Stripe Payment Intent ID or fallback to Checkout Session ID
    const paymentId = typeof session.payment_intent === "string" ? session.payment_intent : session.id;

    // Execute atomic settlement via service_role client ONLY
    const { data: settleResult, error: settleErr } = await admin.rpc("settle_payment_intent_atomic", {
      p_intent_id: intent.id,
      p_provider_payment_id: paymentId,
      p_paid_amount: paidAmount,
      p_currency: intent.currency,
      p_payment_method_type: "online",
      p_provider: "stripe",
    });

    if (settleErr || (settleResult && !settleResult.ok)) {
      const errMsg = settleErr?.message || settleResult?.error || "Settlement failed";
      await admin.from("webhook_events").update({ status: "failed", error_message: errMsg }).eq("event_id", event.id);
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    await admin.from("webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("event_id", event.id);
    return NextResponse.json({ status: "settled", receipt: settleResult.receipt_code }, { status: 200 });
  }

  await admin.from("webhook_events").update({ status: "ignored" }).eq("event_id", event.id);
  return NextResponse.json({ status: "ignored" }, { status: 200 });
}
