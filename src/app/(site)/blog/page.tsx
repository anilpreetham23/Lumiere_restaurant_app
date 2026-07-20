import type { Metadata } from "next";
import Image from "next/image";
import { User, ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import Reveal from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Journal",
  description: "Stories from the Lumiere kitchen - provenance, wine pairings and life behind the pass.",
};

const POSTS = [
  ["/img/blog/1.jpg", "Kitchen Stories", "Behind the Pass: A Day with Our Executive Chef", "A morning market run, a hundred tiny decisions, and the quiet ritual that shapes every service.", "Alice Moreau", "14 Mar"],
  ["/img/blog/2.jpg", "Cellar Notes", "The Art of the Pairing: Matching Wine to the World", "How our sommelier builds a thread of flavour across seven courses and five countries.", "The Sommelier", "28 Feb"],
  ["/img/blog/3.jpg", "Provenance", "In Search of White Truffles: A Journey Through Piedmont", "Chasing the season's rarest ingredient through the misty hills of northern Italy.", "Marco Bianchi", "05 Jan"],
];

export default function BlogPage() {
  return (
    <>
      <PageHero label="The Journal" title="Stories from the Kitchen" sub="Provenance, pairings and the people behind the plates." />
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-5 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {POSTS.map(([img, tag, title, excerpt, author, date], i) => (
            <Reveal key={title} delay={i * 0.06}>
              <article className="group rounded-2xl overflow-hidden bg-cream shadow-[0_8px_30px_rgba(0,0,0,0.05)] hover:shadow-lg transition">
                <div className="relative h-52 overflow-hidden">
                  <Image src={img} alt={title} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="33vw" />
                  <span className="absolute top-3 left-3 bg-wine text-white text-[0.65rem] px-3 py-1 rounded-full uppercase tracking-wide">{tag}</span>
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-xl leading-snug group-hover:text-wine transition">{title}</h3>
                  <p className="text-sm text-neutral-500 mt-2 leading-relaxed">{excerpt}</p>
                  <div className="flex items-center justify-between mt-4 text-xs text-neutral-400">
                    <span className="flex items-center gap-1"><User size={12} /> {author}</span>
                    <span>{date}</span>
                  </div>
                  <button className="mt-4 text-sm font-medium text-wine flex items-center gap-1">
                    Read More <ArrowRight size={14} />
                  </button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  );
}
