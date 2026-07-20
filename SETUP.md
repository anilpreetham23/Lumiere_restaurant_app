# Lumiere - International Fine Dining

Production Next.js 16 (App Router) + Supabase + Tailwind v4 + Framer Motion.

## What is built
- Multi-page site with real URLs: `/`, `/menu`, `/about`, `/reservations`, `/order`, `/blog`, `/contact`
- Animations: preloader, scroll-progress bar, scroll-reveal sections, animated menu filtering, cart drawer
- Cart + online ordering (localStorage cart, checkout writes an order to the DB)
- Backend via Supabase (Postgres + Auth + Row Level Security):
  - Reservations
  - Contact messages
  - Newsletter subscribers
  - Orders
- Admin console at `/admin` (email/password login) to view everything and change reservation/order status

## 1. Create a Supabase project
1. Go to https://supabase.com -> New project (free tier is fine).
2. Open **SQL Editor** -> New query -> paste the contents of `supabase/schema.sql` -> Run.
3. **Authentication -> Users -> Add user**: create your staff login (email + password). That account signs in at `/admin`.

## 2. Add your keys
Copy `.env.local.example` to `.env.local` and fill in (Project Settings -> API):
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...        # optional
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## 3. Run
```
npm install
npm run dev      # http://localhost:3000
npm run build && npm start   # production
```

## Deploy (recommended: Vercel)
1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add the same env vars in Vercel -> Settings -> Environment Variables.
4. Deploy. Set `NEXT_PUBLIC_SITE_URL` to your live domain.

## Menu content
Edit `src/data/menu.ts` - one array of dishes drives the home page, menu page and cart.

## Payments (not enabled)
Checkout stores the order and confirms by staff. Card payments (Stripe **test mode**) can be
added later - live payment credentials are intentionally left for you to switch on.

## Notes
- The `middleware.ts` deprecation warning is cosmetic (Next 16 renamed it to `proxy`); it works as-is.
- RLS lets anyone submit forms/orders but only your logged-in staff account can read them.
