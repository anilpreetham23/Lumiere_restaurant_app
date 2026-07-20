import type { Metadata } from "next";
import Reveal from "@/components/Reveal";
import MenuBrowser from "@/components/MenuBrowser";
import PageHero from "@/components/PageHero";
import { createClient } from "@/lib/supabase/server";
import { type Dish } from "@/data/menu";

export const metadata: Metadata = {
  title: "Menu",
  description: "The full Lumiere carte - signature plates from France, Italy, Japan, India, Spain and our patisserie.",
};

export const dynamic = "force-dynamic";

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from("menu_items").select("*").order("sort");
  const dishes = (data ?? []).map((d) => ({ ...d, price: Number(d.price) })) as Dish[];
  return (
    <>
      <PageHero
        label="The Carte"
        title="Our Signature Plates"
        sub="Each dish is a passport stamp - rooted in tradition, finished with the precision of haute cuisine."
      />
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <MenuBrowser initial={c ?? "All"} dishes={dishes} />
          </Reveal>
        </div>
      </section>
    </>
  );
}
