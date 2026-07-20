import Stripe from "stripe";

// Server-only. Reads the secret key from env; falls back to a harmless
// placeholder so the app still builds before keys are added (actions guard on it).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_placeholder");

export const stripeConfigured = () => !!process.env.STRIPE_SECRET_KEY;
