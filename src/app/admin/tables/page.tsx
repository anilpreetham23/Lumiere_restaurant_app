import QRCode from "qrcode";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type TableRow = { id: string; label: string; token: string; seats: number; state: string };

const STATE_STYLE: Record<string, string> = {
  free: "bg-green-100 text-green-700",
  occupied: "bg-wine/10 text-wine",
  reserved: "bg-amber-100 text-amber-700",
  bill_pending: "bg-blue-100 text-blue-700",
};

export default async function TablesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("restaurant_tables")
    .select("id,label,token,seats,state")
    .order("created_at");
  const tables = (data ?? []) as TableRow[];

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const withQr = await Promise.all(
    tables.map(async (t) => ({
      ...t,
      url: `${site}/t/${t.token}`,
      qr: await QRCode.toDataURL(`${site}/t/${t.token}`, {
        margin: 1,
        width: 240,
        color: { dark: "#16130f", light: "#ffffff" },
      }),
    }))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-serif text-3xl">Tables & QR codes</h1>
          <p className="text-neutral-500 text-sm">
            Print each code and place it on its table. Guests scan to order. Press
            Ctrl/Cmd + P to print this page.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {withQr.map((t) => (
          <div key={t.id} className="bg-white rounded-2xl p-4 shadow-sm text-center break-inside-avoid">
            <div className="flex items-center justify-between mb-2">
              <span className="font-serif text-2xl">{t.label}</span>
              <span className={`text-[10px] uppercase tracking-wide px-2 py-1 rounded-full ${STATE_STYLE[t.state] ?? "bg-neutral-100 text-neutral-500"}`}>
                {t.state.replace("_", " ")}
              </span>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t.qr} alt={`QR for ${t.label}`} className="w-full rounded-xl" />
            <div className="text-xs text-neutral-400 mt-2">{t.seats} seats</div>
            <Link
              href={`/t/${t.token}`}
              target="_blank"
              className="mt-2 inline-block text-xs text-wine underline print:hidden"
            >
              Open ordering page →
            </Link>
          </div>
        ))}
        {withQr.length === 0 && (
          <p className="col-span-full text-center text-neutral-400 py-10">
            No tables found. Run the schema seed, or add rows to restaurant_tables.
          </p>
        )}
      </div>
    </div>
  );
}
