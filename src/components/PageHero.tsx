export default function PageHero({
  label,
  title,
  sub,
}: {
  label: string;
  title: string;
  sub?: string;
}) {
  return (
    <section className="bg-ink text-white py-20 text-center">
      <div className="mx-auto max-w-3xl px-5">
        <span className="section-label">{label}</span>
        <h1 className="font-serif text-4xl sm:text-5xl mt-3 text-white">{title}</h1>
        <div className="gold-line mx-auto mt-4" />
        {sub && <p className="text-white/60 mt-5">{sub}</p>}
      </div>
    </section>
  );
}
