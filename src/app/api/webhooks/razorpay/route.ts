import { NextResponse, type NextRequest } from "next/server";
import { createHmac } from "node:crypto";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function POST(request: NextRequest) {
  if (!serviceRoleConfigured()) {
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const expectedSignature = createHmac("sha256", secret).update(rawBody).digest("hex");
  if (expectedSignature !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = body.event;
  const paymentEntity = body.payload?.payment?.entity;
  const eventId = body.event_id || (paymentEntity ? `${eventType}_${paymentEntity.id}` : null);

  if (!eventId || !eventType) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Idempotency logging
  const { error: eventErr } = await admin.from("webhook_events").insert({
    provider: "razorpay",
    event_id: eventId,
    event_type: eventType,
    payload: body,
    status: "pending",
  });

  // Duplicate event -> return 200 OK safely
  if (eventErr && eventErr.code === "23505") {
    return NextResponse.json({ status: "already_processed" }, { status: 200 });
  }

  // Handle payment.captured or order.paid
  if (eventType === "payment.captured" || eventType === "order.paid") {
    if (!paymentEntity) {
      await admin.from("webhook_events").update({ status: "ignored" }).eq("event_id", eventId);
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const orderId = paymentEntity.order_id;
    const paymentId = paymentEntity.id;
    const notes = paymentEntity.notes || {};
    const intentId = notes.intent_id;

    // Retrieve payment intent
    let intentQuery = admin.from("payment_intents").select("*");
    if (intentId) {
      intentQuery = intentQuery.eq("id", intentId);
    } else if (orderId) {
      intentQuery = intentQuery.eq("provider_order_id", orderId);
    } else {
      await admin.from("webhook_events").update({ status: "failed", error_message: "No intent/order reference" }).eq("event_id", eventId);
      return NextResponse.json({ error: "No intent/order reference" }, { status: 400 });
    }

    const { data: intent } = await intentQuery.maybeSingle();

    if (!intent) {
      await admin.from("webhook_events").update({ status: "failed", error_message: "Payment intent not found" }).eq("event_id", eventId);
      return NextResponse.json({ error: "Payment intent not found" }, { status: 400 });
    }

    // Verify Provider, Purpose, Amount, Currency, Status
    if (intent.provider !== "razorpay") {
      await admin.from("webhook_events").update({ status: "failed", error_message: "Provider mismatch" }).eq("event_id", eventId);
      return NextResponse.json({ error: "Provider mismatch" }, { status: 400 });
    }

    if (intent.purpose !== "dine_in_bill" && intent.purpose !== "reservation_deposit") {
      await admin.from("webhook_events").update({ status: "ignored" }).eq("event_id", eventId);
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    const paidAmount = Number(paymentEntity.amount) / 100; // paise to INR
    if (paidAmount < Number(intent.expected_amount)) {
      await admin.from("payment_intents").update({ status: "failed", failure_reason: "Underpaid amount" }).eq("id", intent.id);
      await admin.from("webhook_events").update({ status: "failed", error_message: "Underpaid amount" }).eq("event_id", eventId);
      return NextResponse.json({ error: "Underpaid amount" }, { status: 400 });
    }

    if ((paymentEntity.currency || "").toUpperCase() !== (intent.currency || "").toUpperCase()) {
      await admin.from("webhook_events").update({ status: "failed", error_message: "Currency mismatch" }).eq("event_id", eventId);
      return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
    }

    if (paymentEntity.status !== "captured") {
      await admin.from("webhook_events").update({ status: "ignored" }).eq("event_id", eventId);
      return NextResponse.json({ status: "ignored" }, { status: 200 });
    }

    // Execute atomic settlement via service_role client ONLY
    const methodType = paymentEntity.method || "online";
    const { data: settleResult, error: settleErr } = await admin.rpc("settle_payment_intent_atomic", {
      p_intent_id: intent.id,
      p_provider_payment_id: paymentId,
      p_paid_amount: paidAmount,
      p_currency: intent.currency,
      p_payment_method_type: methodType,
      p_provider: "razorpay",
    });

    if (settleErr || (settleResult && !settleResult.ok)) {
      const errMsg = settleErr?.message || settleResult?.error || "Settlement failed";
      await admin.from("webhook_events").update({ status: "failed", error_message: errMsg }).eq("event_id", eventId);
      return NextResponse.json({ error: errMsg }, { status: 400 });
    }

    await admin.from("webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("event_id", eventId);
    return NextResponse.json({ status: "settled", receipt: settleResult.receipt_code }, { status: 200 });
  }

  if (eventType === "payment.failed") {
    if (paymentEntity?.notes?.intent_id) {
      await admin.from("payment_intents").update({ status: "failed", failure_reason: paymentEntity.error_description || "Payment failed" }).eq("id", paymentEntity.notes.intent_id);
    }
    await admin.from("webhook_events").update({ status: "processed", processed_at: new Date().toISOString() }).eq("event_id", eventId);
    return NextResponse.json({ status: "payment_failed_recorded" }, { status: 200 });
  }

  await admin.from("webhook_events").update({ status: "ignored" }).eq("event_id", eventId);
  return NextResponse.json({ status: "ignored" }, { status: 200 });
}
