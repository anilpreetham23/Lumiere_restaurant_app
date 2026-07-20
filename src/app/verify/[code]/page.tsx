import { CheckCircle2, XCircle } from "lucide-react";
import { createAdminClient, serviceRoleConfigured } from "@/lib/supabase/admin";
import { money } from "@/data/menu";

export const dynamic = "force-dynamic";

export default async function VerifyPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  let ok = false;
  let amount = 0;
  let table = "";
  let when = "";

  if (serviceRoleConfigured()) {
    const admin = createAdminClient();
    const { data: sess } = await admin
      .from("dining_sessions")
      .select("payment_status, closed_at, table_id")
      .eq("receipt_code", code)
      .maybeSingle();
    if (sess && sess.payment_status === "paid") {
      ok = true;
      when = sess.closed_at ? new Date(sess.closed_at).toLocaleString("en-IN") : "";
      const { data: t } = await admin.from("restaurant_tables").select("label").eq("id", sess.table_id).maybeSingle();
      table = t?.label ?? "";
      const { data: p } = await admin.from("payments").select("amount").eq("receipt_code", code).maybeSingle();
      amount = Number(p?.amount ?? 0);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-ink text-cream px-6">
      <div className="text-center max-w-sm w-full bg-ink-soft/60 rounded-3xl p-10 border border-white/10">
        <div className="font-serif text-3xl text-gold mb-6">Lumière</div>
        {ok ? (
          <>
            <CheckCircle2 size={64} className="text-green-400 mx-auto mb-4" />
            <div className="text-2xl font-medium">Bill Paid</div>
            <div className="font-serif text-4xl text-gold mt-2">{money(amount)}</div>
            {table && <div className="text-cream/70 mt-1">Table {table}</div>}
            {when && <div className="text-cream/40 text-xs mt-1">{when}</div>}
            <div className="mt-5 font-mono text-sm text-cream/60">{code}</div>
            <p className="mt-6 text-cream/60 text-sm">Guest may leave. Thank you.</p>
          </>
        ) : (
          <>
            <XCircle size={64} className="text-red-400 mx-auto mb-4" />
            <div className="text-2xl font-medium">Not Verified</div>
            <p className="mt-3 text-cream/60 text-sm">
              No paid bill matches this code. Ask the guest to settle at the counter.
            </p>
            <div className="mt-5 font-mono text-sm text-cream/40">{code}</div>
          </>
        )}
      </div>
    </main>
  );
}
