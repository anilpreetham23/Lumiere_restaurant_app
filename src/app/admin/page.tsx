import { CalendarCheck, MessageSquare, Mail, ShoppingBag } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import StatusSelect from "@/components/StatusSelect";
import { setReservationStatus, setOrderStatus } from "@/actions/admin";
import { money } from "@/data/menu";

export const dynamic = "force-dynamic";

type OrderItem = { title: string; qty: number };

function fmt(d: string) {
  return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminDashboard() {
  const supabase = await createClient();
  const [resv, msgs, subs, orders] = await Promise.all([
    supabase.from("reservations").select("*").order("created_at", { ascending: false }),
    supabase.from("messages").select("*").order("created_at", { ascending: false }),
    supabase.from("subscribers").select("*").order("created_at", { ascending: false }),
    supabase.from("orders").select("*").order("created_at", { ascending: false }),
  ]);

  const reservations = resv.data ?? [];
  const messages = msgs.data ?? [];
  const subscribers = subs.data ?? [];
  const orderList = orders.data ?? [];

  const stats = [
    [<CalendarCheck key="r" />, "Reservations", reservations.length],
    [<ShoppingBag key="o" />, "Orders", orderList.length],
    [<MessageSquare key="m" />, "Messages", messages.length],
    [<Mail key="s" />, "Subscribers", subscribers.length],
  ] as const;

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl">Dashboard</h1>
        <p className="text-neutral-500 text-sm">Live activity from the Lumiere website.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(([icon, label, n]) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-sm">
            <span className="grid place-items-center w-10 h-10 rounded-xl bg-wine/10 text-wine mb-3">{icon}</span>
            <div className="font-serif text-3xl text-ink">{n}</div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide">{label}</div>
          </div>
        ))}
      </div>

      <Panel title="Reservations">
        <Table head={["Date", "Name", "Guests", "When", "Contact", "Status"]}>
          {reservations.map((r) => (
            <tr key={r.id} className="border-t border-cream2">
              <Td>{fmt(r.created_at)}</Td>
              <Td className="font-medium text-ink">{r.name}</Td>
              <Td>{r.guests}</Td>
              <Td>{r.date} {r.time}</Td>
              <Td className="text-xs">{r.email}<br />{r.phone}</Td>
              <Td>
                <StatusSelect id={r.id} value={r.status} options={["pending", "confirmed", "cancelled"]} action={setReservationStatus} />
              </Td>
            </tr>
          ))}
          {reservations.length === 0 && <Empty cols={6} />}
        </Table>
      </Panel>

      <Panel title="Orders">
        <Table head={["Date", "Customer", "Items", "Total", "Status"]}>
          {orderList.map((o) => (
            <tr key={o.id} className="border-t border-cream2">
              <Td>{fmt(o.created_at)}</Td>
              <Td className="font-medium text-ink">{o.customer_name}<br /><span className="text-xs text-neutral-400">{o.phone}</span></Td>
              <Td className="text-xs">{(o.items as OrderItem[]).map((i) => `${i.qty}x ${i.title}`).join(", ")}</Td>
              <Td className="text-wine font-medium">{money(Number(o.total))}</Td>
              <Td>
                <StatusSelect id={o.id} value={o.status} options={["received", "preparing", "ready", "completed"]} action={setOrderStatus} />
              </Td>
            </tr>
          ))}
          {orderList.length === 0 && <Empty cols={5} />}
        </Table>
      </Panel>

      <Panel title="Messages">
        <Table head={["Date", "Name", "Subject", "Message"]}>
          {messages.map((m) => (
            <tr key={m.id} className="border-t border-cream2">
              <Td>{fmt(m.created_at)}</Td>
              <Td className="font-medium text-ink">{m.name}<br /><span className="text-xs text-neutral-400">{m.email}</span></Td>
              <Td>{m.subject}</Td>
              <Td className="text-xs max-w-md">{m.message}</Td>
            </tr>
          ))}
          {messages.length === 0 && <Empty cols={4} />}
        </Table>
      </Panel>

      <Panel title="Newsletter Subscribers">
        <Table head={["Date", "Email"]}>
          {subscribers.map((s) => (
            <tr key={s.id} className="border-t border-cream2">
              <Td>{fmt(s.created_at)}</Td>
              <Td className="text-ink">{s.email}</Td>
            </tr>
          ))}
          {subscribers.length === 0 && <Empty cols={2} />}
        </Table>
      </Panel>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl p-5 shadow-sm">
      <h2 className="font-serif text-xl mb-4">{title}</h2>
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}
function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm text-left text-neutral-600">
      <thead>
        <tr className="text-xs uppercase tracking-wide text-neutral-400">
          {head.map((h) => (
            <th key={h} className="pb-2 pr-4 font-medium">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`py-3 pr-4 align-top ${className}`}>{children}</td>;
}
function Empty({ cols }: { cols: number }) {
  return (
    <tr>
      <td colSpan={cols} className="py-8 text-center text-neutral-400">No records yet.</td>
    </tr>
  );
}
