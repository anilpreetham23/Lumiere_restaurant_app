import Link from "next/link";
import Image from "next/image";
import { Star, UtensilsCrossed, Wine, GlassWater, Award } from "lucide-react";
import Marquee from "@/components/Marquee";
import Reveal from "@/components/Reveal";
import MenuCard from "@/components/MenuCard";
import { type Dish } from "@/data/menu";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CUISINE_TILES = [
  { name: "France", img: "/img/category/2.jpg" },
  { name: "Italy", img: "/img/category/3.jpg" },
  { name: "Japan", img: "/img/category/4.jpg" },
  { name: "India", img: "/img/category/5.jpg" },
  { name: "Spain", img: "/img/category/1.jpg" },
  { name: "Patisserie", img: "/img/category/6.jpg" },
];

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase.from("menu_items").select("*").not("badge", "is", null).order("sort").limit(6);
  const featured = (data ?? []).map((d) => ({ ...d, price: Number(d.price) })) as Dish[];

  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-cream">
        <div className="pointer-events-none absolute -top-10 right-0 font-serif text-[22vw] leading-none text-gold/[0.06] select-none">
          LUMIERE
        </div>
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-10 items-center min-h-[86vh] py-16">
          <Reveal>
            <span className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-1.5 text-xs shadow-sm">
              <Star size={13} className="text-gold fill-gold" /> Michelin-Starred - Mayfair, London
            </span>
            <h1 className="font-serif text-5xl sm:text-6xl leading-[1.05] mt-5 text-ink">
              A World of <span className="text-wine italic">Fine Flavour</span> on a Single Table
            </h1>
            <p className="text-neutral-600 mt-5 max-w-lg leading-relaxed">
              A curated journey through the world&apos;s great cuisines - French, Italian, Japanese,
              Indian and beyond - reimagined by our master chefs and served with quiet elegance.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <Link href="/menu" className="btn-wine">
                <UtensilsCrossed size={18} /> Explore the Menu
              </Link>
              <Link href="/reservations" className="btn-outline">
                Reserve a Table
              </Link>
            </div>
            <div className="flex flex-wrap gap-8 mt-10">
              {[
                ["40+", "World Cuisines"],
                ["2", "Michelin Stars"],
                ["12+", "Master Chefs"],
                ["24yr", "Of Heritage"],
              ].map(([n, l]) => (
                <div key={l}>
                  <div className="font-serif text-3xl text-wine">{n}</div>
                  <div className="text-xs text-neutral-500 uppercase tracking-wide">{l}</div>
                </div>
              ))}
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="relative">
              <div className="relative aspect-square rounded-full overflow-hidden border-8 border-white shadow-2xl">
                <Image src="/img/banner-img.jpg" alt="Signature plating at Lumiere" fill className="object-cover" priority sizes="50vw" />
              </div>
              <FloatCard className="top-6 -left-2" icon={<Wine size={16} />} title="400+ Wines" sub="Curated cellar" />
              <FloatCard className="bottom-24 -right-2" icon={<Star size={16} />} title="4.9/5" sub="2k+ reviews" />
              <FloatCard className="-bottom-2 left-10" icon={<GlassWater size={16} />} title="7 Courses" sub="Tasting menu" />
            </div>
          </Reveal>
        </div>
      </section>

      <Marquee />

      {/* CUISINES */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center mb-12">
            <span className="section-label">Cuisines of the World</span>
            <h2 className="font-serif text-4xl mt-2">Explore by <span className="text-wine">Origin</span></h2>
            <div className="gold-line mx-auto mt-4" />
          </Reveal>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {CUISINE_TILES.map((c, i) => (
              <Reveal key={c.name} delay={i * 0.05}>
                <Link href={`/menu?c=${c.name}`} className="group block relative rounded-2xl overflow-hidden aspect-[3/4]">
                  <Image src={c.img} alt={c.name} fill sizes="16vw" className="object-cover group-hover:scale-110 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/80 to-transparent" />
                  <span className="absolute bottom-3 left-0 right-0 text-center text-white font-serif text-lg">{c.name}</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT TEASER */}
      <section className="py-20 bg-cream">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="relative">
              <div className="rounded-2xl overflow-hidden shadow-xl aspect-[4/3] relative">
                <Image src="/img/about1.jpg" alt="The dining room" fill className="object-cover" sizes="50vw" />
              </div>
              <div className="absolute -bottom-6 -right-4 bg-wine text-white rounded-2xl px-6 py-4 text-center shadow-lg">
                <div className="font-serif text-3xl">24+</div>
                <div className="text-[0.65rem] uppercase tracking-wide">Years of Excellence</div>
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <span className="section-label">Our Story</span>
            <h2 className="font-serif text-4xl mt-2">One Kitchen,<br /> Every <span className="text-wine">Great Cuisine</span></h2>
            <div className="gold-line mt-4" />
            <p className="text-neutral-600 mt-5 leading-relaxed">
              Founded in 2002, Lumiere was born from a simple obsession - to gather the world&apos;s finest
              culinary traditions under one roof and serve them with the precision of haute cuisine.
            </p>
            <div className="space-y-4 mt-6">
              {[
                [<Award size={18} key="a" />, "Two Michelin Stars", "Recognised five years running for our tasting menu."],
                [<UtensilsCrossed size={18} key="b" />, "Ingredients Without Compromise", "Sourced daily from trusted growers across four continents."],
                [<Wine size={18} key="c" />, "The Art of Hospitality", "A dedicated sommelier and unhurried, gracious service."],
              ].map(([icon, t, d]) => (
                <div key={t as string} className="flex gap-3">
                  <span className="grid place-items-center w-10 h-10 rounded-full bg-wine/10 text-wine shrink-0">{icon}</span>
                  <div>
                    <h4 className="font-semibold text-ink">{t as string}</h4>
                    <p className="text-sm text-neutral-500">{d as string}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/about" className="btn-outline mt-7">Discover Our Story</Link>
          </Reveal>
        </div>
      </section>

      {/* FEATURED MENU */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center mb-12">
            <span className="section-label">The Menu</span>
            <h2 className="font-serif text-4xl mt-2">Signature <span className="text-wine">Plates</span></h2>
            <div className="gold-line mx-auto mt-4" />
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((d) => (
              <MenuCard key={d.id} dish={d} />
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/menu" className="btn-wine">View the Full Carte</Link>
          </div>
        </div>
      </section>

      {/* TASTING MENU CTA */}
      <section className="relative py-24 bg-ink text-white overflow-hidden">
        <Image src="/img/off-img.jpg" alt="" fill className="object-cover opacity-20" sizes="100vw" />
        <div className="relative mx-auto max-w-3xl px-5 text-center">
          <Reveal>
            <span className="section-label">This Season Only</span>
            <h2 className="font-serif text-4xl sm:text-5xl mt-3 text-white">
              The Seven-Course <span className="text-gold">Grand Tasting</span>
            </h2>
            <p className="text-white/70 mt-5 max-w-xl mx-auto">
              Seven plates, five countries - our chefs&apos; most personal journey through the great
              tables of the world, paired course by course with wines from our cellar.
            </p>
            <div className="flex items-center justify-center gap-4 mt-6">
              <span className="line-through text-white/40 text-xl">&pound;185</span>
              <span className="font-serif text-4xl text-gold">&pound;145</span>
              <span className="text-white/50 text-sm">per guest</span>
            </div>
            <Link href="/reservations" className="btn-gold mt-8">Reserve the Experience</Link>
          </Reveal>
        </div>
      </section>
    </>
  );
}

function FloatCard({ className, icon, title, sub }: { className: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className={`absolute ${className} bg-white rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-2.5`}>
      <span className="grid place-items-center w-9 h-9 rounded-full bg-gold/20 text-wine">{icon}</span>
      <span>
        <span className="block font-semibold text-sm text-ink">{title}</span>
        <span className="block text-[0.7rem] text-neutral-400">{sub}</span>
      </span>
    </div>
  );
}
