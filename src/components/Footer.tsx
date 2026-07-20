import Link from "next/link";
import { MapPin, Phone, Mail, Clock } from "lucide-react";
import NewsletterForm from "./NewsletterForm";
import Socials from "./Socials";

export default function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="mx-auto max-w-6xl px-5 py-16 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-1">
          <div className="font-serif text-2xl text-white mb-3">
            Lumi<span className="text-gold">ere</span>
          </div>
          <p className="text-sm leading-relaxed">
            The world&apos;s finest culinary traditions under one roof in the heart of Mayfair. Every
            plate crafted with reverence, served with grace.
          </p>
          <Socials className="mt-5" />
        </div>

        <div>
          <h5 className="text-white text-sm font-semibold mb-4 tracking-wide">Explore</h5>
          <ul className="space-y-2 text-sm">
            {[
              ["/menu", "Menu"],
              ["/about", "Our Story"],
              ["/reservations", "Reservations"],
              ["/order", "Order Online"],
              ["/blog", "Journal"],
              ["/contact", "Contact"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="hover:text-gold transition">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h5 className="text-white text-sm font-semibold mb-4 tracking-wide">Visit</h5>
          <ul className="space-y-3 text-sm">
            <li className="flex gap-2">
              <MapPin size={15} className="text-gold mt-0.5 shrink-0" /> 24 Belgrave Square, Mayfair, London W1J 5AA
            </li>
            <li className="flex gap-2">
              <Phone size={15} className="text-gold shrink-0" /> +44 (0)20 7946 0000
            </li>
            <li className="flex gap-2">
              <Mail size={15} className="text-gold shrink-0" /> reservations@lumiere-dining.com
            </li>
            <li className="flex gap-2">
              <Clock size={15} className="text-gold shrink-0" /> Wed-Sun 12pm-11pm
            </li>
          </ul>
        </div>

        <div>
          <h5 className="text-white text-sm font-semibold mb-4 tracking-wide">The Lumiere Circle</h5>
          <p className="text-sm mb-3">First to hear of new seasonal menus, chef&apos;s tables and private events.</p>
          <NewsletterForm />
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-6xl px-5 py-5 flex flex-col sm:flex-row justify-between gap-2 text-xs text-white/50">
          <p>Copyright {new Date().getFullYear()} Lumiere Fine Dining. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/legal/privacy" className="hover:text-gold">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-gold">Terms</Link>
            <Link href="/legal/refunds" className="hover:text-gold">Refunds</Link>
            <Link href="/admin" className="hover:text-gold">Staff</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
