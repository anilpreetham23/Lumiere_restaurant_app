import type { Metadata } from "next";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Our Story",
  description: "Two decades at the table - the story of Lumiere, Mayfair's home of international fine dining.",
};

const TIMELINE = [
  ["2002", "A Single Table", "Lumiere opens as an intimate 20-seat room in Mayfair, serving a menu that changes with whatever our chefs carry home from their travels."],
  ["2009", "The World Arrives", "We build a brigade of specialists from France, Italy and Japan. The seven-course tasting menu is born and quickly becomes London's hardest reservation."],
  ["2016", "Two Michelin Stars", "Awarded our second Michelin star for a menu that moves seamlessly across continents without ever losing its soul."],
  ["2024", "A Modern Classic", "Today Lumiere welcomes guests from every corner of the world to a single table where each great cuisine is given equal reverence."],
];

const CHEFS = [
  ["Alice Moreau", "Executive Chef", "/img/chefs/1.jpg"],
  ["Marco Bianchi", "Chef de Cuisine - Italy", "/img/chefs/2.jpg"],
  ["Kenji Tanaka", "Sushi Master - Japan", "/img/chefs/3.jpg"],
  ["Camille Laurent", "Head Patissier", "/img/chefs/4.jpg"],
];

export default function AboutPage() {
  return (
    <>
      <PageHero label="Our Story" title="Two Decades at the Table" sub="From an intimate Mayfair room to a two-star destination - every chapter written in the kitchen." />

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <div className="grid grid-cols-2 gap-4">
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg">
                <Image src="/img/about1.jpg" alt="Dining room" fill className="object-cover" sizes="25vw" />
              </div>
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden shadow-lg mt-8">
                <Image src="/img/about2.jpg" alt="Plating" fill className="object-cover" sizes="25vw" />
              </div>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <span className="section-label">One Kitchen, Every Great Cuisine</span>
            <h2 className="font-serif text-4xl mt-2">An Obsession with <span className="text-wine">Craft</span></h2>
            <div className="gold-line mt-4" />
            <p className="text-neutral-600 mt-5 leading-relaxed">
              Founded in 2002, Lumiere was born from a simple obsession - to gather the world&apos;s finest
              culinary traditions under one roof and serve them with the precision of haute cuisine. Two
              decades on, our chefs travel the globe so that every plate tells the story of where it came from.
            </p>
            <p className="text-neutral-600 mt-4 leading-relaxed">
              We source line-caught fish, single-estate produce and rare seasonal finds daily. A dedicated
              sommelier pairs each course from a cellar of over four hundred wines. Nothing here is rushed.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-20 bg-cream">
        <div className="mx-auto max-w-4xl px-5">
          <Reveal className="text-center mb-14">
            <span className="section-label">Our Journey</span>
            <h2 className="font-serif text-4xl mt-2">A History of the <span className="text-wine">Table</span></h2>
            <div className="gold-line mx-auto mt-4" />
          </Reveal>
          <div className="relative border-l-2 border-gold/40 ml-3 space-y-10">
            {TIMELINE.map(([year, title, body], i) => (
              <Reveal key={year} delay={i * 0.05}>
                <div className="relative pl-8">
                  <span className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-gold ring-4 ring-cream" />
                  <div className="font-serif text-2xl text-wine">{year}</div>
                  <h4 className="font-semibold text-ink mt-1">{title}</h4>
                  <p className="text-neutral-600 text-sm mt-1 leading-relaxed">{body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal className="text-center mb-12">
            <span className="section-label">The Culinary Team</span>
            <h2 className="font-serif text-4xl mt-2">Meet Our <span className="text-wine">Chefs</span></h2>
            <div className="gold-line mx-auto mt-4" />
          </Reveal>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {CHEFS.map(([name, role, img], i) => (
              <Reveal key={name} delay={i * 0.05}>
                <div className="group text-center">
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-lg mb-4">
                    <Image src={img} alt={name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="25vw" />
                  </div>
                  <h4 className="font-serif text-lg text-ink">{name}</h4>
                  <p className="text-sm text-gold">{role}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
