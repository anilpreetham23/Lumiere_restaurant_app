"use client";

import { useState } from "react";
import { Send, CheckCircle2, Loader2 } from "lucide-react";
import { submitContact } from "@/actions/public";

export default function ContactForm() {
  const [state, setState] = useState<"idle" | "loading" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function action(fd: FormData) {
    setState("loading");
    setError(null);
    const res = await submitContact(fd);
    if (res.ok) setState("done");
    else {
      setError(res.error ?? "Something went wrong.");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="bg-white rounded-2xl p-10 text-center shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <CheckCircle2 size={48} className="text-gold mx-auto mb-4" />
        <h3 className="font-serif text-2xl mb-2">Message Sent</h3>
        <p className="text-neutral-500">We typically reply within a few hours during opening times.</p>
      </div>
    );
  }

  return (
    <form action={action} className="bg-white rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgba(0,0,0,0.06)] grid sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Your Name *</label>
        <input name="name" required className="field" placeholder="Jane Doe" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Email *</label>
        <input name="email" type="email" required className="field" placeholder="you@email.com" />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Phone</label>
        <input name="phone" className="field" placeholder="+44 ..." />
      </div>
      <div>
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Subject *</label>
        <select name="subject" className="field" defaultValue="General Inquiry">
          <option>General Inquiry</option>
          <option>Private Dining &amp; Events</option>
          <option>Feedback</option>
          <option>Press &amp; Media</option>
          <option>Careers</option>
        </select>
      </div>
      <div className="sm:col-span-2">
        <label className="block text-xs font-medium mb-1.5 text-neutral-600">Message *</label>
        <textarea name="message" rows={5} required className="field" placeholder="How can we help?" />
      </div>
      {error && <p className="sm:col-span-2 text-sm text-wine">{error}</p>}
      <div className="sm:col-span-2">
        <button disabled={state === "loading"} className="btn-wine w-full justify-center disabled:opacity-70">
          {state === "loading" ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          Send Message
        </button>
      </div>
    </form>
  );
}
