const PATHS: Record<string, string> = {
  instagram:
    "M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7zm5 3.5A4.5 4.5 0 1 1 7.5 12 4.5 4.5 0 0 1 12 7.5zm0 2A2.5 2.5 0 1 0 14.5 12 2.5 2.5 0 0 0 12 9.5zM17.5 6a1 1 0 1 1-1 1 1 1 0 0 1 1-1z",
  facebook:
    "M13 22v-8h2.7l.4-3H13V9.1c0-.9.3-1.5 1.6-1.5H16V4.9c-.3 0-1.2-.1-2.2-.1-2.2 0-3.8 1.3-3.8 3.9V11H7.5v3H10v8h3z",
  x: "M18.2 2H21l-6.4 7.3L22 22h-6l-4.7-6.2L5.8 22H3l6.9-7.9L2 2h6.2l4.3 5.7L18.2 2zm-2.1 18h1.7L7.9 3.8H6.1L16.1 20z",
  youtube:
    "M23 12s0-3.1-.4-4.6a2.5 2.5 0 0 0-1.8-1.8C19.3 5.2 12 5.2 12 5.2s-7.3 0-8.8.4A2.5 2.5 0 0 0 1.4 7.4C1 8.9 1 12 1 12s0 3.1.4 4.6a2.5 2.5 0 0 0 1.8 1.8c1.5.4 8.8.4 8.8.4s7.3 0 8.8-.4a2.5 2.5 0 0 0 1.8-1.8C23 15.1 23 12 23 12zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z",
};

export default function Socials({ className = "" }: { className?: string }) {
  return (
    <div className={`flex gap-3 ${className}`}>
      {(["instagram", "facebook", "x", "youtube"] as const).map((k) => (
        <a
          key={k}
          href="#"
          aria-label={k}
          className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-gold hover:text-ink transition text-white/80"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d={PATHS[k]} />
          </svg>
        </a>
      ))}
    </div>
  );
}
