import { createClient } from "@/lib/supabase/server";
import type { MenuItem, SessionSnapshot } from "@/lib/order";
import { confirmBillPayment, type Receipt } from "@/actions/pay";
import TableOrder from "@/components/TableOrder";

export const dynamic = "force-dynamic";

export default async function TablePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ paid?: string; cs?: string; intent_id?: string }>;
}) {
  const { token } = await params;
  const { paid, cs, intent_id } = await searchParams;

  // returning from Stripe Checkout: non-settling status check if webhook already settled intent
  let receipt: Receipt | null = null;
  if (paid === "1" && (cs || intent_id)) {
    const res = await confirmBillPayment(token, cs || "", intent_id);
    if (res.ok && res.receipt) receipt = res.receipt;
  }

  const supabase = await createClient();

  const [{ data: snap }, { data: menu }] = await Promise.all([
    supabase.rpc("get_session", { p_token: token }),
    supabase.from("menu_items").select("*").order("sort"),
  ]);

  const snapshot = snap as SessionSnapshot;

  if (!snapshot) {
    return (
      <main className="min-h-screen grid place-items-center bg-ink text-cream px-6 text-center">
        <div>
          <div className="font-serif text-4xl text-gold mb-3">Lumière</div>
          <p className="text-cream/70">
            This QR code is not valid. Please scan the code on your table, or ask a
            member of our staff for help.
          </p>
        </div>
      </main>
    );
  }

  return (
    <TableOrder
      token={token}
      initial={snapshot}
      menu={(menu ?? []) as MenuItem[]}
      receipt={receipt}
    />
  );
}
