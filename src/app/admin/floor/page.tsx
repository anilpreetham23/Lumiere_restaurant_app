"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { money } from "@/data/menu";
import { setTableState, settleSession } from "@/actions/admin";

type TableRow = { id: string; label: string; seats: number; state: string; current_session_id: string | null };
type SessionRow = { id: string; table_id: string; status: string };
type OrderRow = { session_id: string; amount: number };

const STYLE: Record<string, string> = {
  free: "bg-green-50 border-green-300 text-green-800",
  occupied: "bg-wine/10 border-wine/40 text-wine",
  reserved: "bg-amber-50 border-amber-300 text-amber-800",
  bill_pending: "bg-blue-50 border-blue-300 text-blue-800",
};

export default function FloorPage() {
  const supabase = useMemo(() => createClient(), []);
  const [tables, setTables] = useState<TableRow[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [t, s, o] = await Promise.all([
      supabase.from("restaurant_tables").select("id,label,seats,state,current_session_id").order("created_at"),
      supabase.from("dining_sessions").select("id,table_id,status").in("status", ["open", "bill_pending"]),
      supabase.from("session_orders").select("session_id,amount").neq("status", "served"),
    ]);
    setTables((t.data ?? []) as TableRow[]);
    setSessions((s.data ?? []) as SessionRow[]);
    setOrders((o.data ?? []) as OrderRow[]);
  }, [supabase]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("floor")
      .on("postgres_changes", { event: "*", schema: "public", table: "restaurant_tables" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "dining_sessions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "session_orders" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [supabase, load]);

  const sessionOf = (tableId: string) => sessions.find((s) => s.table_id === tableId);
  const totalOf = (sessionId?: string) =>
    sessionId ? orders.filter((o) => o.session_id === sessionId).reduce((s, o) => s + Number(o.amount), 0) : 0;

  async function act(fn: () => Promise<unknown>, key: string) {
    setBusy(key); await fn(); await load(); setBusy(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl">Floor Map</h1>
          <p className="text-neutral-500 text-sm">Live table status. Updates automatically.</p>
        </div>
        <button onClick={load} className="flex items-center gap-2 text-sm text-neutral-600 hover:text-wine">
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {["free", "reserved", "occupied", "bill_pending"].map((k) => (
          <span key={k} className={`px-3 py-1 rounded-full border ${STYLE[k]}`}>{k.replace("_", " ")}</span>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {tables.map((t) => {
          const sess = sessionOf(t.id);
          const total = totalOf(sess?.id);
          const state = sess ? sess.status : t.state; // live session overrides
          return (
            <div key={t.id} className={`rounded-2xl border p-4 ${STYLE[state] ?? STYLE.free}`}>
              <div className="flex items-center justify-between">
                <span className="font-serif text-2xl">{t.label}</span>
                <span className="text-[10px] uppercase tracking-wide">{state.replace("_", " ")}</span>
              </div>
              <div className="text-xs opacity-70 mt-1">{t.seats} seats</div>
              {sess && <div className="font-medium mt-2">{money(total)}</div>}

              <div className="mt-3 flex flex-wrap gap-2">
                {sess ? (
                  <button
                    onClick={() => act(() => settleSession(sess.id, "cash"), t.id)}
                    disabled={busy === t.id}
                    className="text-xs px-3 py-1.5 rounded-full bg-wine text-white disabled:opacity-60"
                  >
                    Settle (cash) & free
                  </button>
                ) : t.state === "reserved" ? (
                  <button
                    onClick={() => act(() => setTableState(t.id, "free"), t.id)}
                    disabled={busy === t.id}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/70 border"
                  >
                    Mark free
                  </button>
                ) : (
                  <button
                    onClick={() => act(() => setTableState(t.id, "reserved"), t.id)}
                    disabled={busy === t.id}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/70 border"
                  >
                    Mark reserved
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
