"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X, ShoppingBag, Phone } from "lucide-react";
import { useCart } from "@/context/CartContext";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/menu", label: "Menu" },
  { href: "/about", label: "About" },
  { href: "/order", label: "Order" },
  { href: "/blog", label: "Journal" },
  { href: "/contact", label: "Contact" },
];

export default function Navbar() {
  const pathname = usePathname();
  const { count, setOpen } = useCart();
  const [scrolled, setScrolled] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => setMobile(false), [pathname]);

  return (
    <>
      <div className="hidden md:block bg-ink text-white/70 text-xs">
        <div className="mx-auto max-w-6xl px-5 py-2 flex justify-between items-center">
          <span className="flex items-center gap-2">
            <Phone size={12} className="text-gold" /> +44 (0)20 7946 0000 &middot; 24 Belgrave Square, Mayfair
          </span>
          <span className="text-gold tracking-widest uppercase text-[0.65rem]">
            Now accepting reservations
          </span>
        </div>
      </div>

      <nav
        className={`sticky top-0 z-50 bg-white transition-shadow ${
          scrolled ? "shadow-[0_4px_30px_rgba(0,0,0,0.10)]" : "shadow-[0_2px_20px_rgba(0,0,0,0.05)]"
        }`}
      >
        <div className="mx-auto max-w-6xl px-5 flex items-center justify-between h-[68px]">
          <Link href="/" className="flex items-center gap-3">
            <span className="grid place-items-center w-11 h-11 rounded-full bg-gradient-to-br from-gold to-[#b3873a] text-ink font-serif text-xl">
              L
            </span>
            <span className="leading-tight">
              <span className="block font-serif text-xl tracking-wide text-ink">
                Lumi<span className="text-gold">ere</span>
              </span>
              <span className="block text-[0.6rem] tracking-[0.25em] uppercase text-neutral-400">
                Fine Dining
              </span>
            </span>
          </Link>

          <ul className="hidden lg:flex items-center gap-7">
            {LINKS.map((l) => {
              const active = pathname === l.href;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className={`text-sm font-medium transition-colors ${
                      active ? "text-wine" : "text-neutral-600 hover:text-wine"
                    }`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setOpen(true)}
              className="relative grid place-items-center w-10 h-10 rounded-full hover:bg-cream2 transition"
              aria-label="Open cart"
            >
              <ShoppingBag size={18} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-wine text-white text-[0.6rem] w-5 h-5 grid place-items-center rounded-full">
                  {count}
                </span>
              )}
            </button>
            <Link href="/reservations" className="hidden sm:inline-flex btn-gold text-sm py-2.5 px-5">
              Reserve a Table
            </Link>
            <button
              className="lg:hidden grid place-items-center w-10 h-10"
              onClick={() => setMobile((v) => !v)}
              aria-label="Menu"
            >
              {mobile ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {mobile && (
          <ul className="lg:hidden border-t border-cream2 bg-white px-5 py-3">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className={`block py-2.5 text-sm font-medium ${
                    pathname === l.href ? "text-wine" : "text-neutral-700"
                  }`}
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="pt-2">
              <Link href="/reservations" className="btn-gold w-full justify-center text-sm">
                Reserve a Table
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </>
  );
}
