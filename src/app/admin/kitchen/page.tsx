"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BellRing, GlassWater, ReceiptText, Check, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/data/menu";
import { setSessionOrderStatus, resolveServiceRequest } from "@/actions/admin";
import type { SessionOrder, OrderLine } from "@/lib/order";

type TableRow = { id: string; label: string };
type SessionRow = { id: string; table_id: string };
type Req = { id: string; table_id: string; type: string; status: string };

const NEXT: Record<string, { to: string; label: string } | null> = {
  placed: { to: "accepted", label: "Accept" },
  accepted: { to: "preparing", label: "Start preparing" },
  preparing: { to: "ready", label: "Mark ready" },
  ready: { to: "served", label: "Mark served" },
  served: null,
};

const REQ_ICON: Record<string, React.ReactNode> = {
  waiter: <BellRing size={15} />,
  water: <GlassWater size={15} />,
  bill: <ReceiptText size={15} />,
};

export default function KitchenPage() {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<SessionOrder[]>([]);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [o, s, t, r] = await Promise.all([
      supabase.from("session_orders").select("*").neq("status", "served").order("created_at"),
      supabase.from("dining_sessions").select("id,table_id").in("status", ["open", "bill_pending"]),
      supabase.from("restaurant_tables").select("id,label"),
      supabase.from("service_requests").select("*").neq("status", "done").order("created_at"),
    ]);
    setOrders((o.data ?? []) as SessionOrder[]);
    setSessions((s.data ?? []) as SessionRow[]);
    setTables((t.data ?? []) as TableRow[]);
    setReqs((r.data ?? []) as Req[]);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("kitchen")
      .on("postgres_changes", { event: "*", schema: "public", table: "session_orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_requests" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "dining_sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  const tableOf = useMemo(() => {
    const sMap = Object.fromEntries(sessions.map((s) => [s.id, s.table_id]));
    const tMap = Object.fromEntries(tables.map((t) => [t.id, t.label]));
    return (sessionId: string) => tMap[sMap[sessionId]] ?? "—";
  }, [sessions, tables]);

  async function advance(o: SessionOrder) {
    const nx = NEXT[o.status];
    if (!nx) return;
    setBusy(o.id);
    await setSessionOrderStatus(o.id, nx.to);
    await load();
    setBusy(null);
  }
  async function doneReq(id: string) {
    setBusy(id);
    await resolveServiceRequest(id);
    await load();
    setBusy(null);
  }

  const active = orders.filter((o) => o.status !== "served");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Kitchen Display</h1>
          <p className="text-neutral-500 text-sm">Live orders update automatically.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-wine">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      {/* service alerts */}
      {reqs.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {reqs.map((r) => (
            <div key={r.id} className="flex items-center gap-2 bg-wine text-white rounded-full pl-4 pr-2 py-1.5 text-sm">
              <span className="text-gold">{REQ_ICON[r.type]}</span>
              <span className="font-medium">{tableOf2(r.table_id, tables)}</span>
              <span className="opacity-80 capitalize">· {r.type === "bill" ? "wants bill" : r.type}</span>
              <button onClick={() => doneReq(r.id)} disabled={busy === r.id} className="ml-1 grid place-items-center w-6 h-6 rounded-full bg-white/20 hover:bg-white/30">
                <Check size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* order cards */}
      {active.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center text-neutral-400">No active orders right now.</div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {active.map((o) => {
            const nx = NEXT[o.status];
            const mins = Math.floor((Date.now() - new Date(o.created_at).getTime()) / 60000);
            return (
              <div key={o.id} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-gold">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-serif text-2xl">{tableOf(o.session_id)}</span>
                  <span className="text-xs text-neutral-400">{mins} min ago</span>
                </div>
                <ul className="text-sm text-neutral-700 space-y-1 mb-3">
                  {(o.items as OrderLine[]).map((i, k) => (
                    <li key={k} className="flex justify-between">
                      <span><b>{i.qty}×</b> {i.title}</span>
                    </li>
                  ))}
                </ul>
                {o.notes && <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-2 py-1 mb-3">Note: {o.notes}</p>}
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase tracking-wide px-2 py-1 rounded-full ${
                    o.status === "ready" ? "bg-green-100 text-green-700" : "bg-cream2 text-neutral-600"}`}>
                    {o.status}
                  </span>
                  <span className="text-wine font-medium">{money(Number(o.amount))}</span>
                </div>
                {nx && (
                  <button
                    onClick={() => advance(o)}
                    disabled={busy === o.id}
                    className="mt-3 w-full bg-wine text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-60"
                  >
                    {nx.label}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function tableOf2(tableId: string, tables: TableRow[]) {
  return tables.find((t) => t.id === tableId)?.label ?? "—";
}
