"use client";

import { useTransition } from "react";

export default function StatusSelect({
  id,
  value,
  options,
  action,
}: {
  id: string;
  value: string;
  options: string[];
  action: (id: string, status: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const [pending, start] = useTransition();
  return (
    <select
      disabled={pending}
      defaultValue={value}
      onChange={(e) => start(() => action(id, e.target.value).then(() => {}))}
      className="text-xs rounded-full border border-cream2 px-2 py-1 bg-white disabled:opacity-50"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  );
}
