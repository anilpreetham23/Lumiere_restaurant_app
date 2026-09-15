import { Clock, Phone, Users, MapPin, CheckCircle2 } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ReservationForm from "@/components/ReservationForm";
import { createClient } from "@/lib/supabase/server";
import { confirmReservationDeposit } from "@/actions/pay";
import type { MenuItem } from "@/lib/order";

export const dynamic = "force-dynamic";

const INFO: [React.ReactNode, string, string][] = [
  [<Clock size={18} key="c" />, "Opening Hours", "Wed - Sun, 12pm - 11pm"],
  [<Phone size={18} key="p" />, "Call for Booking", "+44 (0)20 7946 0000"],
  [<Users size={18} key="u" />, "Private Dining", "Bespoke menus for parties of 10+"],
  [<MapPin size={18} key="m" />, "Location", "24 Belgrave Square, Mayfair"],
];

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ dep?: string; rid?: string; intent_id?: string; cs?: string }>;
}) {
  const { dep, rid, intent_id, cs } = await searchParams;
  let depositPaid = false;
  let verificationPending = false;
  if (dep === "1" && rid && (cs || intent_id)) {
    const res = await confirmReservationDeposit(rid, cs ?? "", intent_id);
    if (res.ok) {
      depositPaid = true;
    } else {
      verificationPending = true;
    }
  }

  const supabase = await createClient();
  const { data: menu } = await supabase.from("menu_items").select("*").eq("available", true).order("sort");

  return (
    <>
      <PageHero label="Book a Table" title="Make a Reservation" sub="Reserve your place at the table. For weekend evenings we recommend booking 24 hours in advance." />
      <section className="py-16 bg-cream">
        {depositPaid && (
          <div className="mx-auto max-w-6xl px-5 mb-8">
            <div className="flex items-center gap-3 bg-green-50 border border-green-300 text-green-800 rounded-2xl p-4 text-sm font-medium">
              <CheckCircle2 size={22} className="shrink-0" /> Deposit received — your table reservation is confirmed. A confirmation email is on its way.
            </div>
          </div>
        )}
        {verificationPending && !depositPaid && (
          <div className="mx-auto max-w-6xl px-5 mb-8">
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 text-amber-800 rounded-2xl p-4 text-sm font-medium">
              <Clock size={22} className="shrink-0 animate-pulse" /> Deposit payment submitted — awaiting bank webhook verification to confirm table reservation.
            </div>
          </div>
        )}
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-3 gap-8">
          <Reveal>
            <div className="bg-ink text-white rounded-2xl p-8 h-full">
              <h3 className="font-serif text-2xl mb-2">Contact Info</h3>
              <p className="text-white/50 text-sm mb-8">We are happy to help you plan the perfect evening.</p>
              <div className="space-y-6">
                {INFO.map(([icon, t, d]) => (
                  <div key={t} className="flex gap-3">
                    <span className="grid place-items-center w-11 h-11 rounded-xl bg-wine/30 text-gold shrink-0">{icon}</span>
                    <div>
                      <div className="text-[0.68rem] uppercase tracking-widest text-white/50">{t}</div>
                      <div className="text-sm">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <div className="lg:col-span-2">
            <Reveal delay={0.1}>
              <ReservationForm menu={(menu ?? []) as MenuItem[]} />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
