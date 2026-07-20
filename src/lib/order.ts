// Shared types + helpers for the QR table-ordering flow.
// All customer writes go through the SECURITY DEFINER rpcs (price-safe).

export type MenuItem = {
  id: string;
  title: string;
  cuisine: string;
  price: number;
  image: string;
  short: string;
  description: string;
  tags: string[];
  badge: string | null;
  rating: number;
  reviews: number;
  prep_minutes: number;
  available: boolean;
  sort: number;
};

export type OrderLine = {
  menu_item_id: string;
  title: string;
  price: number;
  qty: number;
  notes?: string | null;
};

export type SessionOrder = {
  id: string;
  created_at: string;
  session_id: string;
  items: OrderLine[];
  amount: number;
  notes: string | null;
  kind: string;
  status: "placed" | "accepted" | "preparing" | "ready" | "served";
};

export type DiningSession = {
  id: string;
  created_at: string;
  table_id: string;
  customer_name: string | null;
  phone: string | null;
  guests: number;
  status: "open" | "bill_pending" | "paid" | "closed";
  payment_method: string | null;
  payment_status: "unpaid" | "paid";
  tip: number;
  receipt_code: string | null;
};

export type TableInfo = { id: string; label: string; seats: number; state: string };

export type SessionSnapshot = {
  table: TableInfo;
  session: DiningSession | null;
  orders: SessionOrder[];
  requests?: { id: string; type: string; status: string }[];
} | null;

export const ORDER_STEPS = ["placed", "accepted", "preparing", "ready", "served"] as const;

export const STATUS_LABEL: Record<string, string> = {
  placed: "Order received",
  accepted: "Confirmed by kitchen",
  preparing: "Being prepared",
  ready: "Ready to serve",
  served: "Served",
};

export function sessionTotal(orders: SessionOrder[]): number {
  return orders.reduce((s, o) => s + Number(o.amount), 0);
}
