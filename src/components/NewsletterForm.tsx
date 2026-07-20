"use client";

import { useState } from "react";
import { Send, Check } from "lucide-react";
import { subscribeNewsletter } from "@/actions/public";

export default function NewsletterForm() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");

  async function action(fd: FormData) {
    setState("loading");
    const res = await subscribeNewsletter(fd);
    setState(res.ok ? "done" : "idle");
  }

  if (state === "done") {
    return (
      <p className="flex items-center gap-2 text-gold text-sm">
        <Check size={16} /> Welcome to the Lumiere Circle.
      </p>
    );
  }

  return (
    <form action={action} className="flex gap-2">
      <input
        name="email"
        type="email"
        required
        placeholder="Your email"
        className="flex-1 rounded-full px-4 py-2.5 text-sm bg-white/10 border border-white/15 text-white placeholder:text-white/40 focus:outline-none focus:border-gold"
      />
      <button
        disabled={state === "loading"}
        className="grid place-items-center w-11 h-11 rounded-full bg-gold text-ink disabled:opacity-60"
        aria-label="Subscribe"
      >
        <Send size={16} />
      </button>
    </form>
  );
}
