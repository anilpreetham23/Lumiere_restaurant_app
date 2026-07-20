"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { X, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { money } from "@/data/menu";

export default function CartDrawer() {
  const { items, open, setOpen, setQty, remove, total, count } = useCart();

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 bg-black/50 z-[90]"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
            className="fixed top-0 right-0 h-full w-[92vw] max-w-md bg-cream z-[100] flex flex-col shadow-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-cream2">
              <h3 className="font-serif text-xl flex items-center gap-2">
                <ShoppingBag size={18} className="text-gold" /> Your Order ({count})
              </h3>
              <button onClick={() => setOpen(false)} aria-label="Close cart">
                <X />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex-1 grid place-items-center text-center px-8 text-neutral-500">
                <div>
                  <ShoppingBag size={40} className="mx-auto mb-3 text-gold/60" />
                  <p>Your order is empty.</p>
                  <Link href="/menu" onClick={() => setOpen(false)} className="btn-outline mt-4 text-sm">
                    Browse the Menu
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                  {items.map((i) => (
                    <div key={i.id} className="flex gap-3 bg-white rounded-xl p-3">
                      <Image
                        src={i.image}
                        alt={i.title}
                        width={64}
                        height={64}
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-sm text-ink">{i.title}</p>
                        <p className="text-wine font-serif">{money(i.price)}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            onClick={() => setQty(i.id, i.qty - 1)}
                            className="w-6 h-6 grid place-items-center rounded-full bg-cream2"
                          >
                            <Minus size={12} />
                          </button>
                          <span className="text-sm w-5 text-center">{i.qty}</span>
                          <button
                            onClick={() => setQty(i.id, i.qty + 1)}
                            className="w-6 h-6 grid place-items-center rounded-full bg-cream2"
                          >
                            <Plus size={12} />
                          </button>
                          <button
                            onClick={() => remove(i.id)}
                            className="ml-auto text-neutral-400 hover:text-wine"
                            aria-label="Remove"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-5 border-t border-cream2 bg-white">
                  <div className="flex justify-between mb-4">
                    <span className="text-neutral-500">Subtotal</span>
                    <span className="font-serif text-2xl text-wine">{money(total)}</span>
                  </div>
                  <Link
                    href="/order"
                    onClick={() => setOpen(false)}
                    className="btn-wine w-full justify-center"
                  >
                    Proceed to Checkout
                  </Link>
                </div>
              </>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
