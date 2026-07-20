import type { Metadata } from "next";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";
import ContactForm from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with Lumiere - reservations, private events, press and feedback.",
};

const INFO: [React.ReactNode, string, string][] = [
  [<MapPin size={18} key="a" />, "Address", "24 Belgrave Square, Mayfair, London W1J 5AA"],
  [<Phone size={18} key="p" />, "Phone", "+44 (0)20 7946 0000"],
  [<Mail size={18} key="e" />, "Email", "reservations@lumiere-dining.com"],
  [<Clock size={18} key="c" />, "Hours", "Wed - Sun, 12pm - 11pm"],
];

export default function ContactPage() {
  return (
    <>
      <PageHero label="Get in Touch" title="Contact Us" sub="A question, a special event, or simply to say hello - we would love to hear from you." />
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-3 gap-8">
          <Reveal>
            <div className="bg-cream rounded-2xl p-8 h-full">
              <h3 className="font-serif text-2xl mb-6">Let&apos;s Talk</h3>
              <div className="space-y-5">
                {INFO.map(([icon, t, d]) => (
                  <div key={t} className="flex gap-3">
                    <span className="grid place-items-center w-11 h-11 rounded-xl bg-wine/10 text-wine shrink-0">{icon}</span>
                    <div>
                      <div className="text-[0.68rem] uppercase tracking-widest text-neutral-400">{t}</div>
                      <div className="text-sm text-ink">{d}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <div className="lg:col-span-2">
            <Reveal delay={0.1}>
              <ContactForm />
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
