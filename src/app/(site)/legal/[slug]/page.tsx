import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";

type Doc = { title: string; label: string; updated: string; body: [string, string[]][] };

const DOCS: Record<string, Doc> = {
  terms: {
    label: "Legal",
    title: "Terms of Service",
    updated: "20 July 2026",
    body: [
      ["1. About us", [
        "Lumière (\"we\", \"us\") operates the restaurant at 24 Belgrave Square, Mayfair, and this website and ordering service. By placing an order, booking a table, or using this site you agree to these terms.",
      ]],
      ["2. Orders & table service", [
        "Scanning a table QR code opens an ordering session for that table. Prices are shown in Indian Rupees (₹) and are inclusive of applicable taxes unless stated otherwise.",
        "All orders are prepared to order. Estimated preparation times are indicative, not guaranteed. Items may become unavailable; we will notify you and not charge for unavailable items.",
      ]],
      ["3. Reservations & deposits", [
        "A reservation is confirmed only once any requested deposit is paid. The deposit is applied to your final bill on arrival.",
        "If you cancel within the permitted window (see the Refund & Cancellation policy) the deposit is refunded. For no-shows or late arrival beyond the grace period, the deposit may be forfeited.",
      ]],
      ["4. Payment", [
        "Payment may be made online through our payment provider or in cash at the counter. Online payments are processed by a third-party gateway; we do not store your card details.",
      ]],
      ["5. Conduct & liability", [
        "Please inform staff of any allergies before ordering. While we take care, we cannot guarantee dishes are free from trace allergens.",
        "To the extent permitted by law, our liability is limited to the value of the affected order.",
      ]],
      ["6. Changes", [
        "We may update these terms from time to time. The current version is always available on this page.",
      ]],
    ],
  },
  privacy: {
    label: "Legal",
    title: "Privacy Policy",
    updated: "20 July 2026",
    body: [
      ["1. What we collect", [
        "When you order or book, we collect the details you provide: name, phone number, email, party size, your order/reservation, and any special requests. Online payments are handled by our payment provider, which processes your card data directly.",
      ]],
      ["2. How we use it", [
        "To take and prepare your order, manage your reservation, process payment, issue receipts, and contact you about your booking. We may send service messages related to your order.",
      ]],
      ["3. Sharing", [
        "We share data only with providers that run this service (hosting, database, payment gateway) and where required by law. We do not sell your personal data.",
      ]],
      ["4. Retention & your rights", [
        "We keep order and reservation records for as long as needed for operations, accounting and legal requirements. You may request access to, correction of, or deletion of your data by contacting us.",
      ]],
      ["5. Cookies", [
        "We use only essential cookies needed to run the site and keep you signed in (staff). We do not use non-essential tracking cookies.",
      ]],
      ["6. Contact", [
        "For any privacy request, email reservations@lumiere-dining.com.",
      ]],
    ],
  },
  refunds: {
    label: "Legal",
    title: "Refund & Cancellation Policy",
    updated: "20 July 2026",
    body: [
      ["1. Reservation deposits", [
        "A refundable deposit may be required to secure a table. It is credited against your final bill when you dine with us.",
      ]],
      ["2. Cancellations", [
        "Cancel at least 4 hours before your reservation time for a full deposit refund. Cancellations within 4 hours may not be refundable.",
      ]],
      ["3. No-shows & late arrival", [
        "We hold your table for 15 minutes past the reservation time. If you do not arrive within this grace period, the reservation may be released and the deposit forfeited, as set out in our Terms.",
      ]],
      ["4. Food orders", [
        "As dishes are prepared fresh to order, orders cannot be cancelled once preparation has begun. If an item is unavailable or an error occurs, we will not charge for it or will refund it.",
      ]],
      ["5. Refund method & timing", [
        "Approved refunds are returned to the original payment method. Processing typically takes 5–7 business days depending on your bank or provider.",
      ]],
      ["6. Contact", [
        "For any refund request, email reservations@lumiere-dining.com with your receipt code.",
      ]],
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = DOCS[slug];
  if (!doc) notFound();

  return (
    <>
      <PageHero label={doc.label} title={doc.title} sub={`Last updated: ${doc.updated}`} />
      <section className="py-16 bg-cream">
        <div className="mx-auto max-w-3xl px-5 space-y-8">
          {doc.body.map(([heading, paras]) => (
            <div key={heading}>
              <h2 className="font-serif text-xl text-ink mb-2">{heading}</h2>
              {paras.map((p, i) => (
                <p key={i} className="text-neutral-600 text-sm leading-relaxed mb-2">{p}</p>
              ))}
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
