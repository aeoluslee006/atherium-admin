# ATHERIUM Holdings Admin

Internal admin dashboard for managing Cosmonova and Cosmoenterprise platforms.

## Tech Stack
- React 18 + Vite 5
- Supabase (same project as cosmonova / retail-os)
- Deployed on Vercel → `atherium.cosmonova.io`

## Local Development

```bash
npm install
cp .env.example .env.local   # fill VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY
npm run dev
```

## Supabase Setup

1. Copy `.env.example` → `.env.local` with the cosmonova Supabase URL and anon key.
2. In [Supabase SQL Editor](https://supabase.com/dashboard/project/hgsuzanclpnzlskttkok/sql/new), run:
   `supabase/migrations/20260602120000_atherium_customers.sql`
3. Create an admin user in **Authentication → Users** (email/password) for login.

## Deploy to Vercel

1. Push to GitHub `aeoluslee006/atherium-admin`
2. vercel.com → New Project → import repo (Framework: Vite)
3. Add environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
4. Domain: `atherium.cosmonova.io` → CNAME `cname.vercel-dns.com`

## Project Structure

```
src/
├── App.jsx              # Auth gate + page routing
├── lib/supabase.js      # Supabase client
├── components/
│   ├── Sidebar.jsx
│   └── Topbar.jsx
└── pages/
    ├── Login.jsx        # Email/password auth
    ├── Dashboard.jsx
    ├── Customers.jsx    # atherium_customers table
    └── Reports.jsx
```
