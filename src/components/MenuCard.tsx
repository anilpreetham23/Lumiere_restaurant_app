"use client";

import Image from "next/image";
import { Plus, Star } from "lucide-react";
import { motion } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { money, type Dish } from "@/data/menu";

export default function MenuCard({ dish }: { dish: Dish }) {
  const { add } = useCart();
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.4 }}
      className="group bg-white rounded-2xl overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.12)] transition-shadow"
    >
      <div className="relative h-52 overflow-hidden">
        <Image
          src={dish.image}
          alt={dish.title}
          fill
          sizes="(max-width:768px) 100vw, 33vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {dish.badge && (
          <span className="absolute top-3 left-3 bg-wine text-white text-[0.65rem] font-semibold px-3 py-1 rounded-full uppercase tracking-wide">
            {dish.badge}
          </span>
        )}
        <span className="absolute top-3 right-3 bg-white/90 text-ink text-xs px-2 py-1 rounded-full flex items-center gap-1">
          <Star size={11} className="text-gold fill-gold" /> {dish.rating}
        </span>
      </div>
      <div className="p-5">
        <span className="text-[0.7rem] uppercase tracking-widest text-gold font-semibold">
          {dish.cuisine}
        </span>
        <h3 className="font-serif text-xl text-ink mt-1">{dish.title}</h3>
        <p className="text-sm text-neutral-500 mt-2 leading-relaxed min-h-[2.5rem]">{dish.short}</p>
        <div className="flex items-center justify-between mt-4">
          <span className="font-serif text-2xl text-wine">{money(dish.price)}</span>
          <button
            onClick={() =>
              add({ id: dish.id, title: dish.title, price: dish.price, image: dish.image })
            }
            className="grid place-items-center w-10 h-10 rounded-full bg-gradient-to-br from-gold to-[#b3873a] text-ink hover:scale-110 transition-transform"
            aria-label={`Add ${dish.title} to order`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
